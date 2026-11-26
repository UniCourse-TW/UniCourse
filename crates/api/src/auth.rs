//! Accounts and cookie sessions. Sessions live in PostgreSQL so any API replica can serve them.
//!
//! The `uc_session` cookie carries 32 random bytes (base64url, no padding); the `sessions` table
//! stores only their SHA-256. Login failures are limited to 10 per username per minute, counted in
//! the `login_attempts` table so the limit holds across restarts and replicas.

use std::sync::LazyLock;

use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier, password_hash::SaltString};
use axum::{
    Json,
    extract::{FromRequestParts, Path, State, rejection::PathRejection},
    http::{HeaderMap, StatusCode, header, request::Parts},
};
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use rand::{RngCore, rngs::OsRng};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::{FromRow, PgPool};
use utoipa::ToSchema;

use crate::{
    ApiError, AppState, Body, ErrorBody, ErrorCode, bad_request, coded_error, database_error,
    error, forum, path, ratings, text,
};

pub(crate) const COOKIE: &str = "uc_session";
const SESSION_SECONDS: i64 = 30 * 24 * 60 * 60;
const LOGIN_ATTEMPTS_PER_MINUTE: i64 = 10;

/// The signed-in account, as returned by `/api/auth/me`.
#[derive(Clone, Debug, FromRow, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Me {
    #[serde(skip)]
    pub id: i64,
    /// Lower-case, 3-32 characters of `[a-z0-9_]`.
    pub username: String,
    pub display_name: Option<String>,
    pub bio: Option<String>,
    /// School slug.
    pub school: Option<String>,
    /// Admins may post announcements and delete any post.
    pub is_admin: bool,
    pub created_at: String,
}

const ME: &str = "SELECT account.id, account.username, account.display_name, account.bio,
    account.school, account.is_admin, unicourse_iso(account.created_at) AS created_at
    FROM users AS account";

/// The session's account, or a 401.
pub(crate) struct CurrentUser(pub Me);

/// The session's account, if any.
pub(crate) struct MaybeUser(pub Option<Me>);

fn session_id(headers: &HeaderMap) -> Option<Vec<u8>> {
    headers
        .get_all(header::COOKIE)
        .iter()
        .filter_map(|value| value.to_str().ok())
        .flat_map(|value| value.split(';'))
        .filter_map(|pair| pair.trim().split_once('='))
        .find(|(name, _)| *name == COOKIE)
        .and_then(|(_, value)| URL_SAFE_NO_PAD.decode(value).ok())
        .filter(|token| token.len() == 32)
        .map(|token| Sha256::digest(token).to_vec())
}

impl FromRequestParts<AppState> for MaybeUser {
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, ApiError> {
        let Some(id) = session_id(&parts.headers) else {
            return Ok(Self(None));
        };
        let statement = format!(
            "{ME} JOIN sessions AS session ON session.user_id = account.id
             WHERE session.id = $1 AND session.expires_at > now()"
        );
        sqlx::query_as(&statement)
            .bind(id)
            .fetch_optional(&state.pool)
            .await
            .map(Self)
            .map_err(database_error)
    }
}

impl FromRequestParts<AppState> for CurrentUser {
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, ApiError> {
        MaybeUser::from_request_parts(parts, state)
            .await?
            .0
            .map(Self)
            .ok_or_else(|| error(StatusCode::UNAUTHORIZED, "Sign in required"))
    }
}

fn session_cookie(token: &str, max_age: i64, secure: bool) -> String {
    let secure = if secure { "; Secure" } else { "" };
    format!("{COOKIE}={token}; HttpOnly; SameSite=Lax; Path=/; Max-Age={max_age}{secure}")
}

type SetCookie = [(header::HeaderName, String); 1];

async fn start_session(state: &AppState, user_id: i64) -> Result<SetCookie, ApiError> {
    let mut token = [0u8; 32];
    OsRng.fill_bytes(&mut token);
    sqlx::query("DELETE FROM sessions WHERE user_id = $1 AND expires_at <= now()")
        .bind(user_id)
        .execute(&state.pool)
        .await
        .map_err(database_error)?;
    sqlx::query(
        "INSERT INTO sessions (id, user_id, expires_at)
         VALUES ($1, $2, now() + make_interval(secs => $3))",
    )
    .bind(Sha256::digest(token).as_slice())
    .bind(user_id)
    .bind(SESSION_SECONDS as f64)
    .execute(&state.pool)
    .await
    .map_err(database_error)?;
    let token = URL_SAFE_NO_PAD.encode(token);
    Ok([(
        header::SET_COOKIE,
        session_cookie(&token, SESSION_SECONDS, state.config.cookie_secure),
    )])
}

