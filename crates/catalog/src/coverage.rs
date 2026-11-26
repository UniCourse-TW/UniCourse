use std::collections::BTreeSet;

use serde::Serialize;
use sqlx::{FromRow, PgPool};
use utoipa::ToSchema;

use crate::{Overview, OverviewTotals, SchoolOverview};

/// Catalog coverage counts all imported terms and offerings, including withdrawn offerings.
/// A course is one distinct (school, course code) with at least one offering. School counts
/// include only schools with a snapshot, and global terms are the union across those schools.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Coverage {
    #[schema(required = true)]
    pub earliest_term: Option<String>,
    #[schema(required = true)]
    pub latest_term: Option<String>,
    /// Distinct imported terms, newest first.
    pub terms: Vec<String>,
    /// Schools by imported offerings, most first.
    pub schools: Vec<SchoolCoverage>,
    pub totals: OverviewTotals,
}

#[derive(Debug, FromRow, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SchoolCoverage {
    pub slug: String,
    pub name: String,
    #[serde(skip)]
    pub(crate) name_en: Option<String>,
    pub earliest_term: String,
    pub latest_term: String,
    /// Imported terms at this school, newest first.
    pub terms: Vec<String>,
    pub offerings: i64,
    pub courses: i64,
    pub latest_imported_at: String,
}

pub async fn coverage(pool: &PgPool) -> Result<Coverage, sqlx::Error> {
    let schools: Vec<SchoolCoverage> = sqlx::query_as(
        "SELECT school.slug, school.name, school.name_en, imported.earliest_term,
             imported.latest_term, imported.terms, unicourse_iso(imported.latest) AS latest_imported_at,
             coalesce(catalog.offerings, 0) AS offerings, coalesce(catalog.courses, 0) AS courses
         FROM schools AS school
         JOIN (
             SELECT school, array_agg(term ORDER BY term DESC) AS terms,
                 min(term) AS earliest_term, max(term) AS latest_term, max(imported_at) AS latest
             FROM course_snapshots GROUP BY school
         ) AS imported ON imported.school = school.slug
         LEFT JOIN (
             SELECT school, count(*) AS offerings, count(DISTINCT course_code) AS courses
             FROM offerings GROUP BY school
         ) AS catalog ON catalog.school = school.slug
         ORDER BY offerings DESC, school.name, school.slug",
    )
    .fetch_all(pool)
    .await?;
    let terms: Vec<String> = schools
        .iter()
        .flat_map(|school| school.terms.iter())
        .collect::<BTreeSet<_>>()
        .into_iter()
        .rev()
        .cloned()
        .collect();
    let totals = OverviewTotals {
        offerings: schools.iter().map(|school| school.offerings).sum(),
        courses: schools.iter().map(|school| school.courses).sum(),
        schools: schools.len() as i64,
        terms: terms.len() as i64,
    };
    Ok(Coverage {
        earliest_term: terms.last().cloned(),
        latest_term: terms.first().cloned(),
        terms,
        schools,
        totals,
    })
}

impl From<&Coverage> for Overview {
    fn from(coverage: &Coverage) -> Self {
        Self {
            schools: coverage
                .schools
                .iter()
                .map(|school| SchoolOverview {
                    slug: school.slug.clone(),
                    name: school.name.clone(),
                    name_en: school.name_en.clone(),
                    offerings: school.offerings,
                    courses: school.courses,
                    terms: school.terms.len() as i64,
                    latest_imported_at: Some(school.latest_imported_at.clone()),
                })
                .collect(),
            totals: coverage.totals,
        }
    }
}
