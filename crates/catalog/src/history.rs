use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use utoipa::ToSchema;

use crate::{OFFERINGS, Offering};

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CourseHistory {
    pub school: String,
    pub school_name: String,
    pub course_code: String,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title_en: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub department: Option<String>,
    /// Newest term first, including withdrawn offerings.
    pub terms: Vec<CourseTerm>,
    pub totals: CourseTotals,
    #[schema(required = true)]
    pub latest_active_offering_id: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct CourseTerm {
    pub term: String,
    pub offerings: Vec<Offering>,
    #[schema(required = true)]
    pub enrolled: Option<i64>,
    #[schema(required = true)]
    pub capacity: Option<i64>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CourseTotals {
    pub terms: usize,
    pub offerings: usize,
    #[schema(required = true)]
    pub enrolled_total: Option<i64>,
    #[schema(required = true)]
    pub capacity_total: Option<i64>,
}

fn add_published(total: &mut Option<i64>, value: Option<i64>) {
    if let Some(value) = value {
        *total.get_or_insert(0) += value;
    }
}

pub async fn course_history(
    pool: &PgPool,
    school: &str,
    course_code: &str,
) -> Result<Option<CourseHistory>, sqlx::Error> {
    let offerings: Vec<Offering> = sqlx::query_as(&format!(
        "{OFFERINGS} WHERE offering.school = $1 AND offering.course_code = $2
         ORDER BY offering.term DESC, offering.active DESC, offering.id DESC"
    ))
    .bind(school)
    .bind(course_code)
    .fetch_all(pool)
    .await?;
    let Some(latest) = offerings.first() else {
        return Ok(None);
    };
    let mut history = CourseHistory {
        school: latest.school.clone(),
        school_name: latest.school_name.clone(),
        course_code: latest.course_code.clone(),
        title: latest.title.clone(),
        title_en: latest.title_en.clone(),
        department: latest.department.clone(),
        terms: Vec::new(),
        totals: CourseTotals {
            terms: 0,
            offerings: offerings.len(),
            enrolled_total: None,
            capacity_total: None,
        },
        latest_active_offering_id: offerings
            .iter()
            .find(|offering| offering.active)
            .map(|offering| offering.id.clone()),
    };
    let mut offerings = offerings.into_iter().peekable();
    while let Some(first) = offerings.next() {
        let mut term = CourseTerm {
            term: first.term.clone(),
            offerings: vec![first],
            enrolled: None,
            capacity: None,
        };
        while let Some(offering) = offerings.next_if(|offering| offering.term == term.term) {
            term.offerings.push(offering);
        }
        for offering in &term.offerings {
            add_published(&mut term.enrolled, offering.enrolled.map(i64::from));
            add_published(&mut term.capacity, offering.capacity.map(i64::from));
        }
        add_published(&mut history.totals.enrolled_total, term.enrolled);
        add_published(&mut history.totals.capacity_total, term.capacity);
        history.terms.push(term);
    }
    history.totals.terms = history.terms.len();
    Ok(Some(history))
}

#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct EnrollmentPoint {
    pub term: String,
    #[schema(required = true)]
    pub enrolled: Option<i64>,
    #[schema(required = true)]
    pub capacity: Option<i64>,
}

#[derive(Debug, FromRow, Serialize, ToSchema)]
pub struct TermTrend {
    pub term: String,
    pub offerings: i64,
    pub courses: i64,
    #[schema(required = true)]
    pub enrolled: Option<i64>,
    #[schema(required = true)]
    pub capacity: Option<i64>,
}

pub enum TrendScope<'a> {
    School,
    Department(&'a str),
    Instructor(&'a str),
}

/// Per-term statistics for the active catalog, independent of the browsing listing limit.
pub async fn trends(
    pool: &PgPool,
    school: &str,
    scope: TrendScope<'_>,
) -> Result<Option<Vec<TermTrend>>, sqlx::Error> {
    let filter = match scope {
        TrendScope::School => "",
        TrendScope::Department(_) => "AND department = $2",
        TrendScope::Instructor(_) => "AND instructors @> ARRAY[$2::text]",
    };
    let statement = format!(
        "SELECT term, count(*) AS offerings, count(DISTINCT course_code) AS courses,
             sum(enrolled) AS enrolled, sum(capacity) AS capacity
         FROM offerings WHERE school = $1 AND active {filter}
         GROUP BY term ORDER BY term DESC"
    );
    let query = sqlx::query_as(&statement).bind(school);
    let rows: Vec<TermTrend> = match scope {
        TrendScope::School => query.fetch_all(pool).await?,
        TrendScope::Department(value) | TrendScope::Instructor(value) => {
            query.bind(value).fetch_all(pool).await?
        }
    };
    if !rows.is_empty() {
        return Ok(Some(rows));
    }
    if matches!(scope, TrendScope::School) {
        let exists: bool =
            sqlx::query_scalar("SELECT EXISTS (SELECT 1 FROM schools WHERE slug = $1)")
                .bind(school)
                .fetch_one(pool)
                .await?;
        return Ok(exists.then_some(rows));
    }
    Ok(None)
}
