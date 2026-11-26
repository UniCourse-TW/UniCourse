use sqlx::{FromRow, PgConnection, PgPool};

use crate::{Filters, OFFERINGS, Offering, SearchPage, SearchSort, like_literal};

const FILTERS: &str = "WHERE offering.active AND ($1::text IS NULL OR offering.school = $1)
    AND ($2::text IS NULL OR offering.term = $2)
    AND ($3::text IS NULL OR offering.department = $3)";

const MATCHES: &str = "AND (lower(offering.title) LIKE '%' || lower($4) || '%'
    OR lower(offering.title_en) LIKE '%' || lower($4) || '%'
    OR lower(offering.department) LIKE '%' || lower($4) || '%'
    OR lower(offering.course_code) LIKE lower($4) || '%'
    OR unicourse_instructor_text(offering.instructors) LIKE '%' || lower($4) || '%')";

const SHORT_MATCH: &str = "AND unicourse_search_short(lower(offering.course_code), lower(offering.title),
    lower(offering.title_en), lower(offering.department), unicourse_instructor_text(offering.instructors))
    @> ARRAY[left(lower($5), 2)] AND $4::text <> ''";

const PRIORITY: &str = "CASE
    WHEN lower(offering.course_code) = lower($5) THEN 0
    WHEN lower(offering.title) = lower($5) OR lower(offering.title_en) = lower($5) THEN 1
    WHEN lower(offering.title) LIKE lower($4) || '%' OR lower(offering.title_en) LIKE lower($4) || '%' THEN 2
    WHEN lower(offering.title) LIKE '%' || lower($4) || '%' OR lower(offering.title_en) LIKE '%' || lower($4) || '%' THEN 3
    WHEN lower(offering.course_code) LIKE lower($4) || '%' THEN 4
    ELSE 5 END";

const SIMILARITY: &str = "CASE WHEN priority = 3 THEN greatest(
    CASE WHEN lower(offering.title) LIKE '%' || lower($4) || '%' THEN word_similarity(lower($5), lower(offering.title)) END,
    CASE WHEN lower(offering.title_en) LIKE '%' || lower($4) || '%' THEN word_similarity(lower($5), lower(offering.title_en)) END
    ) ELSE 0 END";

/// Short queries match directly on indexed grams. Longer queries without a usable trigram
/// use a two-character prefilter but still recheck the complete literal match.
fn match_predicates(query: &str) -> (&'static str, &'static str) {
    if query.is_empty() {
        ("AND $4::text = '' AND $5::text = ''", "")
    } else if query.chars().count() <= 2 {
        (SHORT_MATCH, "")
    } else if query
        .split(|character: char| !character.is_alphanumeric())
        .all(|word| word.chars().count() < 3)
    {
        (SHORT_MATCH, MATCHES)
    } else {
        ("AND $5::text <> ''", MATCHES)
    }
}

/// Up to 50 active offerings in the same relevance order as the paginated search.
pub async fn search(
    pool: &PgPool,
    query: &str,
    filters: &Filters<'_>,
) -> Result<Vec<Offering>, sqlx::Error> {
    let mut connection = pool.acquire().await?;
    Ok(search_rows(
        &mut connection,
        query,
        filters,
        SearchSort::Relevance,
        0,
        false,
    )
    .await?
    .into_iter()
    .map(|hit| hit.course)
    .collect())
}

#[derive(FromRow)]
struct SearchHit {
    total: Option<i64>,
    #[sqlx(flatten)]
    course: Offering,
}

async fn search_rows(
    connection: &mut PgConnection,
    query: &str,
    filters: &Filters<'_>,
    sort: SearchSort,
    offset: i64,
    with_total: bool,
) -> Result<Vec<SearchHit>, sqlx::Error> {
    let (prefilter, matches) = match_predicates(query);
    let total = if with_total {
        "count(*) OVER ()"
    } else {
        "NULL::bigint"
    };
    let (priority, similarity) = if query.is_empty() {
        ("0", "0")
    } else {
        (PRIORITY, SIMILARITY)
    };
    let sort_prefix = match sort {
        SearchSort::Relevance => "",
        SearchSort::Enrolled => "enrolled DESC NULLS LAST,",
        SearchSort::Title => "title,",
    };
    let statement = format!(
        "WITH page AS MATERIALIZED (
             SELECT offering.id, offering.term, offering.enrolled, offering.title, offering.school,
                 priority, {similarity} AS similarity, {total} AS total
             FROM offerings AS offering CROSS JOIN LATERAL (VALUES ({priority})) AS rank(priority)
             {FILTERS} {prefilter} {matches}
             ORDER BY {sort_prefix} priority, similarity DESC, term DESC, enrolled DESC NULLS LAST,
                 title, school, id
             LIMIT 50 OFFSET $6
         ), ordered_page AS (
             SELECT id, total, row_number() OVER (ORDER BY {sort_prefix} priority, similarity DESC,
                 term DESC, enrolled DESC NULLS LAST, title, school, id) AS position FROM page
         )
         SELECT ordered_page.total, details.* FROM ordered_page
         CROSS JOIN LATERAL ({OFFERINGS} WHERE offering.id = ordered_page.id) AS details
         ORDER BY ordered_page.position"
    );
    sqlx::query_as(&statement)
        .persistent(false)
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
    let hits = search_rows(
        &mut transaction,
        query,
        filters,
        sort,
        offset,
        !query.is_empty(),
    )
    .await?;
    let total = match hits.first().and_then(|hit| hit.total) {
        Some(total) => total,
        None if offset == 0 && hits.is_empty() => 0,
        None => {
            let (prefilter, matches) = match_predicates(query);
            sqlx::query_scalar(&format!(
                "SELECT count(*) FROM offerings AS offering {FILTERS} {prefilter} {matches}"
            ))
            .persistent(false)
            .bind(filters.school)
            .bind(filters.term)
            .bind(filters.department)
            .bind(like_literal(query))
            .bind(query)
            .fetch_one(&mut *transaction)
            .await?
        }
    };
    transaction.commit().await?;
    Ok(SearchPage {
        total,
        offset,
        courses: hits.into_iter().map(|hit| hit.course).collect(),
    })
}
