use serde::Serialize;
use sqlx::{FromRow, PgPool};
use utoipa::ToSchema;

#[derive(FromRow, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct RatingStats {
    pub count: i64,
    /// Mean score; `null` without ratings.
    pub average: Option<f64>,
    /// Number of ratings with score 1, 2, 3, 4 and 5.
    #[schema(min_items = 5, max_items = 5)]
    pub histogram: Vec<i64>,
}

#[derive(FromRow, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CourseRatingStats {
    pub school: String,
    pub course_code: String,
    #[sqlx(flatten)]
    pub stats: RatingStats,
}

pub async fn course_rating_stats(
    pool: &PgPool,
    keys: &[(&str, &str)],
) -> Result<Vec<CourseRatingStats>, sqlx::Error> {
    let (schools, codes): (Vec<_>, Vec<_>) = keys.iter().copied().unzip();
    sqlx::query_as(
        "SELECT requested.school, requested.course_code, stats.*
         FROM (
             SELECT school, course_code, min(position) AS first_position
             FROM unnest($1::text[], $2::text[]) WITH ORDINALITY AS key(school, course_code, position)
             GROUP BY school, course_code
         ) AS requested
         JOIN courses ON courses.school = requested.school AND courses.code = requested.course_code
         CROSS JOIN LATERAL (
             SELECT count(*) AS count, avg(score)::float8 AS average,
                 ARRAY[count(*) FILTER (WHERE score = 1), count(*) FILTER (WHERE score = 2),
                     count(*) FILTER (WHERE score = 3), count(*) FILTER (WHERE score = 4),
                     count(*) FILTER (WHERE score = 5)] AS histogram
             FROM ratings WHERE school = requested.school AND course_code = requested.course_code
         ) AS stats
         ORDER BY requested.first_position",
    )
    .bind(schools)
    .bind(codes)
    .fetch_all(pool)
    .await
}
