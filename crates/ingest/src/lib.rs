//! Validate and import course snapshots (docs/snapshot-format.md, v2; v1 files stay valid).
//!
//! The accepted shape mirrors the Zod schema in `crawlers/kit/src/schema.ts`. Unlike Zod, which
//! trims strings while parsing, this side rejects untrimmed strings: crawlers always write the
//! parsed (already trimmed) value.
//!
//! [`parse_snapshot`] is the only way to obtain a [`ValidSnapshot`], so [`import`] never sees
//! unvalidated input.

use std::collections::HashSet;

use anyhow::{Context, Result, bail, ensure};
use serde::{Deserialize, Deserializer};
use sqlx::{PgPool, types::Json};
use unicourse_catalog::{Extra, ExtraValue, Meeting, Requirement, SCHOOL_SLUGS};
use url::Url;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Snapshot {
    school: String,
    school_name: String,
    #[serde(default, deserialize_with = "present")]
    school_name_en: Option<String>,
    term: String,
    is_demo: bool,
    #[serde(default, deserialize_with = "present")]
    source: Option<Source>,
    offerings: Vec<Offering>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Source {
    name: String,
    url: String,
    fetched_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Offering {
    source_id: String,
    course_code: String,
    #[serde(default, deserialize_with = "present")]
    class_code: Option<String>,
    title: String,
    #[serde(default, deserialize_with = "present")]
    title_en: Option<String>,
    instructors: Vec<String>,
    #[serde(default, deserialize_with = "present")]
    department: Option<String>,
    #[serde(default, deserialize_with = "present")]
    department_code: Option<String>,
    #[serde(default, deserialize_with = "present")]
    credits: Option<f64>,
    #[serde(default, deserialize_with = "present")]
    requirement: Option<Requirement>,
    #[serde(default, deserialize_with = "present")]
    requirement_text: Option<String>,
    #[serde(default, deserialize_with = "present")]
    schedule: Option<Vec<Meeting>>,
    #[serde(default, deserialize_with = "present")]
    schedule_text: Option<String>,
    #[serde(default, deserialize_with = "present")]
    capacity: Option<i32>,
    #[serde(default, deserialize_with = "present")]
    enrolled: Option<i32>,
    #[serde(default, deserialize_with = "present")]
    language: Option<String>,
    #[serde(default, deserialize_with = "present")]
    campus: Option<String>,
    #[serde(default, deserialize_with = "present")]
    grade: Option<String>,
    #[serde(default, deserialize_with = "present")]
    description: Option<String>,
    #[serde(default, deserialize_with = "present")]
    syllabus_url: Option<String>,
    source_url: String,
    #[serde(default, deserialize_with = "present")]
    notes: Option<String>,
    #[serde(default, deserialize_with = "present")]
    extra: Option<Extra>,
}

/// Optional fields may be omitted but not `null`, matching Zod's `.optional()`.
fn present<'de, D: Deserializer<'de>, T: Deserialize<'de>>(
    input: D,
) -> Result<Option<T>, D::Error> {
    T::deserialize(input).map(Some)
}

/// Trimmed, non-empty and free of NUL (PostgreSQL text cannot store it).
fn is_text(value: &str) -> bool {
    !value.is_empty() && value == value.trim() && !value.contains('\0')
}

fn ensure_text(value: &str, field: &str) -> Result<()> {
    ensure!(
        is_text(value),
        "{field} must be trimmed, non-empty and free of NUL"
    );
    Ok(())
}

fn ensure_optional_text(value: Option<&String>, field: &str) -> Result<()> {
    value.map_or(Ok(()), |value| ensure_text(value, field))
}

/// Absolute `http(s)://` URL with a host and without credentials. The raw prefix is checked because
/// the URL parser also accepts `https:example.edu`, which a browser would treat as a relative link.
fn ensure_http_url(value: &str, field: &str) -> Result<()> {
    ensure_text(value, field)?;
    let prefix = |scheme: &str| {
        value
            .get(..scheme.len())
            .is_some_and(|start| start.eq_ignore_ascii_case(scheme))
    };
    ensure!(
        prefix("http://") || prefix("https://"),
        "{field} must start with http:// or https://"
    );
    let url = Url::parse(value).with_context(|| format!("invalid {field}"))?;
    ensure!(
        matches!(url.scheme(), "https" | "http")
            && url.host().is_some()
            && url.username().is_empty()
            && url.password().is_none(),
        "{field} must be HTTP(S) without credentials"
    );
    Ok(())
}

/// `YYYY-MM-DDTHH:MM:SS[.fraction]Z` with 1-9 fraction digits and a real calendar date and time
/// (no month 13, Feb 30, 24:00:00 or leap second), the same check as `utcInstant` in the Zod schema.
fn is_utc_timestamp(value: &str) -> bool {
    let bytes = value.as_bytes();
    let number = |range: std::ops::Range<usize>| {
        bytes
            .get(range)
            .filter(|part| part.iter().all(u8::is_ascii_digit))
            .map(|part| {
                part.iter()
                    .fold(0u32, |total, digit| total * 10 + u32::from(digit - b'0'))
            })
    };
    let separators = [(4, b'-'), (7, b'-'), (10, b'T'), (13, b':'), (16, b':')];
    if !separators
        .iter()
        .all(|&(index, separator)| bytes.get(index) == Some(&separator))
    {
        return false;
    }
    let fraction_ok = match bytes.get(19..) {
        Some([b'Z']) => true,
        Some([b'.', fraction @ .., b'Z']) => {
            (1..=9).contains(&fraction.len()) && fraction.iter().all(u8::is_ascii_digit)
        }
        _ => false,
    };
    let (Some(year), Some(month), Some(day), Some(hour), Some(minute), Some(second)) = (
        number(0..4),
        number(5..7),
        number(8..10),
        number(11..13),
        number(14..16),
        number(17..19),
    ) else {
        return false;
    };
    let leap = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
    let days_in_month = match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if leap => 29,
        2 => 28,
        _ => return false,
    };
    fraction_ok && (1..=days_in_month).contains(&day) && hour < 24 && minute < 60 && second < 60
}

