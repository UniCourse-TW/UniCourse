use std::collections::BTreeMap;

use serde::{Deserialize, Deserializer, Serialize};
use sqlx::{FromRow, PgConnection, PgPool};
use utoipa::ToSchema;

mod browse;
mod history;
mod institutions;

pub use browse::*;
pub use history::*;
pub use institutions::*;

/// School slugs accepted in snapshots. Keep in sync with `crawlers/kit/src/schools.ts`.
pub const SCHOOL_SLUGS: [&str; 12] = [
    "ntu", "ntnu", "nycu", "nthu", "ncku", "nccu", "nchu", "ccu", "ncu", "fcu", "tnua", "ntua",
];

pub static MIGRATOR: sqlx::migrate::Migrator = sqlx::migrate!("./migrations");

#[derive(FromRow, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct School {
    pub slug: String,
    pub name: String,
    pub name_en: Option<String>,
}

/// Coarse 必選修 category; the school's own wording is kept in `requirementText`.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize, Serialize, ToSchema, sqlx::Type)]
#[serde(rename_all = "lowercase")]
#[sqlx(type_name = "text", rename_all = "lowercase")]
pub enum Requirement {
    Required,
    Elective,
    General,
    Other,
}

impl Requirement {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Required => "required",
            Self::Elective => "elective",
            Self::General => "general",
            Self::Other => "other",
        }
    }
}

/// One weekly meeting: `day` 1 (Mon) to 7 (Sun) and the school's own period labels in order.
#[derive(Clone, Debug, PartialEq, Deserialize, Serialize, ToSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Meeting {
    #[schema(minimum = 1, maximum = 7)]
    pub day: u8,
    pub periods: Vec<String>,
    #[serde(
        default,
        deserialize_with = "present",
        skip_serializing_if = "Option::is_none"
    )]
    pub location: Option<String>,
}

/// Optional fields may be omitted but not `null`, matching Zod's `.optional()`.
fn present<'de, D: Deserializer<'de>, T: Deserialize<'de>>(
    input: D,
) -> Result<Option<T>, D::Error> {
    T::deserialize(input).map(Some)
}

/// A school-specific scalar kept under its original field name.
#[derive(Clone, Debug, PartialEq, Deserialize, Serialize, ToSchema)]
#[serde(untagged)]
pub enum ExtraValue {
    Null,
    Bool(bool),
    #[schema(value_type = f64)]
    Number(serde_json::Number),
    Text(String),
}

pub type Extra = BTreeMap<String, ExtraValue>;

#[derive(Debug, FromRow, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Offering {
    pub id: String,
    pub school: String,
    pub school_name: String,
    pub term: String,
    pub course_code: String,
    pub class_code: Option<String>,
    pub source_id: String,
    pub title: String,
    pub title_en: Option<String>,
    pub instructors: Vec<String>,
    pub department: Option<String>,
    pub department_code: Option<String>,
    pub credits: Option<f64>,
    pub requirement: Option<Requirement>,
    pub requirement_text: Option<String>,
    #[sqlx(json(nullable))]
    pub schedule: Option<Vec<Meeting>>,
    pub schedule_text: Option<String>,
    pub capacity: Option<i32>,
    /// Students enrolled when the snapshot was crawled, if the school publishes it.
    pub enrolled: Option<i32>,
    pub language: Option<String>,
    pub campus: Option<String>,
    pub grade: Option<String>,
    pub description: Option<String>,
    pub syllabus_url: Option<String>,
    pub source_url: String,
    pub notes: Option<String>,
    #[sqlx(json(nullable))]
    #[schema(value_type = Option<HashMap<String, ExtraValue>>)]
    pub extra: Option<Extra>,
    pub imported_at: String,
    pub is_demo: bool,
    pub active: bool,
}

/// Optional exact-match filters for [`search`]; `None` means "any".
#[derive(Clone, Copy, Debug, Default)]
pub struct Filters<'a> {
    pub school: Option<&'a str>,
    pub term: Option<&'a str>,
    pub department: Option<&'a str>,
}

#[derive(Clone, Copy, Debug, Default, Deserialize, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum SearchSort {
    #[default]
    Relevance,
    Enrolled,
    Title,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct SearchPage {
    pub total: i64,
    pub offset: i64,
    pub courses: Vec<Offering>,
}

