//! Read queries for the external review search index (docs/external-reviews.md).

use serde::Serialize;
use sqlx::{FromRow, PgPool};
use utoipa::ToSchema;

/// Posts returned per listing, newest first.
pub const EXTERNAL_REVIEW_LIMIT: i64 = 100;

/// How a post was matched to a course at import time.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, ToSchema, sqlx::Type)]
#[serde(rename_all = "lowercase")]
#[sqlx(type_name = "text", rename_all = "lowercase")]
pub enum ExternalMatchKind {
    /// Same normalised title, taught by a teacher named in the post.
    Exact,
    /// Same normalised title, the only course at the school with it; the post names no teacher.
    Title,
    /// One title contains the other, taught by a teacher named in the post.
    Contains,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ExternalReviewMatch {
    pub school: String,
    pub course_code: String,
    /// Catalog spelling of the matched teacher, if any.
    pub instructor: Option<String>,
    pub kind: ExternalMatchKind,
}

/// One indexed post. Only search-result fields are stored; open `url` for the full text.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ExternalReview {
    /// Source id, e.g. `ptt`.
    pub source: String,
    /// Human source name, e.g. `PTT 批踢踢`.
    pub source_label: String,
    /// Board or forum name, e.g. `NTUcourse`.
    pub board: String,
    pub url: String,
    pub title: String,
    pub author: Option<String>,
    pub posted_at: Option<String>,
    /// PTT 推文 score: pushes minus boos.
    pub push_score: Option<i32>,
    /// At most 120 characters from the start of the post.
    pub excerpt: Option<String>,
    /// Title tag such as 評價 or 心得.
    pub tag: Option<String>,
    /// Term named in the title, `YYY-N`.
    pub term: Option<String>,
    pub course_title: Option<String>,
    pub teachers: Vec<String>,
    /// The catalog course this post was matched to; `null` when unmatched.
    #[serde(rename = "match")]
    pub matched: Option<ExternalReviewMatch>,
    pub is_demo: bool,
}

#[derive(FromRow)]
struct Row {
    source: String,
    board: String,
    url: String,
    title: String,
    author: Option<String>,
    posted_at: Option<String>,
    push_score: Option<i32>,
    excerpt: Option<String>,
    tag: Option<String>,
    term: Option<String>,
    course_title: Option<String>,
    teachers: Vec<String>,
    school: Option<String>,
    course_code: Option<String>,
    instructor: Option<String>,
    match_kind: Option<ExternalMatchKind>,
    is_demo: bool,
}

/// Human name of a source id.
pub fn source_label(source: &str) -> &'static str {
    match source {
        "ptt" => "PTT 批踢踢",
        _ => "其他網站",
    }
}

impl From<Row> for ExternalReview {
    fn from(row: Row) -> Self {
        let matched = match (row.school, row.course_code, row.match_kind) {
            (Some(school), Some(course_code), Some(kind)) => Some(ExternalReviewMatch {
                school,
                course_code,
                instructor: row.instructor,
                kind,
            }),
            _ => None,
        };
        Self {
            source_label: source_label(&row.source).to_owned(),
            source: row.source,
            board: row.board,
            url: row.url,
            title: row.title,
            author: row.author,
            posted_at: row.posted_at,
            push_score: row.push_score,
            excerpt: row.excerpt,
            tag: row.tag,
            term: row.term,
            course_title: row.course_title,
            teachers: row.teachers,
            matched,
            is_demo: row.is_demo,
        }
    }
}

/// Number of posts from one source.
#[derive(Debug, FromRow, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ExternalSourceCount {
    pub source: String,
    pub source_label: String,
    pub count: i64,
}

const COLUMNS: &str = "source, board, url, title, author, unicourse_iso(posted_at) AS posted_at,
    push_score, excerpt, tag, term, course_title, teachers, school, course_code, instructor,
    match_kind, is_demo";

/// Posts for `(school, course_code)` and per-source totals, newest first.
pub async fn course_external_reviews(
    pool: &PgPool,
    school: &str,
    course_code: &str,
) -> Result<(Vec<ExternalSourceCount>, Vec<ExternalReview>), sqlx::Error> {
    let filter = "school = $1 AND course_code = $2";
    listing(pool, filter, school, course_code).await
}

/// Posts that name `name` as a teacher at `school` (matched or parsed from the title), newest first.
pub async fn instructor_external_reviews(
    pool: &PgPool,
    school: &str,
    name: &str,
) -> Result<(Vec<ExternalSourceCount>, Vec<ExternalReview>), sqlx::Error> {
    let filter = "school = $1 AND (instructor = $2 OR teachers @> ARRAY[$2::text])";
    listing(pool, filter, school, name).await
}

async fn listing(
    pool: &PgPool,
    filter: &str,
    school: &str,
    key: &str,
) -> Result<(Vec<ExternalSourceCount>, Vec<ExternalReview>), sqlx::Error> {
    let counts: Vec<(String, i64)> = sqlx::query_as(&format!(
        "SELECT source, count(*) FROM external_reviews WHERE {filter} GROUP BY source ORDER BY count(*) DESC, source"
    ))
    .bind(school)
    .bind(key)
    .fetch_all(pool)
    .await?;
    let rows: Vec<Row> = sqlx::query_as(&format!(
        "SELECT {COLUMNS} FROM external_reviews WHERE {filter}
         ORDER BY posted_at DESC NULLS LAST, id DESC LIMIT $3"
    ))
    .bind(school)
    .bind(key)
    .bind(EXTERNAL_REVIEW_LIMIT)
    .fetch_all(pool)
    .await?;
    let counts = counts
        .into_iter()
        .map(|(source, count)| ExternalSourceCount {
            source_label: source_label(&source).to_owned(),
            source,
            count,
        })
        .collect();
    Ok((counts, rows.into_iter().map(ExternalReview::from).collect()))
}

/// Title and instructors of the newest offering of a course (active first), for building outbound links.
pub async fn course_identity(
    pool: &PgPool,
    school: &str,
    course_code: &str,
) -> Result<Option<(String, Vec<String>)>, sqlx::Error> {
    sqlx::query_as(
        "SELECT title, instructors FROM offerings WHERE school = $1 AND course_code = $2
         ORDER BY active DESC, term DESC, id DESC LIMIT 1",
    )
    .bind(school)
    .bind(course_code)
    .fetch_optional(pool)
    .await
}