fn internal(cause: impl std::fmt::Display) -> ApiError {
    eprintln!("password hashing failed: {cause}");
    error(StatusCode::INTERNAL_SERVER_ERROR, "Internal error")
}

/// Argon2id with the crate defaults (19 MiB, 2 passes), off the async runtime.
async fn hash_password(password: String) -> Result<String, ApiError> {
    tokio::task::spawn_blocking(move || {
        let salt = SaltString::generate(&mut OsRng);
        Argon2::default()
            .hash_password(password.as_bytes(), &salt)
            .map(|hash| hash.to_string())
    })
    .await
    .map_err(internal)?
    .map_err(internal)
}

/// Verified against a throwaway hash when the account does not exist, so response time does not
/// reveal which usernames are registered.
static DUMMY_HASH: LazyLock<String> = LazyLock::new(|| {
    Argon2::default()
        .hash_password(
            b"unicourse-dummy-password",
            &SaltString::generate(&mut OsRng),
        )
        .expect("argon2 accepts the default parameters")
        .to_string()
});

async fn verify_password(password: String, hash: Option<String>) -> Result<bool, ApiError> {
    tokio::task::spawn_blocking(move || {
        let known = hash.is_some();
        let hash = hash.unwrap_or_else(|| DUMMY_HASH.clone());
        let matches = PasswordHash::new(&hash).is_ok_and(|parsed| {
            Argon2::default()
                .verify_password(password.as_bytes(), &parsed)
                .is_ok()
        });
        known && matches
    })
    .await
    .map_err(internal)
}

/// Usernames are case-insensitive: they are lower-cased before validation and storage.
fn normalize_username(raw: &str) -> Option<String> {
    let username = raw.to_ascii_lowercase();
    ((3..=32).contains(&username.len())
        && username
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'_'))
    .then_some(username)
}

fn valid_password(password: &str) -> bool {
    (8..=128).contains(&password.chars().count())
}

#[derive(Deserialize, ToSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct RegisterRequest {
    /// 3-32 characters of `[a-z0-9_]`; upper-case letters are lower-cased.
    username: String,
    /// 8-128 characters.
    password: String,
    /// 1-50 characters, single line; empty means none.
    #[serde(default)]
    display_name: Option<String>,
}

#[derive(Deserialize, ToSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct LoginRequest {
    username: String,
    password: String,
}

#[utoipa::path(post, operation_id = "register", path = "/api/auth/register", request_body = RegisterRequest, responses(
    (status = 201, description = "Account created and signed in (sets the uc_session cookie)", body = Me),
    (status = 400, body = ErrorBody),
    (status = 409, description = "Username taken", body = ErrorBody),
    (status = 500, body = ErrorBody)
))]
pub(crate) async fn register(
    State(state): State<AppState>,
    Body(input): Body<RegisterRequest>,
) -> Result<(StatusCode, SetCookie, Json<Me>), ApiError> {
    let username = normalize_username(&input.username).ok_or_else(|| {
        bad_request("Username must be 3-32 characters of a-z, 0-9 and underscore")
    })?;
    if !valid_password(&input.password) {
        return Err(bad_request("Password must be 8-128 characters"));
    }
    let display_name = text::optional(input.display_name.as_deref(), 50, false)
        .map_err(|()| bad_request("Display name must be 1-50 characters on one line"))?;
    let password_hash = hash_password(input.password).await?;
    let statement = format!(
        "WITH account AS (
             INSERT INTO users (username, display_name, password_hash) VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING RETURNING *
         ) {}",
        ME.replace("FROM users AS account", "FROM account")
    );
    let me: Me = sqlx::query_as(&statement)
        .bind(&username)
        .bind(&display_name)
        .bind(&password_hash)
        .fetch_optional(&state.pool)
        .await
        .map_err(database_error)?
        .ok_or_else(|| error(StatusCode::CONFLICT, "Username is taken"))?;
    let cookie = start_session(&state, me.id).await?;
    Ok((StatusCode::CREATED, cookie, Json(me)))
}

