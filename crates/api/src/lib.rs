use std::{
    sync::Arc,
    time::{Duration, Instant},
};

use axum::{
    Json, Router,
    extract::{
        FromRef, FromRequest, Path, Query, Request, State,
        rejection::{JsonRejection, PathRejection, QueryRejection},
    },
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post, put},
};
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use sqlx::PgPool;
use tokio::sync::Mutex;
use unicourse_catalog::{
    self as catalog, CourseRanking, Coverage, CrawlStatus, DepartmentCount, DepartmentOfferings,
    EducationSystem, ExternalMatchKind, ExternalReview, ExternalReviewMatch, ExternalSourceCount,
    ExtraValue, Institution, InstitutionKind, Institutions, InstructorOfferings, InstructorSummary,
    Meeting, Offering, Overview, OverviewTotals, Ownership, Requirement, School, SchoolCoverage,
    SchoolDetail, SchoolOverview, SearchPage, SearchSort,
};
use utoipa::{
    IntoParams, Modify, OpenApi, ToSchema,
    openapi::security::{ApiKey, ApiKeyValue, SecurityScheme},
};

mod auth;
mod external_reviews;
mod forum;
mod history;
mod ratings;
mod text;

#[derive(OpenApi)]
#[openapi(
    paths(
        schools, terms, departments, search, search_page, detail, rankings, overview, school_detail,
        department_detail, instructor, institutions, coverage,
        history::course_history, history::school_trends, history::department_trends,
        history::instructor_trends,
        auth::register, auth::login, auth::logout, auth::me, auth::update_me, auth::profile,
        ratings::list, ratings::stats, ratings::mine, ratings::put_mine, ratings::delete_mine,
        forum::list, forum::create, forum::detail, forum::reply, forum::update, forum::delete,
        forum::vote, external_reviews::course, external_reviews::instructor,
    ),
    components(schemas(
        School, Offering, Meeting, Requirement, ExtraValue, ErrorBody, CourseRanking, Overview,
        SchoolOverview, OverviewTotals, SchoolDetail, DepartmentCount, DepartmentOfferings,
        InstructorOfferings, InstructorSummary, Institutions, Institution, InstitutionKind,
        Ownership, EducationSystem, CrawlStatus, SearchSort, Coverage, SchoolCoverage,
        forum::TopLevelPostType, ExternalReview, ExternalReviewMatch, ExternalMatchKind,
        ExternalSourceCount, external_reviews::ExternalReviews, external_reviews::OutboundLink,
    )),
    modifiers(&SessionCookie)
)]
pub struct ApiDoc;

/// Documents the `uc_session` cookie that `security(("session" = []))` endpoints read.
struct SessionCookie;

impl Modify for SessionCookie {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        openapi
            .components
            .get_or_insert_with(Default::default)
            .add_security_scheme(
                "session",
                SecurityScheme::ApiKey(ApiKey::Cookie(ApiKeyValue::with_description(
                    auth::COOKIE,
                    "Session cookie set by /api/auth/register and /api/auth/login",
                ))),
            );
    }
}

/// Runtime settings that are not part of the database.
#[derive(Clone, Copy, Debug, Default)]
pub struct Config {
    /// Add `Secure` to the session cookie (set `COOKIE_SECURE=1` behind HTTPS).
    pub cookie_secure: bool,
}

#[derive(Clone)]
struct AppState {
    pool: PgPool,
    config: Config,
    coverage: Arc<Mutex<Option<CachedCoverage>>>,
}

struct CachedCoverage {
    fetched_at: Instant,
    value: Arc<Coverage>,
}

impl AppState {
    async fn coverage(&self) -> Result<Arc<Coverage>, ApiError> {
        const TTL: Duration = Duration::from_secs(5 * 60);
        let mut cache = self.coverage.lock().await;
        if let Some(cached) = &*cache
            && cached.fetched_at.elapsed() < TTL
        {
            return Ok(Arc::clone(&cached.value));
        }
        let value = Arc::new(
            catalog::coverage(&self.pool)
                .await
                .map_err(database_error)?,
        );
        *cache = Some(CachedCoverage {
            fetched_at: Instant::now(),
            value: Arc::clone(&value),
        });
        Ok(value)
    }
}