fn validate_offering(offering: &Offering) -> Result<()> {
    ensure_text(&offering.source_id, "sourceId")?;
    ensure_text(&offering.course_code, "courseCode")?;
    ensure_text(&offering.title, "title")?;
    ensure!(
        offering.instructors.iter().all(|name| is_text(name)),
        "instructors must be trimmed, non-empty and free of NUL"
    );
    for (value, field) in [
        (&offering.class_code, "classCode"),
        (&offering.title_en, "titleEn"),
        (&offering.department, "department"),
        (&offering.department_code, "departmentCode"),
        (&offering.requirement_text, "requirementText"),
        (&offering.schedule_text, "scheduleText"),
        (&offering.language, "language"),
        (&offering.campus, "campus"),
        (&offering.grade, "grade"),
        (&offering.description, "description"),
        (&offering.notes, "notes"),
    ] {
        ensure_optional_text(value.as_ref(), field)?;
    }
    if let Some(credits) = offering.credits {
        // numeric(5,2): at most two decimals, below 1000. Same test as the Zod refinement (with a
        // tolerance for binary floats such as 2.2), so 2.345 is rejected instead of rounded.
        let cents = credits * 100.0;
        ensure!(
            (0.0..=999.99).contains(&credits) && (cents - cents.round()).abs() < 1e-6,
            "credits must be between 0 and 999.99 with at most two decimals"
        );
    }
    // `capacity` and `enrolled` deserialize as i32, so they already fit the integer columns.
    if let Some(capacity) = offering.capacity {
        ensure!(capacity >= 0, "capacity must not be negative");
    }
    if let Some(enrolled) = offering.enrolled {
        ensure!(enrolled >= 0, "enrolled must not be negative");
    }
    for meeting in offering.schedule.iter().flatten() {
        ensure!(
            (1..=7).contains(&meeting.day),
            "schedule day must be 1 (Mon) to 7 (Sun)"
        );
        ensure!(
            !meeting.periods.is_empty() && meeting.periods.iter().all(|period| is_text(period)),
            "schedule periods must be a non-empty list of trimmed labels without NUL"
        );
        ensure_optional_text(meeting.location.as_ref(), "schedule location")?;
    }
    for (key, value) in offering.extra.iter().flatten() {
        ensure!(
            !key.is_empty() && key != "__proto__" && !key.contains('\0'),
            "invalid extra key {key:?}"
        );
        if let ExtraValue::Text(text) = value {
            ensure_text(text, "extra value")?;
        }
    }
    if let Some(syllabus) = &offering.syllabus_url {
        ensure_http_url(syllabus, "syllabusUrl")?;
    }
    ensure_http_url(&offering.source_url, "sourceUrl")
}