#[utoipa::path(post, operation_id = "login", path = "/api/auth/login", request_body = LoginRequest, responses(
    (status = 200, description = "Signed in (sets the uc_session cookie)", body = Me),
    (status = 400, body = ErrorBody),
    (status = 401, description = "Wrong username or password", body = ErrorBody),
    (status = 429, description = "More than 10 failed attempts for this username in the last minute", body = ErrorBody),
    (status = 500, body = ErrorBody)
))]
pub(crate) async fn login(
    State(state): State<AppState>,
    Body(input): Body<LoginRequest>,
) -> Result<(SetCookie, Json<Me>), ApiError> {
    let pool = &state.pool;
    // A malformed username or password cannot belong to an account, so it skips the database
    // (it may contain NUL) but still pays for a hash like any other failure.
    let username = normalize_username(&input.username).filter(|_| valid_password(&input.password));
    if let Some(username) = &username {
        let recent: i64 = sqlx::query_scalar(
            "SELECT count(*) FROM login_attempts
             WHERE username = $1 AND attempted_at > now() - interval '1 minute'",
        )
        .bind(username)
        .fetch_one(pool)
        .await
        .map_err(database_error)?;
        if recent >= LOGIN_ATTEMPTS_PER_MINUTE {
            return Err(error(
                StatusCode::TOO_MANY_REQUESTS,
                "Too many failed sign-in attempts; try again in a minute",
            ));
        }
    }
    let account: Option<(i64, String)> = match &username {
        Some(username) => {
            sqlx::query_as("SELECT id, password_hash FROM users WHERE lower(username) = $1")
                .bind(username)
                .fetch_optional(pool)
                .await
                .map_err(database_error)?
        }
        None => None,
    };
    let (id, hash) = account.unzip();
    if !verify_password(input.password, hash).await? {
        if let Some(username) = &username {
            sqlx::query(
                "WITH expired AS (
                     DELETE FROM login_attempts WHERE attempted_at < now() - interval '10 minutes'
                 ) INSERT INTO login_attempts (username) VALUES ($1)",
            )
            .bind(username)
            .execute(pool)
            .await
            .map_err(database_error)?;
        }
        return Err(coded_error(
            StatusCode::UNAUTHORIZED,
            ErrorCode::InvalidCredentials,
            "Wrong username or password",
        ));
    }
    let (Some(id), Some(username)) = (id, username) else {
        unreachable!("verify_password only succeeds for an existing account");
    };
    sqlx::query("DELETE FROM login_attempts WHERE username = $1")
        .bind(&username)
        .execute(pool)
        .await
        .map_err(database_error)?;
    let cookie = start_session(&state, id).await?;
    let me = load_me(pool, id).await?;
    Ok((cookie, Json(me)))
}

async fn load_me(pool: &PgPool, id: i64) -> Result<Me, ApiError> {
    sqlx::query_as(&format!("{ME} WHERE account.id = $1"))
        .bind(id)
        .fetch_one(pool)
        .await
        .map_err(database_error)
}

#[utoipa::path(post, operation_id = "logout", path = "/api/auth/logout", responses(
    (status = 204, description = "Session ended and cookie cleared (also when not signed in)"),
    (status = 500, body = ErrorBody)
), security((), ("session" = [])))]
pub(crate) async fn logout(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<(StatusCode, SetCookie), ApiError> {
    if let Some(id) = session_id(&headers) {
        sqlx::query("DELETE FROM sessions WHERE id = $1")
            .bind(id)
            .execute(&state.pool)
            .await
            .map_err(database_error)?;
    }
    Ok((
        StatusCode::NO_CONTENT,
        [(
            header::SET_COOKIE,
            session_cookie("", 0, state.config.cookie_secure),
        )],
    ))
}

#[utoipa::path(get, operation_id = "getMe", path = "/api/auth/me", responses(
    (status = 200, description = "The signed-in account", body = Me),
    (status = 401, body = ErrorBody),
    (status = 500, body = ErrorBody)
), security(("session" = [])))]
pub(crate) async fn me(CurrentUser(me): CurrentUser) -> Json<Me> {
    Json(me)
}

/// Omitted fields stay unchanged; `null` or an empty string clears a field.
#[derive(Deserialize, ToSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ProfileUpdate {
    /// 1-50 characters, single line.
    #[serde(default, deserialize_with = "text::patch")]
    #[schema(value_type = Option<String>)]
    display_name: Option<Option<String>>,
    /// Up to 500 characters; line breaks allowed.
    #[serde(default, deserialize_with = "text::patch")]
    #[schema(value_type = Option<String>)]
    bio: Option<Option<String>>,
    /// School slug from `/api/schools`.
    #[serde(default, deserialize_with = "text::patch")]
    #[schema(value_type = Option<String>)]
    school: Option<Option<String>>,
}