impl FromRef<AppState> for PgPool {
    fn from_ref(state: &AppState) -> Self {
        state.pool.clone()
    }
}

#[derive(Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
struct Filters {
    /// Matches title, English title, department and instructors, or a course code prefix.
    /// Leading and trailing whitespace is trimmed; the trimmed value may be at most 100
    /// characters and must not contain line breaks or NUL.
    q: Option<String>,
    /// School slug (exact).
    school: Option<String>,
    /// Term such as `115-1` (exact); omit for all terms.
    term: Option<String>,
    /// Offering unit name (exact).
    department: Option<String>,
}

impl Filters {
    fn validated(&self) -> Result<(&str, catalog::Filters<'_>), ApiError> {
        let query = search_text(self.q.as_deref())?;
        ensure_no_nul([
            self.school.as_deref(),
            self.term.as_deref(),
            self.department.as_deref(),
        ])?;
        let filters = catalog::Filters {
            school: self.school.as_deref().filter(|value| !value.is_empty()),
            term: self.term.as_deref().filter(|value| !value.is_empty()),
            department: self.department.as_deref().filter(|value| !value.is_empty()),
        };
        Ok((query, filters))
    }
}

#[derive(Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
struct SearchOptions {
    /// Skip this many matches (default 0).
    #[param(minimum = 0)]
    offset: Option<i64>,
    /// Sort by relevance (default), published enrollment descending, or title ascending.
    /// Relevance prefers exact code, exact title, title prefix, title substring, then other matches.
    sort: Option<SearchSort>,
}

#[derive(Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
struct DepartmentTerm {
    /// Exact term such as `115-1`; omit for all terms.
    term: Option<String>,
}

#[derive(Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
struct DepartmentFilters {
    /// School slug.
    school: String,
}

#[derive(Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
struct RankingFilters {
    /// School slug (exact); omit for all schools.
    school: Option<String>,
    /// Number of courses, 1 to 100 (default 20).
    limit: Option<i64>,
    /// Exclude zero-credit and administrative offerings from the ranking (default true).
    #[param(default = true)]
    academic: Option<bool>,
}

#[derive(Debug, Serialize, ToSchema)]
struct ErrorBody {
    code: ErrorCode,
    message: &'static str,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "snake_case")]
enum ErrorCode {
    InvalidInput,
    InvalidQuery,
    InvalidPath,
    InvalidBody,
    Unauthorized,
    InvalidCredentials,
    Forbidden,
    NotFound,
    MethodNotAllowed,
    UsernameTaken,
    RateLimited,
    InternalError,
}

type ApiError = (StatusCode, Json<ErrorBody>);

fn error(status: StatusCode, message: &'static str) -> ApiError {
    let code = match status {
        StatusCode::BAD_REQUEST => ErrorCode::InvalidInput,
        StatusCode::UNAUTHORIZED => ErrorCode::Unauthorized,
        StatusCode::FORBIDDEN => ErrorCode::Forbidden,
        StatusCode::NOT_FOUND => ErrorCode::NotFound,
        StatusCode::METHOD_NOT_ALLOWED => ErrorCode::MethodNotAllowed,
        StatusCode::CONFLICT => ErrorCode::UsernameTaken,
        StatusCode::TOO_MANY_REQUESTS => ErrorCode::RateLimited,
        _ => ErrorCode::InternalError,
    };
    coded_error(status, code, message)
}

fn coded_error(status: StatusCode, code: ErrorCode, message: &'static str) -> ApiError {
    (status, Json(ErrorBody { code, message }))
}

fn bad_request(message: &'static str) -> ApiError {
    error(StatusCode::BAD_REQUEST, message)
}

fn invalid_query(message: &'static str) -> ApiError {
    coded_error(StatusCode::BAD_REQUEST, ErrorCode::InvalidQuery, message)
}

/// PostgreSQL text cannot hold NUL, so a filter containing it is a client error, not a 500.
fn ensure_no_nul<'a>(values: impl IntoIterator<Item = Option<&'a str>>) -> Result<(), ApiError> {
    if values
        .into_iter()
        .flatten()
        .any(|value| value.contains('\0'))
    {
        return Err(invalid_query("Invalid query"));
    }
    Ok(())
}

