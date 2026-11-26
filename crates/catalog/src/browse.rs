//! Overview, ranking and browsing queries (docs/stage2-contract.md).

use serde::Serialize;
use sqlx::{FromRow, PgPool};
use utoipa::ToSchema;

use crate::{Coverage, EnrollmentPoint, OFFERINGS, Offering};

/// Most offerings returned by one instructor or department listing.
pub const LISTING_LIMIT: i64 = 200;

/// Cumulative totals for one cross-term course `(school, courseCode)` over every imported term.
#[derive(Debug, FromRow, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CourseRanking {
    pub school: String,
    pub school_name: String,
    pub course_code: String,
    /// Title of the newest offering.
    pub title: String,
    pub title_en: Option<String>,
    /// Distinct terms with an offering of this course.
    pub terms: i64,
    /// Offerings (class sections) across all terms, including ones later withdrawn.
    pub offerings: i64,
    /// Sum of `enrolled`; `null` when no offering of the course published it.
    pub enrolled_total: Option<i64>,
    /// Sum of `capacity` (名額); `null` when no offering of the course published it.
    pub capacity_total: Option<i64>,
    /// Offering ID of the newest term (an active offering when there is one).
    pub latest_offering_id: String,
    /// Newest active offering, if any.
    #[schema(required = true)]
    pub latest_active_offering_id: Option<String>,
    /// Up to ten terms with offerings, newest first, including withdrawn offerings.
    #[sqlx(json)]
    pub trend: Vec<EnrollmentPoint>,
    /// Whether the newest offering comes from a synthetic demo snapshot.
    pub is_demo: bool,
}

#[derive(Debug, FromRow, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SchoolOverview {
    pub slug: String,
    pub name: String,
    pub name_en: Option<String>,
    /// All imported offerings across all terms, including withdrawn offerings.
    pub offerings: i64,
    /// Distinct courses with any imported offering.
    pub courses: i64,
    /// Imported terms.
    pub terms: i64,
    /// Latest import time (ISO-8601 UTC).
    pub latest_imported_at: Option<String>,
}

#[derive(Clone, Copy, Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct OverviewTotals {
    pub offerings: i64,
    pub courses: i64,
    /// Schools with at least one imported term.
    pub schools: i64,
    /// Distinct terms imported at any school.
    pub terms: i64,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Overview {
    /// Schools with at least one import, by imported offerings, most first.
    pub schools: Vec<SchoolOverview>,
    pub totals: OverviewTotals,
}

