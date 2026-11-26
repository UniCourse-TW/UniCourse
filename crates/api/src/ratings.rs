//! Course ratings, keyed by the cross-term course `(school, courseCode)`.

use axum::{
    Json,
    extract::{Path, State, rejection::PathRejection},
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use unicourse_catalog as catalog;
use utoipa::ToSchema;

use crate::{
    ApiError, AppState, Body, ErrorBody, auth::CurrentUser, bad_request, database_error, error,
    path, text,
};

#[derive(FromRow, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Rating {
    username: String,
    display_name: Option<String>,
    /// 1 to 5.
    score: i16,
    review: Option<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RatingStats {
    count: i64,
    /// Mean score; `null` without ratings.
    average: Option<f64>,
    /// Number of ratings with score 1, 2, 3, 4 and 5.
    #[schema(min_items = 5, max_items = 5)]
    histogram: Vec<i64>,
}

#[derive(FromRow, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MyRating {
    score: i16,
    review: Option<String>,
    created_at: String,
    updated_at: String,
}

/// A rating on a user's public profile.
#[derive(FromRow, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub(crate) struct UserRating {
    school: String,
    course_code: String,
    /// Title of the course's newest offering.
    title: Option<String>,
    /// ID of the course's newest offering, if any.
    #[schema(required = true)]
    latest_offering_id: Option<String>,
    score: i16,
    review: Option<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Deserialize, ToSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct RatingInput {
    /// Integer 1 to 5.
    #[schema(minimum = 1, maximum = 5)]
    score: i64,
    /// Up to 2000 characters of plain text; empty or omitted means no review.
    #[serde(default)]
    review: Option<String>,
}

/// The decoded course path, after checking that the course exists.
async fn course(
    pool: &PgPool,
    segments: Result<Path<(String, String)>, PathRejection>,
) -> Result<(String, String), ApiError> {
    let not_found = || error(StatusCode::NOT_FOUND, "Course not found");
    let (school, code) = path(segments, "Course not found", |(school, code)| {
        vec![school.as_str(), code.as_str()]
    })?;
    if !catalog::course_exists(pool, &school, &code)
        .await
        .map_err(database_error)?
    {
        return Err(not_found());
    }
    Ok((school, code))
}

#[utoipa::path(get, operation_id = "listRatings", path = "/api/courses/{school}/{courseCode}/ratings", params(
    ("school" = String, Path, description = "School slug"),
    ("courseCode" = String, Path, description = "Cross-term course code (URL-encoded)")
), responses(
    (status = 200, description = "Up to 100 ratings, most recently updated first", body = [Rating]),
    (status = 404, body = ErrorBody),
    (status = 500, body = ErrorBody)
))]
pub(crate) async fn list(
    State(pool): State<PgPool>,
    segments: Result<Path<(String, String)>, PathRejection>,
) -> Result<Json<Vec<Rating>>, ApiError> {
    let (school, code) = course(&pool, segments).await?;
    sqlx::query_as(
        "SELECT account.username, account.display_name, rating.score, rating.review,
             unicourse_iso_precise(rating.created_at) AS created_at,
             unicourse_iso_precise(rating.updated_at) AS updated_at
         FROM ratings AS rating JOIN users AS account ON account.id = rating.user_id
         WHERE rating.school = $1 AND rating.course_code = $2
         ORDER BY rating.updated_at DESC, rating.user_id
         LIMIT 100",
    )
    .bind(&school)
    .bind(&code)
    .fetch_all(&pool)
    .await
    .map(Json)
    .map_err(database_error)
}

#[utoipa::path(get, operation_id = "ratingStats", path = "/api/courses/{school}/{courseCode}/ratings/stats", params(
    ("school" = String, Path, description = "School slug"),
    ("courseCode" = String, Path, description = "Cross-term course code (URL-encoded)")
), responses(
    (status = 200, description = "Rating count, mean and histogram", body = RatingStats),
    (status = 404, body = ErrorBody),
    (status = 500, body = ErrorBody)
))]
pub(crate) async fn stats(
    State(pool): State<PgPool>,
    segments: Result<Path<(String, String)>, PathRejection>,
) -> Result<Json<RatingStats>, ApiError> {
    let (school, code) = course(&pool, segments).await?;
    let (count, average, histogram): (i64, Option<f64>, Vec<i64>) = sqlx::query_as(
        "SELECT count(*), avg(score)::float8,
             ARRAY[count(*) FILTER (WHERE score = 1), count(*) FILTER (WHERE score = 2),
                 count(*) FILTER (WHERE score = 3), count(*) FILTER (WHERE score = 4),
                 count(*) FILTER (WHERE score = 5)]
         FROM ratings WHERE school = $1 AND course_code = $2",
    )
    .bind(&school)
    .bind(&code)
    .fetch_one(&pool)
    .await
    .map_err(database_error)?;
    Ok(Json(RatingStats {
        count,
        average,
        histogram,
    }))
}

const MY_RATING: &str = "SELECT score, review, unicourse_iso_precise(created_at) AS created_at,
    unicourse_iso_precise(updated_at) AS updated_at FROM ratings";