/// The trimmed search text. Instructors are indexed as one newline-joined string, so line breaks
/// would let a query match across two names.
fn search_text(raw: Option<&str>) -> Result<&str, ApiError> {
    let query = raw.unwrap_or_default().trim();
    if query.chars().count() > 100 {
        return Err(invalid_query("Search must be at most 100 characters"));
    }
    if query.contains(['\0', '\n', '\r']) {
        return Err(invalid_query("Invalid query"));
    }
    Ok(query)
}

fn database_error(cause: sqlx::Error) -> ApiError {
    eprintln!("database query failed: {cause}");
    error(StatusCode::INTERNAL_SERVER_ERROR, "Catalog unavailable")
}

fn query<T>(query: Result<Query<T>, QueryRejection>) -> Result<T, ApiError> {
    query
        .map(|Query(value)| value)
        .map_err(|_| invalid_query("Invalid query"))
}

/// Path segments that cannot be decoded name nothing, so they are a 404; NUL is a 400 like in
/// query strings.
fn path<T>(
    path: Result<Path<T>, PathRejection>,
    not_found: &'static str,
    texts: impl Fn(&T) -> Vec<&str>,
) -> Result<T, ApiError> {
    let Path(value) = path.map_err(|_| error(StatusCode::NOT_FOUND, not_found))?;
    if texts(&value).iter().any(|text| text.contains('\0')) {
        return Err(coded_error(
            StatusCode::BAD_REQUEST,
            ErrorCode::InvalidPath,
            "Invalid path",
        ));
    }
    Ok(value)
}

/// `Json` whose rejection is a coded 400 instead of axum's plain-text error.
struct Body<T>(T);

impl<S: Send + Sync, T: DeserializeOwned> FromRequest<S> for Body<T> {
    type Rejection = ApiError;

    async fn from_request(request: Request, state: &S) -> Result<Self, Self::Rejection> {
        Json::<T>::from_request(request, state)
            .await
            .map(|Json(value)| Body(value))
            .map_err(|rejection: JsonRejection| {
                let message = match rejection {
                    JsonRejection::MissingJsonContentType(_) => "Expected an application/json body",
                    _ => "Invalid request body",
                };
                coded_error(StatusCode::BAD_REQUEST, ErrorCode::InvalidBody, message)
            })
    }
}

/// The router with default settings (no `Secure` cookies).
pub fn router(pool: PgPool) -> Router {
    router_with(pool, Config::default())
}