#[utoipa::path(patch, operation_id = "updateMe", path = "/api/auth/me", request_body = ProfileUpdate, responses(
    (status = 200, description = "The updated account", body = Me),
    (status = 400, body = ErrorBody),
    (status = 401, body = ErrorBody),
    (status = 500, body = ErrorBody)
), security(("session" = [])))]
pub(crate) async fn update_me(
    State(state): State<AppState>,
    CurrentUser(me): CurrentUser,
    Body(input): Body<ProfileUpdate>,
) -> Result<Json<Me>, ApiError> {
    let display_name = match input.display_name {
        None => me.display_name,
        Some(value) => text::optional(value.as_deref(), 50, false)
            .map_err(|()| bad_request("Display name must be 1-50 characters on one line"))?,
    };
    let bio = match input.bio {
        None => me.bio,
        Some(value) => text::optional(value.as_deref(), 500, true)
            .map_err(|()| bad_request("Bio must be at most 500 characters"))?,
    };
    let school = match input.school {
        None => me.school,
        Some(value) => {
            let school = text::optional(value.as_deref(), 64, false)
                .map_err(|()| bad_request("Unknown school"))?;
            if let Some(slug) = &school {
                let known: bool =
                    sqlx::query_scalar("SELECT EXISTS (SELECT 1 FROM schools WHERE slug = $1)")
                        .bind(slug)
                        .fetch_one(&state.pool)
                        .await
                        .map_err(database_error)?;
                if !known {
                    return Err(bad_request("Unknown school"));
                }
            }
            school
        }
    };
    sqlx::query("UPDATE users SET display_name = $2, bio = $3, school = $4 WHERE id = $1")
        .bind(me.id)
        .bind(&display_name)
        .bind(&bio)
        .bind(&school)
        .execute(&state.pool)
        .await
        .map_err(database_error)?;
    load_me(&state.pool, me.id).await.map(Json)
}

/// Anyone's public page: profile fields, ratings and non-deleted top-level posts.
#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PublicProfile {
    username: String,
    display_name: Option<String>,
    bio: Option<String>,
    school: Option<String>,
    created_at: String,
    /// Up to 100 ratings, most recently updated first.
    ratings: Vec<ratings::UserRating>,
    /// Up to 50 top-level posts, newest first.
    posts: Vec<forum::PostSummary>,
}

#[utoipa::path(get, operation_id = "getUserProfile", path = "/api/users/{username}", params(("username" = String, Path, description = "Username (case-insensitive)")), responses(
    (status = 200, description = "Public profile", body = PublicProfile),
    (status = 404, body = ErrorBody),
    (status = 500, body = ErrorBody)
))]
pub(crate) async fn profile(
    State(pool): State<PgPool>,
    username: Result<Path<String>, PathRejection>,
) -> Result<Json<PublicProfile>, ApiError> {
    let not_found = || error(StatusCode::NOT_FOUND, "User not found");
    let username = path(username, "User not found", |_| vec![])?;
    let username = normalize_username(&username).ok_or_else(not_found)?;
    let account: Me = sqlx::query_as(&format!("{ME} WHERE lower(account.username) = $1"))
        .bind(&username)
        .fetch_optional(&pool)
        .await
        .map_err(database_error)?
        .ok_or_else(not_found)?;
    let ratings = ratings::by_user(&pool, account.id).await?;
    let posts = forum::by_author(&pool, account.id).await?;
    Ok(Json(PublicProfile {
        username: account.username,
        display_name: account.display_name,
        bio: account.bio,
        school: account.school,
        created_at: account.created_at,
        ratings,
        posts,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::HeaderValue;

    #[test]
    fn usernames_are_lower_cased_and_restricted() {
        assert_eq!(normalize_username("Alice_01").as_deref(), Some("alice_01"));
        for bad in ["ab", &"a".repeat(33), "a-b", "名字abc", "abc ", "a\0bc"] {
            assert_eq!(normalize_username(bad), None, "{bad:?}");
        }
        assert!(valid_password("12345678") && !valid_password("1234567"));
        assert!(valid_password(&"密".repeat(128)) && !valid_password(&"a".repeat(129)));
    }

    #[test]
    fn session_cookie_is_parsed_and_hashed() {
        let token = URL_SAFE_NO_PAD.encode([7u8; 32]);
        let mut headers = HeaderMap::new();
        headers.append(header::COOKIE, HeaderValue::from_static("theme=dark"));
        headers.append(
            header::COOKIE,
            HeaderValue::from_str(&format!("a=b; {COOKIE}={token}")).unwrap(),
        );
        assert_eq!(
            session_id(&headers),
            Some(Sha256::digest([7u8; 32]).to_vec())
        );
        let mut short = HeaderMap::new();
        short.insert(
            header::COOKIE,
            HeaderValue::from_str(&format!("{COOKIE}=abc")).unwrap(),
        );
        assert_eq!(session_id(&short), None);
        assert_eq!(
            session_cookie("t", 60, true),
            "uc_session=t; HttpOnly; SameSite=Lax; Path=/; Max-Age=60; Secure"
        );
    }
}