/// A snapshot that passed every check in [`parse_snapshot`].
pub struct ValidSnapshot(Snapshot);

pub fn parse_snapshot(bytes: &[u8]) -> Result<ValidSnapshot> {
    let snapshot: Snapshot = serde_json::from_slice(bytes)?;
    ensure!(
        SCHOOL_SLUGS.contains(&snapshot.school.as_str()),
        "unknown school slug {:?} (see crawlers/kit/src/schools.ts)",
        snapshot.school
    );
    ensure_text(&snapshot.school_name, "schoolName")?;
    ensure_optional_text(snapshot.school_name_en.as_ref(), "schoolNameEn")?;
    ensure!(
        snapshot.term.split_once('-').is_some_and(|(year, term)| {
            year.len() == 3
                && year.bytes().all(|byte| byte.is_ascii_digit())
                && matches!(term, "1" | "2" | "3")
        }),
        "expected term in YYY-N format"
    );
    if let Some(source) = &snapshot.source {
        ensure_text(&source.name, "source name")?;
        ensure_http_url(&source.url, "source url")?;
        ensure!(
            is_utc_timestamp(&source.fetched_at),
            "source fetchedAt must be an ISO-8601 UTC timestamp"
        );
    }
    ensure!(
        !snapshot.offerings.is_empty(),
        "refusing to import an empty snapshot"
    );

    let mut source_ids = HashSet::new();
    for offering in &snapshot.offerings {
        if let Err(error) = validate_offering(offering) {
            bail!("offering {:?}: {error:#}", offering.source_id);
        }
        ensure!(
            source_ids.insert(&offering.source_id),
            "duplicate source ID: {}",
            offering.source_id
        );
    }
    Ok(ValidSnapshot(snapshot))
}