pub fn router_with(pool: PgPool, config: Config) -> Router {
    Router::new()
        .route("/api/schools", get(schools))
        .route("/api/schools/{school}", get(school_detail))
        .route("/api/schools/{school}/trends", get(history::school_trends))
        .route(
            "/api/schools/{school}/departments/{department}",
            get(department_detail),
        )
        .route(
            "/api/schools/{school}/departments/{department}/trends",
            get(history::department_trends),
        )
        .route("/api/instructors/{school}/{name}", get(instructor))
        .route(
            "/api/instructors/{school}/{name}/trends",
            get(history::instructor_trends),
        )
        .route(
            "/api/instructors/{school}/{name}/external-reviews",
            get(external_reviews::instructor),
        )
        .route(
            "/api/courses/{school}/{course_code}/external-reviews",
            get(external_reviews::course),
        )
        .route("/api/terms", get(terms))
        .route("/api/departments", get(departments))
        .route("/api/courses", get(search))
        .route("/api/courses/search", get(search_page))
        .route("/api/courses/{id}", get(detail))
        .route(
            "/api/courses/{school}/{course_code}",
            get(history::course_history),
        )
        .route("/api/rankings/courses", get(rankings))
        .route("/api/coverage", get(coverage))
        .route("/api/stats/overview", get(overview))
        .route("/api/institutions", get(institutions))
        .route("/api/auth/register", post(auth::register))
        .route("/api/auth/login", post(auth::login))
        .route("/api/auth/logout", post(auth::logout))
        .route("/api/auth/me", get(auth::me).patch(auth::update_me))
        .route("/api/users/{username}", get(auth::profile))
        .route(
            "/api/courses/{school}/{course_code}/ratings",
            get(ratings::list),
        )
        .route(
            "/api/courses/{school}/{course_code}/ratings/stats",
            get(ratings::stats),
        )
        .route(
            "/api/courses/{school}/{course_code}/ratings/me",
            get(ratings::mine)
                .put(ratings::put_mine)
                .delete(ratings::delete_mine),
        )
        .route("/api/posts", get(forum::list).post(forum::create))
        .route(
            "/api/posts/{id}",
            get(forum::detail)
                .patch(forum::update)
                .delete(forum::delete),
        )
        .route("/api/posts/{id}/replies", post(forum::reply))
        .route("/api/posts/{id}/vote", put(forum::vote))
        .fallback(|| async { error(StatusCode::NOT_FOUND, "Route not found") })
        .method_not_allowed_fallback(|| async {
            error(StatusCode::METHOD_NOT_ALLOWED, "Method not allowed")
        })
        .with_state(AppState {
            pool,
            config,
            coverage: Arc::default(),
        })
}

#[utoipa::path(get, path = "/api/schools", responses(
    (status = 200, description = "Available schools", body = [School]),
    (status = 500, body = ErrorBody)
))]
async fn schools(State(pool): State<PgPool>) -> Result<Json<Vec<School>>, ApiError> {
    catalog::schools(&pool)
        .await
        .map(Json)
        .map_err(database_error)
}

#[utoipa::path(get, path = "/api/terms", responses(
    (status = 200, description = "Imported terms, newest first", body = [String]),
    (status = 500, body = ErrorBody)
))]
async fn terms(State(pool): State<PgPool>) -> Result<Json<Vec<String>>, ApiError> {
    catalog::terms(&pool)
        .await
        .map(Json)
        .map_err(database_error)
}

#[utoipa::path(get, path = "/api/departments", params(DepartmentFilters), responses(
    (status = 200, description = "Offering units with active offerings at the school, by name", body = [String]),
    (status = 400, body = ErrorBody),
    (status = 500, body = ErrorBody)
))]
async fn departments(
    State(pool): State<PgPool>,
    filters: Result<Query<DepartmentFilters>, QueryRejection>,
) -> Result<Json<Vec<String>>, ApiError> {
    let filters = query(filters)?;
    ensure_no_nul([Some(filters.school.as_str())])?;
    catalog::departments(&pool, &filters.school)
        .await
        .map(Json)
        .map_err(database_error)
}

#[utoipa::path(get, path = "/api/courses", params(Filters), responses(
    (status = 200, description = "Up to 50 active offerings matching the filters", body = [Offering]),
    (status = 400, body = ErrorBody),
    (status = 500, body = ErrorBody)
))]
async fn search(
    State(pool): State<PgPool>,
    filters: Result<Query<Filters>, QueryRejection>,
) -> Result<Json<Vec<Offering>>, ApiError> {
    let filters = query(filters)?;
    let (text, filters) = filters.validated()?;
    catalog::search(&pool, text, &filters)
        .await
        .map(Json)
        .map_err(database_error)
}