#[derive(Debug, FromRow, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct DepartmentCount {
    /// Published offering unit name; use it verbatim (URL-encoded) in department URLs.
    pub name: String,
    /// Active offerings across all terms.
    pub offerings: i64,
    /// Distinct courses with an active offering.
    pub courses: i64,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SchoolDetail {
    pub slug: String,
    pub name: String,
    pub name_en: Option<String>,
    /// Imported terms, newest first.
    pub terms: Vec<String>,
    /// All imported offerings, including withdrawn offerings.
    pub offerings: i64,
    /// Distinct courses with any imported offering.
    pub courses: i64,
    /// Offering units with active offerings, by name.
    pub departments: Vec<DepartmentCount>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct DepartmentOfferings {
    pub school: String,
    pub school_name: String,
    pub department: String,
    /// Terms with active offerings in the department, newest first, regardless of the filter.
    pub terms: Vec<String>,
    /// Active offerings matching the term filter; `offerings` holds at most 200 of them.
    pub total: i64,
    /// Newest term first, then by course code.
    pub offerings: Vec<Offering>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct InstructorSummary {
    /// All active offerings taught; `offerings` holds at most 200 of them.
    pub offerings: i64,
    pub courses: i64,
    /// Terms taught, newest first.
    pub terms: Vec<String>,
    /// Offering units, by name.
    pub departments: Vec<String>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct InstructorOfferings {
    pub school: String,
    pub school_name: String,
    pub name: String,
    pub summary: InstructorSummary,
    /// Newest term first, then by course code.
    pub offerings: Vec<Offering>,
}

/// Rebuild `course_rankings`; the ingest calls this after every successful import. CONCURRENTLY
/// keeps the old contents readable while it runs (two refreshes simply wait for each other).
pub async fn refresh_rankings(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query("REFRESH MATERIALIZED VIEW CONCURRENTLY course_rankings")
        .execute(pool)
        .await
        .map(drop)
}

/// Classify an offering for the default academic ranking. Exclude all zero-credit offerings
/// (including zero-credit service learning and national defense) and administrative titles:
/// 班級活動、班會、導師時間、導師輔導、操行、週會、勞作教育、新生定向、新生導航、新生訓練.
/// Missing credits do not imply zero. The ranking uses the classification of its displayed offering.
pub fn is_academic_offering(title: &str, credits: Option<f64>) -> bool {
    credits != Some(0.0)
        && ![
            "班級活動",
            "班會",
            "導師時間",
            "導師輔導",
            "操行",
            "週會",
            "勞作教育",
            "新生定向",
            "新生導航",
            "新生訓練",
        ]
        .iter()
        .any(|label| title.contains(label))
}

/// Courses by cumulative enrollment, then by cumulative capacity, optionally at one school.
pub async fn rankings(
    pool: &PgPool,
    school: Option<&str>,
    limit: i64,
    academic: bool,
) -> Result<Vec<CourseRanking>, sqlx::Error> {
    let academic_filter = if academic {
        "AND ranking.is_academic"
    } else {
        ""
    };
    sqlx::query_as(&format!(
        "SELECT ranking.school, school.name AS school_name, ranking.course_code, ranking.title,
             ranking.title_en, ranking.terms, ranking.offerings, ranking.enrolled_total,
             ranking.capacity_total, ranking.latest_offering_id::text AS latest_offering_id,
             ranking.is_demo, ranking.latest_active_offering_id::text AS latest_active_offering_id,
             ranking.trend
         FROM course_rankings AS ranking
         JOIN schools AS school ON school.slug = ranking.school
         WHERE ($1::text IS NULL OR ranking.school = $1) {academic_filter}
         ORDER BY ranking.enrolled_total DESC NULLS LAST, ranking.capacity_total DESC NULLS LAST,
             ranking.terms DESC, ranking.school, ranking.course_code
         LIMIT $2",
    ))
    .persistent(false)
    .bind(school)
    .bind(limit)
    .fetch_all(pool)
    .await
}

pub async fn school_detail(
    pool: &PgPool,
    slug: &str,
    coverage: &Coverage,
) -> Result<Option<SchoolDetail>, sqlx::Error> {
    let Some((slug, name, name_en)) = sqlx::query_as::<_, (String, String, Option<String>)>(
        "SELECT slug, name, name_en FROM schools WHERE slug = $1",
    )
    .bind(slug)
    .fetch_optional(pool)
    .await?
    else {
        return Ok(None);
    };
    let (terms, offerings, courses) = coverage
        .schools
        .iter()
        .find(|school| school.slug == slug)
        .map(|school| (school.terms.clone(), school.offerings, school.courses))
        .unwrap_or_default();
    let departments = sqlx::query_as(
        "SELECT department AS name, count(*) AS offerings, count(DISTINCT course_code) AS courses
         FROM offerings WHERE school = $1 AND active AND department IS NOT NULL
         GROUP BY department ORDER BY department",
    )
    .bind(&slug)
    .fetch_all(pool)
    .await?;
    Ok(Some(SchoolDetail {
        slug,
        name,
        name_en,
        terms,
        offerings,
        courses,
        departments,
    }))
}

async fn school_name(pool: &PgPool, slug: &str) -> Result<Option<String>, sqlx::Error> {
    sqlx::query_scalar("SELECT name FROM schools WHERE slug = $1")
        .bind(slug)
        .fetch_optional(pool)
        .await
}

const LISTING_ORDER: &str = "ORDER BY offering.term DESC, offering.course_code,
    offering.class_code NULLS FIRST, offering.id";

/// Active offerings of one department (exact published name); `None` when there are none.
pub async fn department_offerings(
    pool: &PgPool,
    school: &str,
    department: &str,
    term: Option<&str>,
) -> Result<Option<DepartmentOfferings>, sqlx::Error> {
    let Some(school_name) = school_name(pool, school).await? else {
        return Ok(None);
    };
    let (total, terms): (i64, Vec<String>) = sqlx::query_as(
        "SELECT count(*) FILTER (WHERE $3::text IS NULL OR term = $3),
             coalesce(array_agg(DISTINCT term ORDER BY term DESC), '{}')
         FROM offerings WHERE school = $1 AND department = $2 AND active",
    )
    .bind(school)
    .bind(department)
    .bind(term)
    .fetch_one(pool)
    .await?;
    if terms.is_empty() {
        return Ok(None);
    }
    let statement = format!(
        "{OFFERINGS} WHERE offering.school = $1 AND offering.department = $2 AND offering.active
         AND ($3::text IS NULL OR offering.term = $3) {LISTING_ORDER} LIMIT $4"
    );
    let offerings = sqlx::query_as(&statement)
        .bind(school)
        .bind(department)
        .bind(term)
        .bind(LISTING_LIMIT)
        .fetch_all(pool)
        .await?;
    Ok(Some(DepartmentOfferings {
        school: school.into(),
        school_name,
        department: department.into(),
        terms,
        total,
        offerings,
    }))
}

/// Active offerings taught by `name` (exact match on one instructor entry); `None` when there are
/// none.
pub async fn instructor_offerings(
    pool: &PgPool,
    school: &str,
    name: &str,
) -> Result<Option<InstructorOfferings>, sqlx::Error> {
    let Some(school_name) = school_name(pool, school).await? else {
        return Ok(None);
    };
    let (offerings, courses, terms, departments): (i64, i64, Vec<String>, Vec<String>) =
        sqlx::query_as(
            "SELECT count(*), count(DISTINCT course_code),
                 coalesce(array_agg(DISTINCT term ORDER BY term DESC), '{}'),
                 coalesce(array_agg(DISTINCT department ORDER BY department)
                     FILTER (WHERE department IS NOT NULL), '{}')
             FROM offerings
             WHERE school = $1 AND instructors @> ARRAY[$2::text] AND active",
        )
        .bind(school)
        .bind(name)
        .fetch_one(pool)
        .await?;
    if offerings == 0 {
        return Ok(None);
    }
    let statement = format!(
        "{OFFERINGS} WHERE offering.school = $1 AND offering.instructors @> ARRAY[$2::text]
             AND offering.active
         {LISTING_ORDER} LIMIT $3"
    );
    let rows = sqlx::query_as(&statement)
        .bind(school)
        .bind(name)
        .bind(LISTING_LIMIT)
        .fetch_all(pool)
        .await?;
    Ok(Some(InstructorOfferings {
        school: school.into(),
        school_name,
        name: name.into(),
        summary: InstructorSummary {
            offerings,
            courses,
            terms,
            departments,
        },
        offerings: rows,
    }))
}

/// Whether `(school, courseCode)` is a known cross-term course.
pub async fn course_exists(
    pool: &PgPool,
    school: &str,
    course_code: &str,
) -> Result<bool, sqlx::Error> {
    sqlx::query_scalar("SELECT EXISTS (SELECT 1 FROM courses WHERE school = $1 AND code = $2)")
        .bind(school)
        .bind(course_code)
        .fetch_one(pool)
        .await
}

#[cfg(test)]
mod tests {
    use super::is_academic_offering;

    #[test]
    fn academic_offerings_keep_credit_bearing_service_and_defense() {
        for title in ["資料結構", "服務學習", "全民國防教育"] {
            assert!(is_academic_offering(title, Some(1.0)));
            assert!(is_academic_offering(title, None));
            assert!(!is_academic_offering(title, Some(0.0)));
        }
        for title in [
            "班級活動（一）",
            "新生班會",
            "導師時間",
            "導師輔導",
            "操行成績",
            "週會",
            "勞作教育（二）",
            "新生定向",
            "新生導航",
            "新生訓練",
        ] {
            assert!(!is_academic_offering(title, Some(1.0)));
            assert!(!is_academic_offering(title, None));
        }
    }
}