/// Import one validated snapshot in a single transaction, then refresh the course ranking.
pub async fn import(pool: &PgPool, snapshot: &ValidSnapshot) -> Result<usize> {
    let ValidSnapshot(snapshot) = snapshot;
    let source = snapshot.source.as_ref();
    let mut transaction = pool.begin().await?;
    // Demo snapshots may create a school row but never rename an existing one.
    sqlx::query(
        "INSERT INTO schools (slug, name, name_en) VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name,
             name_en = COALESCE(EXCLUDED.name_en, schools.name_en)
         WHERE NOT $4",
    )
    .bind(&snapshot.school)
    .bind(&snapshot.school_name)
    .bind(&snapshot.school_name_en)
    .bind(snapshot.is_demo)
    .execute(&mut *transaction)
    .await?;

    // Refuse to go back in time when both crawls carry a fetch time; the row lock keeps this
    // check and the upsert below consistent with concurrent imports.
    let older: Option<bool> = sqlx::query_scalar(
        "SELECT fetched_at > $3::timestamptz FROM course_snapshots
         WHERE school = $1 AND term = $2 FOR UPDATE",
    )
    .bind(&snapshot.school)
    .bind(&snapshot.term)
    .bind(source.map(|source| &source.fetched_at))
    .fetch_optional(&mut *transaction)
    .await?
    .flatten();
    ensure!(
        older != Some(true),
        "snapshot fetchedAt {} is older than the imported {} {} snapshot",
        source.map_or("", |source| source.fetched_at.as_str()),
        snapshot.school,
        snapshot.term
    );

    let accepted = sqlx::query(
        "INSERT INTO course_snapshots (school, term, is_demo, source_name, source_url, fetched_at)
         VALUES ($1, $2, $3, $4, $5, $6::timestamptz)
         ON CONFLICT (school, term) DO UPDATE SET imported_at = now(), is_demo = EXCLUDED.is_demo,
             source_name = EXCLUDED.source_name, source_url = EXCLUDED.source_url,
             fetched_at = EXCLUDED.fetched_at
         WHERE NOT EXCLUDED.is_demo OR course_snapshots.is_demo",
    )
    .bind(&snapshot.school)
    .bind(&snapshot.term)
    .bind(snapshot.is_demo)
    .bind(source.map(|source| &source.name))
    .bind(source.map(|source| &source.url))
    .bind(source.map(|source| &source.fetched_at))
    .execute(&mut *transaction)
    .await?;
    ensure!(
        accepted.rows_affected() == 1,
        "demo snapshots cannot replace live data"
    );

    sqlx::query("UPDATE offerings SET active = false WHERE school = $1 AND term = $2 AND active")
        .bind(&snapshot.school)
        .bind(&snapshot.term)
        .execute(&mut *transaction)
        .await?;

    for offering in &snapshot.offerings {
        sqlx::query("INSERT INTO courses (school, code) VALUES ($1, $2) ON CONFLICT DO NOTHING")
            .bind(&snapshot.school)
            .bind(&offering.course_code)
            .execute(&mut *transaction)
            .await?;
        sqlx::query(
            "INSERT INTO offerings (school, term, source_id, course_code, class_code, title, title_en,
                 instructors, department, department_code, credits, requirement, requirement_text,
                 schedule, schedule_text, capacity, enrolled, language, campus, grade, description,
                 syllabus_url, source_url, notes, extra)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::float8::numeric, $12, $13, $14,
                 $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
             ON CONFLICT (school, term, source_id) DO UPDATE SET
                 course_code = EXCLUDED.course_code, class_code = EXCLUDED.class_code,
                 title = EXCLUDED.title, title_en = EXCLUDED.title_en,
                 instructors = EXCLUDED.instructors, department = EXCLUDED.department,
                 department_code = EXCLUDED.department_code, credits = EXCLUDED.credits,
                 requirement = EXCLUDED.requirement, requirement_text = EXCLUDED.requirement_text,
                 schedule = EXCLUDED.schedule, schedule_text = EXCLUDED.schedule_text,
                 capacity = EXCLUDED.capacity, enrolled = EXCLUDED.enrolled,
                 language = EXCLUDED.language,
                 campus = EXCLUDED.campus, grade = EXCLUDED.grade,
                 description = EXCLUDED.description, syllabus_url = EXCLUDED.syllabus_url,
                 source_url = EXCLUDED.source_url, notes = EXCLUDED.notes, extra = EXCLUDED.extra,
                 active = true",
        )
        .bind(&snapshot.school)
        .bind(&snapshot.term)
        .bind(&offering.source_id)
        .bind(&offering.course_code)
        .bind(&offering.class_code)
        .bind(&offering.title)
        .bind(&offering.title_en)
        .bind(&offering.instructors)
        .bind(&offering.department)
        .bind(&offering.department_code)
        .bind(offering.credits)
        .bind(offering.requirement.map(Requirement::as_str))
        .bind(&offering.requirement_text)
        .bind(offering.schedule.as_ref().map(Json))
        .bind(&offering.schedule_text)
        .bind(offering.capacity)
        .bind(offering.enrolled)
        .bind(&offering.language)
        .bind(&offering.campus)
        .bind(&offering.grade)
        .bind(&offering.description)
        .bind(&offering.syllabus_url)
        .bind(&offering.source_url)
        .bind(&offering.notes)
        .bind(offering.extra.as_ref().map(Json))
        .execute(&mut *transaction)
        .await?;
    }

    transaction.commit().await?;
    // The ranking aggregates every term, so it is rebuilt after each committed import. A failure
    // here leaves the import in place; the next successful import refreshes the view again.
    unicourse_catalog::refresh_rankings(pool)
        .await
        .context("snapshot imported, but refreshing course_rankings failed")?;
    Ok(snapshot.offerings.len())
}