pub(crate) const OFFERINGS: &str = "SELECT offering.id::text AS id, offering.school,
    school.name AS school_name, offering.term, offering.course_code, offering.class_code,
    offering.source_id, offering.title, offering.title_en, offering.instructors,
    offering.department, offering.department_code, offering.credits::float8 AS credits,
    offering.requirement, offering.requirement_text, offering.schedule, offering.schedule_text,
    offering.capacity, offering.enrolled, offering.language, offering.campus, offering.grade, offering.description,
    offering.syllabus_url, offering.source_url, offering.notes, offering.extra,
    to_char(snapshot.imported_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') AS imported_at,
    snapshot.is_demo, offering.active
    FROM offerings AS offering
    JOIN schools AS school ON school.slug = offering.school
    JOIN course_snapshots AS snapshot ON (snapshot.school, snapshot.term) = (offering.school, offering.term)";

pub async fn schools(pool: &PgPool) -> Result<Vec<School>, sqlx::Error> {
    sqlx::query_as("SELECT slug, name, name_en FROM schools ORDER BY name, slug")
        .fetch_all(pool)
        .await
}

/// Imported terms, newest first (`YYY-N` sorts correctly as text).
pub async fn terms(pool: &PgPool) -> Result<Vec<String>, sqlx::Error> {
    sqlx::query_scalar("SELECT DISTINCT term FROM course_snapshots ORDER BY term DESC")
        .fetch_all(pool)
        .await
}

/// Offering units with at least one active offering at `school`, sorted by name.
pub async fn departments(pool: &PgPool, school: &str) -> Result<Vec<String>, sqlx::Error> {
    sqlx::query_scalar(
        "SELECT DISTINCT department FROM offerings
         WHERE school = $1 AND active AND department IS NOT NULL ORDER BY department",
    )
    .bind(school)
    .fetch_all(pool)
    .await
}

/// Escape LIKE metacharacters so user input is always matched literally.
pub fn like_literal(query: &str) -> String {
    let mut escaped = String::with_capacity(query.len());
    for character in query.chars() {
        if matches!(character, '\\' | '%' | '_') {
            escaped.push('\\');
        }
        escaped.push(character);
    }
    escaped
}

/// Up to 50 active offerings whose title, English title, department or instructor contains
/// `query`, or whose course code starts with it. Exact code and exact title matches come first.
pub async fn search(
    pool: &PgPool,
    query: &str,
    filters: &Filters<'_>,
) -> Result<Vec<Offering>, sqlx::Error> {
    let mut connection = pool.acquire().await?;
    search_rows(&mut connection, query, filters, SearchSort::Relevance, 0).await
}

const SEARCH_WHERE: &str = "WHERE offering.active AND ($1::text IS NULL OR offering.school = $1)
    AND ($2::text IS NULL OR offering.term = $2)
    AND ($3::text IS NULL OR offering.department = $3)
    AND (lower(offering.title) LIKE '%' || lower($4) || '%'
        OR lower(offering.title_en) LIKE '%' || lower($4) || '%'
        OR lower(offering.department) LIKE '%' || lower($4) || '%'
        OR lower(offering.course_code) LIKE lower($4) || '%'
        OR unicourse_instructor_text(offering.instructors) LIKE '%' || lower($4) || '%')";

async fn search_rows(
    connection: &mut PgConnection,
    query: &str,
    filters: &Filters<'_>,
    sort: SearchSort,
    offset: i64,
) -> Result<Vec<Offering>, sqlx::Error> {
    let sort_prefix = match sort {
        SearchSort::Relevance => "",
        SearchSort::Enrolled => "offering.enrolled DESC NULLS LAST,",
        SearchSort::Title => "offering.title,",
    };
    let statement = format!(
        "{OFFERINGS} {SEARCH_WHERE}
         ORDER BY {sort_prefix} (lower(offering.course_code) = lower($5)) DESC,
             (offering.title = $5) DESC, offering.term DESC, offering.school,
             offering.title, offering.id
         LIMIT 50 OFFSET $6"
    );
    sqlx::query_as(&statement)
        .bind(filters.school)
        .bind(filters.term)
        .bind(filters.department)
        .bind(like_literal(query))
        .bind(query)
        .bind(offset)
        .fetch_all(connection)
        .await
}

/// Search matches and their total from the same database snapshot, even if the page is empty.
pub async fn search_page(
    pool: &PgPool,
    query: &str,
    filters: &Filters<'_>,
    sort: SearchSort,
    offset: i64,
) -> Result<SearchPage, sqlx::Error> {
    let mut transaction = pool
        .begin_with("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY")
        .await?;
    let total: i64 = sqlx::query_scalar(&format!(
        "SELECT count(*) FROM offerings AS offering {SEARCH_WHERE}"
    ))
    .bind(filters.school)
    .bind(filters.term)
    .bind(filters.department)
    .bind(like_literal(query))
    .fetch_one(&mut *transaction)
    .await?;
    let courses = if offset < total {
        search_rows(&mut transaction, query, filters, sort, offset).await?
    } else {
        Vec::new()
    };
    transaction.commit().await?;
    Ok(SearchPage {
        total,
        offset,
        courses,
    })
}

pub async fn offering(pool: &PgPool, id: i64) -> Result<Option<Offering>, sqlx::Error> {
    let statement = format!("{OFFERINGS} WHERE offering.id = $1");
    sqlx::query_as(&statement)
        .bind(id)
        .fetch_optional(pool)
        .await
}

#[cfg(test)]
mod tests {
    use super::like_literal;

    #[test]
    fn like_metacharacters_are_escaped() {
        assert_eq!(like_literal(r"50%_a\b"), r"50\%\_a\\b");
        assert_eq!(like_literal("資料"), "資料");
    }
}