#[utoipa::path(get, operation_id = "getMyRating", path = "/api/courses/{school}/{courseCode}/ratings/me", params(
    ("school" = String, Path, description = "School slug"),
    ("courseCode" = String, Path, description = "Cross-term course code (URL-encoded)")
), responses(
    (status = 200, description = "The signed-in user's rating, or null if unrated", body = Option<MyRating>),
    (status = 400, body = ErrorBody),
    (status = 401, body = ErrorBody),
    (status = 404, description = "Unknown course", body = ErrorBody),
    (status = 500, body = ErrorBody)
), security(("session" = [])))]
pub(crate) async fn mine(
    State(state): State<AppState>,
    CurrentUser(me): CurrentUser,
    segments: Result<Path<(String, String)>, PathRejection>,
) -> Result<Json<Option<MyRating>>, ApiError> {
    let (school, code) = course(&state.pool, segments).await?;
    sqlx::query_as(&format!(
        "{MY_RATING} WHERE user_id = $1 AND school = $2 AND course_code = $3"
    ))
    .bind(me.id)
    .bind(&school)
    .bind(&code)
    .fetch_optional(&state.pool)
    .await
    .map(Json)
    .map_err(database_error)
}

#[utoipa::path(put, operation_id = "putMyRating", path = "/api/courses/{school}/{courseCode}/ratings/me", params(
    ("school" = String, Path, description = "School slug"),
    ("courseCode" = String, Path, description = "Cross-term course code (URL-encoded)")
), request_body = RatingInput, responses(
    (status = 200, description = "Rating created or replaced", body = MyRating),
    (status = 400, body = ErrorBody),
    (status = 401, body = ErrorBody),
    (status = 404, body = ErrorBody),
    (status = 500, body = ErrorBody)
), security(("session" = [])))]
pub(crate) async fn put_mine(
    State(state): State<AppState>,
    CurrentUser(me): CurrentUser,
    segments: Result<Path<(String, String)>, PathRejection>,
    Body(input): Body<RatingInput>,
) -> Result<Json<MyRating>, ApiError> {
    let score = i16::try_from(input.score)
        .ok()
        .filter(|score| (1..=5).contains(score))
        .ok_or_else(|| bad_request("Score must be an integer from 1 to 5"))?;
    let review = text::optional(input.review.as_deref(), 2000, true)
        .map_err(|()| bad_request("Review must be at most 2000 characters of plain text"))?;
    let (school, code) = course(&state.pool, segments).await?;
    sqlx::query_as(
        "INSERT INTO ratings AS rating (user_id, school, course_code, score, review)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, school, course_code) DO UPDATE
             SET score = EXCLUDED.score, review = EXCLUDED.review, updated_at = now()
         RETURNING score, review, unicourse_iso_precise(created_at) AS created_at,
             unicourse_iso_precise(updated_at) AS updated_at",
    )
    .bind(me.id)
    .bind(&school)
    .bind(&code)
    .bind(score)
    .bind(&review)
    .fetch_one(&state.pool)
    .await
    .map(Json)
    .map_err(database_error)
}

#[utoipa::path(delete, operation_id = "deleteMyRating", path = "/api/courses/{school}/{courseCode}/ratings/me", params(
    ("school" = String, Path, description = "School slug"),
    ("courseCode" = String, Path, description = "Cross-term course code (URL-encoded)")
), responses(
    (status = 204, description = "Rating removed (also when there was none)"),
    (status = 401, body = ErrorBody),
    (status = 404, body = ErrorBody),
    (status = 500, body = ErrorBody)
), security(("session" = [])))]
pub(crate) async fn delete_mine(
    State(state): State<AppState>,
    CurrentUser(me): CurrentUser,
    segments: Result<Path<(String, String)>, PathRejection>,
) -> Result<StatusCode, ApiError> {
    let (school, code) = course(&state.pool, segments).await?;
    sqlx::query("DELETE FROM ratings WHERE user_id = $1 AND school = $2 AND course_code = $3")
        .bind(me.id)
        .bind(&school)
        .bind(&code)
        .execute(&state.pool)
        .await
        .map_err(database_error)?;
    Ok(StatusCode::NO_CONTENT)
}

pub(crate) async fn by_user(pool: &PgPool, user_id: i64) -> Result<Vec<UserRating>, ApiError> {
    sqlx::query_as(
        "SELECT rating.school, rating.course_code, latest.title, latest.id::text AS latest_offering_id,
             rating.score, rating.review,
             unicourse_iso_precise(rating.created_at) AS created_at,
             unicourse_iso_precise(rating.updated_at) AS updated_at
         FROM ratings AS rating
         LEFT JOIN LATERAL (
             SELECT id, title FROM offerings
             WHERE school = rating.school AND course_code = rating.course_code
             ORDER BY term DESC, active DESC, id DESC LIMIT 1
         ) AS latest ON true
         WHERE rating.user_id = $1
         ORDER BY rating.updated_at DESC
         LIMIT 100",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await
    .map_err(database_error)
}
