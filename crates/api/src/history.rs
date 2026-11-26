use axum::{
    Json,
    extract::{Path, State, rejection::PathRejection},
    http::StatusCode,
};
use sqlx::PgPool;
use unicourse_catalog::{self as catalog, CourseHistory, TermTrend, TrendScope};

use crate::{ApiError, ErrorBody, database_error, error, path};

#[utoipa::path(get, path = "/api/courses/{school}/{courseCode}", params(
    ("school" = String, Path, description = "School slug"),
    ("courseCode" = String, Path, description = "Cross-term course code (URL-encoded)")
), responses(
    (status = 200, description = "Course history across all terms, including withdrawn offerings", body = CourseHistory),
    (status = 400, body = ErrorBody),
    (status = 404, body = ErrorBody),
    (status = 500, body = ErrorBody)
))]
pub(crate) async fn course_history(
    State(pool): State<PgPool>,
    segments: Result<Path<(String, String)>, PathRejection>,
) -> Result<Json<CourseHistory>, ApiError> {
    let (school, code) = path(segments, "Course not found", |(school, code)| {
        vec![school, code]
    })?;
    catalog::course_history(&pool, &school, &code)
        .await
        .map_err(database_error)?
        .map(Json)
        .ok_or_else(|| error(StatusCode::NOT_FOUND, "Course not found"))
}

#[utoipa::path(get, path = "/api/schools/{school}/trends", params(
    ("school" = String, Path, description = "School slug")
), responses(
    (status = 200, description = "Per-term active catalog totals, newest first", body = [TermTrend]),
    (status = 400, body = ErrorBody),
    (status = 404, body = ErrorBody),
    (status = 500, body = ErrorBody)
))]
pub(crate) async fn school_trends(
    State(pool): State<PgPool>,
    slug: Result<Path<String>, PathRejection>,
) -> Result<Json<Vec<TermTrend>>, ApiError> {
    let school = path(slug, "School not found", |school| vec![school])?;
    trend_response(&pool, &school, TrendScope::School, "School not found").await
}

#[utoipa::path(get, path = "/api/schools/{school}/departments/{department}/trends", params(
    ("school" = String, Path, description = "School slug"),
    ("department" = String, Path, description = "Published offering unit name (URL-encoded)")
), responses(
    (status = 200, description = "Per-term active catalog totals, newest first", body = [TermTrend]),
    (status = 400, body = ErrorBody),
    (status = 404, body = ErrorBody),
    (status = 500, body = ErrorBody)
))]
pub(crate) async fn department_trends(
    State(pool): State<PgPool>,
    segments: Result<Path<(String, String)>, PathRejection>,
) -> Result<Json<Vec<TermTrend>>, ApiError> {
    let (school, department) = path(segments, "Department not found", |(school, department)| {
        vec![school, department]
    })?;
    trend_response(
        &pool,
        &school,
        TrendScope::Department(&department),
        "Department not found",
    )
    .await
}

#[utoipa::path(get, path = "/api/instructors/{school}/{name}/trends", params(
    ("school" = String, Path, description = "School slug"),
    ("name" = String, Path, description = "Exact instructor name (URL-encoded)")
), responses(
    (status = 200, description = "Per-term active catalog totals, newest first", body = [TermTrend]),
    (status = 400, body = ErrorBody),
    (status = 404, body = ErrorBody),
    (status = 500, body = ErrorBody)
))]
pub(crate) async fn instructor_trends(
    State(pool): State<PgPool>,
    segments: Result<Path<(String, String)>, PathRejection>,
) -> Result<Json<Vec<TermTrend>>, ApiError> {
    let (school, name) = path(segments, "Instructor not found", |(school, name)| {
        vec![school, name]
    })?;
    trend_response(
        &pool,
        &school,
        TrendScope::Instructor(&name),
        "Instructor not found",
    )
    .await
}

async fn trend_response(
    pool: &PgPool,
    school: &str,
    scope: TrendScope<'_>,
    not_found: &'static str,
) -> Result<Json<Vec<TermTrend>>, ApiError> {
    catalog::trends(pool, school, scope)
        .await
        .map_err(database_error)?
        .map(Json)
        .ok_or_else(|| error(StatusCode::NOT_FOUND, not_found))
}