#[utoipa::path(get, path = "/api/courses/search", params(Filters, SearchOptions), responses(
    (status = 200, description = "Matching active offerings (up to 50 per page) and the total before pagination", body = SearchPage),
    (status = 400, body = ErrorBody),
    (status = 500, body = ErrorBody)
))]
async fn search_page(
    State(pool): State<PgPool>,
    filters: Result<Query<Filters>, QueryRejection>,
    options: Result<Query<SearchOptions>, QueryRejection>,
) -> Result<Json<SearchPage>, ApiError> {
    let filters = query(filters)?;
    let options = query(options)?;
    let (text, filters) = filters.validated()?;
    let offset = options.offset.unwrap_or_default();
    if offset < 0 {
        return Err(invalid_query("offset must be non-negative"));
    }
    catalog::search_page(
        &pool,
        text,
        &filters,
        options.sort.unwrap_or_default(),
        offset,
    )
    .await
    .map(Json)
    .map_err(database_error)
}

#[utoipa::path(get, path = "/api/courses/{id}", params(("id" = String, Path, description = "Offering ID")), responses(
    (status = 200, description = "Course offering, including withdrawn offerings", body = Offering),
    (status = 404, body = ErrorBody),
    (status = 500, body = ErrorBody)
))]
async fn detail(
    State(pool): State<PgPool>,
    id: Result<Path<String>, PathRejection>,
) -> Result<Json<Offering>, ApiError> {
    let not_found = || error(StatusCode::NOT_FOUND, "Offering not found");
    // An undecodable segment (e.g. `%FF`) is just another ID that cannot exist.
    let Path(id) = id.map_err(|_| not_found())?;
    let id = id.parse::<i64>().map_err(|_| not_found())?;
    catalog::offering(&pool, id)
        .await
        .map_err(database_error)?
        .map(Json)
        .ok_or_else(not_found)
}

#[utoipa::path(get, path = "/api/rankings/courses", params(RankingFilters), responses(
    (status = 200, description = "Cross-term courses by cumulative enrollment (enrolledTotal DESC NULLS LAST, then capacityTotal DESC), over every imported term", body = [CourseRanking]),
    (status = 400, body = ErrorBody),
    (status = 500, body = ErrorBody)
))]
async fn rankings(
    State(pool): State<PgPool>,
    filters: Result<Query<RankingFilters>, QueryRejection>,
) -> Result<Json<Vec<CourseRanking>>, ApiError> {
    let filters = query(filters)?;
    ensure_no_nul([filters.school.as_deref()])?;
    let limit = filters.limit.unwrap_or(20);
    if !(1..=100).contains(&limit) {
        return Err(invalid_query("limit must be between 1 and 100"));
    }
    let school = filters.school.as_deref().filter(|value| !value.is_empty());
    catalog::rankings(&pool, school, limit, filters.academic.unwrap_or(true))
        .await
        .map(Json)
        .map_err(database_error)
}

#[utoipa::path(get, path = "/api/coverage", responses(
    (status = 200, description = "Coverage of all imported terms and offerings, including withdrawn offerings; cached for five minutes", body = Coverage),
    (status = 500, body = ErrorBody)
))]
async fn coverage(State(state): State<AppState>) -> Result<Response, ApiError> {
    let coverage = state.coverage().await?;
    Ok(Json(&*coverage).into_response())
}

#[utoipa::path(get, path = "/api/stats/overview", responses(
    (status = 200, description = "Per-school and total counts of all imported offerings, courses and terms", body = Overview),
    (status = 500, body = ErrorBody)
))]
async fn overview(State(state): State<AppState>) -> Result<Json<Overview>, ApiError> {
    let coverage = state.coverage().await?;
    Ok(Json(Overview::from(&*coverage)))
}

#[utoipa::path(get, path = "/api/institutions", responses(
    (status = 200, description = "Every Taiwanese higher-education institution in the MOE list, by code, with crawl status and coverage of all imported offerings", body = Institutions),
    (status = 500, body = ErrorBody)
))]
async fn institutions(State(state): State<AppState>) -> Result<Json<Institutions>, ApiError> {
    let coverage = state.coverage().await?;
    Ok(Json(catalog::institutions(&coverage)))
}

