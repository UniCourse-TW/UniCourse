use axum::{
    Json, Router,
    extract::{
        FromRef, FromRequest, Path, Query, Request, State,
        rejection::{JsonRejection, PathRejection, QueryRejection},
    },
    http::StatusCode,
    routing::{get, post, put},
};
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use sqlx::PgPool;
use unicourse_catalog::{
    self as catalog, CourseRanking, DepartmentCount, DepartmentOfferings, ExtraValue,
    InstructorOfferings, InstructorSummary, Meeting, Offering, Overview, OverviewTotals,
    Requirement, School, SchoolDetail, SchoolOverview,
};
use utoipa::{
    IntoParams, Modify, OpenApi, ToSchema,
    openapi::security::{ApiKey, ApiKeyValue, SecurityScheme},
};

mod auth;
mod forum;
mod ratings;
mod text;

#[derive(OpenApi)]
#[openapi(
    paths(
        schools, terms, departments, search, detail, rankings, overview, school_detail,
        department_detail, instructor,
        auth::register, auth::login, auth::logout, auth::me, auth::update_me, auth::profile,
        ratings::list, ratings::stats, ratings::mine, ratings::put_mine, ratings::delete_mine,
        forum::list, forum::create, forum::detail, forum::reply, forum::update, forum::delete,
        forum::vote,
    ),
    components(schemas(
        School, Offering, Meeting, Requirement, ExtraValue, ErrorBody, CourseRanking, Overview,
        SchoolOverview, OverviewTotals, SchoolDetail, DepartmentCount, DepartmentOfferings,
        InstructorOfferings, InstructorSummary,
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
}

#[derive(Debug, Serialize, ToSchema)]
struct ErrorBody {
    message: &'static str,
}

type ApiError = (StatusCode, Json<ErrorBody>);

fn error(status: StatusCode, message: &'static str) -> ApiError {
    (status, Json(ErrorBody { message }))
}

fn bad_request(message: &'static str) -> ApiError {
    error(StatusCode::BAD_REQUEST, message)
}

/// PostgreSQL text cannot hold NUL, so a filter containing it is a client error, not a 500.
fn ensure_no_nul<'a>(values: impl IntoIterator<Item = Option<&'a str>>) -> Result<(), ApiError> {
    if values
        .into_iter()
        .flatten()
        .any(|value| value.contains('\0'))
    {
        return Err(bad_request("Invalid query"));
    }
    Ok(())
}

/// The trimmed search text. Instructors are indexed as one newline-joined string, so line breaks
/// would let a query match across two names.
fn search_text(raw: Option<&str>) -> Result<&str, ApiError> {
    let query = raw.unwrap_or_default().trim();
    if query.chars().count() > 100 {
        return Err(bad_request("Search must be at most 100 characters"));
    }
    if query.contains(['\0', '\n', '\r']) {
        return Err(bad_request("Invalid query"));
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
        .map_err(|_| bad_request("Invalid query"))
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
        return Err(bad_request("Invalid path"));
    }
    Ok(value)
}

/// `Json` whose rejection is a `{message}` 400 instead of axum's plain-text error.
struct Body<T>(T);

impl<S: Send + Sync, T: DeserializeOwned> FromRequest<S> for Body<T> {
    type Rejection = ApiError;

    async fn from_request(request: Request, state: &S) -> Result<Self, Self::Rejection> {
        Json::<T>::from_request(request, state)
            .await
            .map(|Json(value)| Body(value))
            .map_err(|rejection: JsonRejection| match rejection {
                JsonRejection::MissingJsonContentType(_) => {
                    bad_request("Expected an application/json body")
                }
                _ => bad_request("Invalid request body"),
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
        .route(
            "/api/schools/{school}/departments/{department}",
            get(department_detail),
        )
        .route("/api/instructors/{school}/{name}", get(instructor))
        .route("/api/terms", get(terms))
        .route("/api/departments", get(departments))
        .route("/api/courses", get(search))
        .route("/api/courses/{id}", get(detail))
        .route("/api/rankings/courses", get(rankings))
        .route("/api/stats/overview", get(overview))
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
        .with_state(AppState { pool, config })
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
    let query = search_text(filters.q.as_deref())?;
    ensure_no_nul([
        filters.school.as_deref(),
        filters.term.as_deref(),
        filters.department.as_deref(),
    ])?;
    let filters = catalog::Filters {
        school: filters.school.as_deref().filter(|value| !value.is_empty()),
        term: filters.term.as_deref().filter(|value| !value.is_empty()),
        department: filters
            .department
            .as_deref()
            .filter(|value| !value.is_empty()),
    };
    catalog::search(&pool, query, &filters)
        .await
        .map(Json)
        .map_err(database_error)
}

#[utoipa::path(get, path = "/api/courses/{id}", params(("id" = String, Path, description = "Offering ID")), responses(
    (status = 200, description = "Course offering", body = Offering),
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
        return Err(bad_request("limit must be between 1 and 100"));
    }
    let school = filters.school.as_deref().filter(|value| !value.is_empty());
    catalog::rankings(&pool, school, limit)
        .await
        .map(Json)
        .map_err(database_error)
}

#[utoipa::path(get, path = "/api/stats/overview", responses(
    (status = 200, description = "Per-school and total counts of indexed (active) offerings, courses and terms", body = Overview),
    (status = 500, body = ErrorBody)
))]
async fn overview(State(pool): State<PgPool>) -> Result<Json<Overview>, ApiError> {
    catalog::overview(&pool)
        .await
        .map(Json)
        .map_err(database_error)
}

#[utoipa::path(get, path = "/api/schools/{school}", params(("school" = String, Path, description = "School slug")), responses(
    (status = 200, description = "School with its terms and offering units", body = SchoolDetail),
    (status = 400, body = ErrorBody),
    (status = 404, body = ErrorBody),
    (status = 500, body = ErrorBody)
))]
async fn school_detail(
    State(pool): State<PgPool>,
    school: Result<Path<String>, PathRejection>,
) -> Result<Json<SchoolDetail>, ApiError> {
    let school = path(school, "School not found", |school| vec![school.as_str()])?;
    catalog::school_detail(&pool, &school)
        .await
        .map_err(database_error)?
        .map(Json)
        .ok_or_else(|| error(StatusCode::NOT_FOUND, "School not found"))
}

#[utoipa::path(get, path = "/api/schools/{school}/departments/{department}", params(
    ("school" = String, Path, description = "School slug"),
    ("department" = String, Path, description = "Published offering unit name (exact, URL-encoded)")
), responses(
    (status = 200, description = "Up to 200 active offerings of the unit, newest term first", body = DepartmentOfferings),
    (status = 400, body = ErrorBody),
    (status = 404, body = ErrorBody),
    (status = 500, body = ErrorBody)
))]
async fn department_detail(
    State(pool): State<PgPool>,
    segments: Result<Path<(String, String)>, PathRejection>,
) -> Result<Json<DepartmentOfferings>, ApiError> {
    let (school, department) = path(segments, "Department not found", |(school, department)| {
        vec![school.as_str(), department.as_str()]
    })?;
    catalog::department_offerings(&pool, &school, &department)
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
