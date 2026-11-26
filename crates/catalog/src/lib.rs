use std::collections::BTreeMap;

use serde::{Deserialize, Deserializer, Serialize};
use sqlx::{FromRow, PgPool};
use utoipa::ToSchema;

mod browse;

pub use browse::*;

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
}

/// Optional exact-match filters for [`search`]; `None` means "any".
#[derive(Clone, Copy, Debug, Default)]
pub struct Filters<'a> {
    pub school: Option<&'a str>,
    pub term: Option<&'a str>,
    pub department: Option<&'a str>,
}

pub(crate) const OFFERINGS: &str = "SELECT offering.id::text AS id, offering.school,
    school.name AS school_name, offering.term, offering.course_code, offering.class_code,
    offering.source_id, offering.title, offering.title_en, offering.instructors,
    offering.department, offering.department_code, offering.credits::float8 AS credits,
    offering.requirement, offering.requirement_text, offering.schedule, offering.schedule_text,
    offering.capacity, offering.enrolled, offering.language, offering.campus, offering.grade, offering.description,
    offering.syllabus_url, offering.source_url, offering.notes, offering.extra,
    to_char(snapshot.imported_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') AS imported_at,
    snapshot.is_demo
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
    // Each LIKE branch is backed by a trigram index (see the v2 migration).
    let statement = format!(
        "{OFFERINGS}
        WHERE offering.active AND ($2::text IS NULL OR offering.school = $2)
            AND ($3::text IS NULL OR offering.term = $3)
            AND ($4::text IS NULL OR offering.department = $4)
            AND (lower(offering.title) LIKE '%' || lower($5) || '%'
                OR lower(offering.title_en) LIKE '%' || lower($5) || '%'
                OR lower(offering.department) LIKE '%' || lower($5) || '%'
                OR lower(offering.course_code) LIKE lower($5) || '%'
                OR unicourse_instructor_text(offering.instructors) LIKE '%' || lower($5) || '%')
        ORDER BY (lower(offering.course_code) = lower($1)) DESC,
            (offering.title = $1) DESC, offering.term DESC, offering.school,
            offering.title, offering.id
        LIMIT 50"
    );
    sqlx::query_as(&statement)
        .bind(query)
        .bind(filters.school)
        .bind(filters.term)
        .bind(filters.department)
        .bind(like_literal(query))
        .fetch_all(pool)
        .await
}

pub async fn offering(pool: &PgPool, id: i64) -> Result<Option<Offering>, sqlx::Error> {
    let statement = format!("{OFFERINGS} WHERE offering.id = $1 AND offering.active");
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