#[utoipa::path(get, path = "/api/schools/{school}", params(("school" = String, Path, description = "School slug")), responses(
    (status = 200, description = "School with its terms and offering units", body = SchoolDetail),
    (status = 400, body = ErrorBody),
    (status = 404, body = ErrorBody),
    (status = 500, body = ErrorBody)
))]
async fn school_detail(
    State(state): State<AppState>,
    school: Result<Path<String>, PathRejection>,
) -> Result<Json<SchoolDetail>, ApiError> {
    let school = path(school, "School not found", |school| vec![school.as_str()])?;
    let coverage = state.coverage().await?;
    catalog::school_detail(&state.pool, &school, &coverage)
        .await
        .map_err(database_error)?
        .map(Json)
        .ok_or_else(|| error(StatusCode::NOT_FOUND, "School not found"))
}

#[utoipa::path(get, path = "/api/schools/{school}/departments/{department}", params(
    ("school" = String, Path, description = "School slug"),
    ("department" = String, Path, description = "Published offering unit name (exact, URL-encoded)"),
    DepartmentTerm
), responses(
    (status = 200, description = "Up to 200 active offerings matching the term filter, and all available terms, newest first", body = DepartmentOfferings),
    (status = 400, body = ErrorBody),
    (status = 404, body = ErrorBody),
    (status = 500, body = ErrorBody)
))]
async fn department_detail(
    State(pool): State<PgPool>,
    segments: Result<Path<(String, String)>, PathRejection>,
    filters: Result<Query<DepartmentTerm>, QueryRejection>,
) -> Result<Json<DepartmentOfferings>, ApiError> {
    let (school, department) = path(segments, "Department not found", |(school, department)| {
        vec![school.as_str(), department.as_str()]
    })?;
    let filters = query(filters)?;
    let term = filters.term.as_deref().filter(|term| !term.is_empty());
    ensure_no_nul([term])?;
    catalog::department_offerings(&pool, &school, &department, term)
        .await
        .map_err(database_error)?
        .map(Json)
        .ok_or_else(|| error(StatusCode::NOT_FOUND, "Department not found"))
}

#[utoipa::path(get, path = "/api/instructors/{school}/{name}", params(
    ("school" = String, Path, description = "School slug"),
    ("name" = String, Path, description = "Instructor name exactly as published (URL-encoded)")
), responses(
    (status = 200, description = "Up to 200 active offerings taught, newest term first, with a summary over all of them", body = InstructorOfferings),
    (status = 400, body = ErrorBody),
    (status = 404, body = ErrorBody),
    (status = 500, body = ErrorBody)
))]
async fn instructor(
    State(pool): State<PgPool>,
    segments: Result<Path<(String, String)>, PathRejection>,
) -> Result<Json<InstructorOfferings>, ApiError> {
    let (school, name) = path(segments, "Instructor not found", |(school, name)| {
        vec![school.as_str(), name.as_str()]
    })?;
    catalog::instructor_offerings(&pool, &school, &name)
        .await
        .map_err(database_error)?
        .map(Json)
        .ok_or_else(|| error(StatusCode::NOT_FOUND, "Instructor not found"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{body::Body as HttpBody, http::Request};
    use tower::ServiceExt;

    #[test]
    fn search_text_is_trimmed_and_bounded() {
        assert_eq!(search_text(Some("  資料 ")).unwrap(), "資料");
        assert_eq!(search_text(None).unwrap(), "");
        assert!(search_text(Some(&"a".repeat(100))).is_ok());
        assert!(search_text(Some(&"a".repeat(101))).is_err());
        for bad in ["a\nb", "a\rb", "a\0b"] {
            let (status, _) = search_text(Some(bad)).unwrap_err();
            assert_eq!(status, StatusCode::BAD_REQUEST);
        }
        assert!(ensure_no_nul([Some("nthu"), None]).is_ok());
        assert!(ensure_no_nul([None, Some("示範\0")]).is_err());
    }

    /// Every request below is rejected before the (unreachable) database is queried.
    #[tokio::test]
    async fn invalid_requests_get_json_errors() {
        let pool = sqlx::postgres::PgPoolOptions::new()
            .connect_lazy("postgres://invalid@127.0.0.1:1/invalid")
            .unwrap();
        let app = router(pool);
        for (method, uri, status) in [
            ("GET", "/api/courses?q=a%0Ab", StatusCode::BAD_REQUEST),
            ("GET", "/api/courses?q=a%00b", StatusCode::BAD_REQUEST),
            (
                "GET",
                "/api/courses?school=nthu%00",
                StatusCode::BAD_REQUEST,
            ),
            ("GET", "/api/courses?term=115-1%00", StatusCode::BAD_REQUEST),
            (
                "GET",
                "/api/courses?department=x%00",
                StatusCode::BAD_REQUEST,
            ),
            (
                "GET",
                "/api/departments?school=nthu%00",
                StatusCode::BAD_REQUEST,
            ),
            ("GET", "/api/departments", StatusCode::BAD_REQUEST),
            ("GET", "/api/courses/abc", StatusCode::NOT_FOUND),
            ("GET", "/api/courses/%FF", StatusCode::NOT_FOUND),
            (
                "GET",
                "/api/rankings/courses?limit=0",
                StatusCode::BAD_REQUEST,
            ),
            (
                "GET",
                "/api/rankings/courses?limit=101",
                StatusCode::BAD_REQUEST,
            ),
            (
                "GET",
                "/api/rankings/courses?limit=x",
                StatusCode::BAD_REQUEST,
            ),
            (
                "GET",
                "/api/rankings/courses?school=a%00",
                StatusCode::BAD_REQUEST,
            ),
            ("GET", "/api/schools/a%00", StatusCode::BAD_REQUEST),
            (
                "GET",
                "/api/schools/nthu/departments/%FF",
                StatusCode::NOT_FOUND,
            ),
            ("GET", "/api/instructors/nthu/a%00", StatusCode::BAD_REQUEST),
            (
                "GET",
                "/api/instructors/nthu/a%00/external-reviews",
                StatusCode::BAD_REQUEST,
            ),
            (
                "GET",
                "/api/instructors/bogus/a/external-reviews",
                StatusCode::NOT_FOUND,
            ),
            (
                "GET",
                "/api/courses/nthu/a%00/external-reviews",
                StatusCode::BAD_REQUEST,
            ),
            ("GET", "/api/posts?page=0", StatusCode::BAD_REQUEST),
            ("GET", "/api/posts?type=reply", StatusCode::BAD_REQUEST),
            (
                "GET",
                "/api/posts?courseCode=DEMO201",
                StatusCode::BAD_REQUEST,
            ),
            ("GET", "/api/posts?q=a%00", StatusCode::BAD_REQUEST),
            ("GET", "/api/posts/abc", StatusCode::NOT_FOUND),
            ("POST", "/api/auth/register", StatusCode::BAD_REQUEST),
            ("POST", "/api/auth/login", StatusCode::BAD_REQUEST),
            ("GET", "/api/auth/me", StatusCode::UNAUTHORIZED),
            ("POST", "/api/posts", StatusCode::UNAUTHORIZED),
            ("PUT", "/api/posts/1/vote", StatusCode::UNAUTHORIZED),
            (
                "PUT",
                "/api/courses/nthu/DEMO201/ratings/me",
                StatusCode::UNAUTHORIZED,
            ),
        ] {
            let response = app
                .clone()
                .oneshot(
                    Request::builder()
                        .method(method)
                        .uri(uri)
                        .body(HttpBody::empty())
                        .unwrap(),
                )
                .await
                .unwrap();
            assert_eq!(response.status(), status, "{method} {uri}");
            assert_eq!(
                response.headers()["content-type"],
                "application/json",
                "{method} {uri}"
            );
        }
    }
}
