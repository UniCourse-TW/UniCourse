//! Forum: top-level posts (announcement, article, question) with flat replies, tags and votes.
//! Titles and content are stored as plain text; rendering is the web's job.

use axum::{
    Json,
    extract::{Path, Query, State, rejection::PathRejection, rejection::QueryRejection},
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use unicourse_catalog::{self as catalog, like_literal};
use utoipa::{IntoParams, ToSchema};

use crate::{
    ApiError, AppState, Body, ErrorBody,
    auth::{CurrentUser, MaybeUser},
    bad_request, database_error, error, query, text,
};

const PAGE_SIZE: i64 = 20;
const MAX_PAGE: i64 = 10_000;
const MAX_REPLIES: i64 = 1000;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize, Serialize, ToSchema, sqlx::Type)]
#[serde(rename_all = "lowercase")]
#[sqlx(type_name = "text", rename_all = "lowercase")]
pub(crate) enum PostType {
    /// Admins only.
    Announcement,
    Article,
    Question,
    /// Only replies have this type; it cannot be created or filtered on directly.
    Reply,
}

#[derive(FromRow, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Author {
    username: String,
    display_name: Option<String>,
}

/// A top-level post in a listing.
#[derive(FromRow, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PostSummary {
    id: i64,
    #[serde(rename = "type")]
    kind: PostType,
    title: String,
    /// First 200 characters of the content.
    excerpt: String,
    #[sqlx(flatten)]
    author: Author,
    school: Option<String>,
    course_code: Option<String>,
    /// Sorted.
    tags: Vec<String>,
    /// Non-deleted replies.
    reply_count: i64,
    /// Sum of votes.
    score: i64,
    created_at: String,
    updated_at: String,
}

#[derive(FromRow, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Reply {
    id: i64,
    content: String,
    #[sqlx(flatten)]
    author: Author,
    score: i64,
    /// The signed-in user's vote: -1, 0 or 1 (0 when anonymous).
    my_vote: i16,
    created_at: String,
    updated_at: String,
}

/// A top-level post with its non-deleted replies, oldest first.
#[derive(FromRow, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PostDetail {
    id: i64,
    #[serde(rename = "type")]
    kind: PostType,
    title: String,
    content: String,
    #[sqlx(flatten)]
    author: Author,
    school: Option<String>,
    course_code: Option<String>,
    tags: Vec<String>,
    reply_count: i64,
    score: i64,
    /// The signed-in user's vote: -1, 0 or 1 (0 when anonymous).
    my_vote: i16,
    created_at: String,
    updated_at: String,
    #[sqlx(skip)]
    replies: Vec<Reply>,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PostPage {
    posts: Vec<PostSummary>,
    page: i64,
    page_size: i64,
    /// Matching posts on all pages.
    total: i64,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub(crate) struct VoteResult {
    score: i64,
    my_vote: i16,
}

#[derive(Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ListFilters {
    /// `announcement`, `article` or `question`.
    #[serde(rename = "type")]
    #[param(rename = "type")]
    kind: Option<PostType>,
    /// School slug (exact).
    school: Option<String>,
    /// Course code (exact); requires `school`.
    course_code: Option<String>,
    /// Case-insensitive substring of the title or content, at most 100 characters.
    q: Option<String>,
    /// Exact tag.
    tag: Option<String>,
    /// 1-based page of 20 posts (default 1).
    page: Option<i64>,
}

/// Columns shared by listings and detail; `$viewer` is the signed-in user ID or NULL.
fn columns(viewer: &str) -> String {
    format!(
        "post.id, post.type AS kind, post.title, author.username, author.display_name,
        post.school, post.course_code,
        coalesce((SELECT array_agg(tag ORDER BY tag) FROM post_tags WHERE post_id = post.id),
            '{{}}') AS tags,
        (SELECT count(*) FROM posts AS reply
            WHERE reply.parent_id = post.id AND reply.deleted_at IS NULL) AS reply_count,
        coalesce((SELECT sum(value) FROM post_votes WHERE post_id = post.id), 0)::bigint AS score,
        coalesce((SELECT value FROM post_votes WHERE post_id = post.id AND user_id = {viewer}),
            0)::smallint AS my_vote,
        unicourse_iso(post.created_at) AS created_at, unicourse_iso(post.updated_at) AS updated_at"
    )
}

const FROM: &str = "FROM posts AS post JOIN users AS author ON author.id = post.author_id";

/// A post that is not deleted and whose thread is not deleted either.
const VISIBLE: &str = "SELECT post.author_id, post.parent_id FROM posts AS post
    LEFT JOIN posts AS parent ON parent.id = post.parent_id
    WHERE post.id = $1 AND post.deleted_at IS NULL AND parent.deleted_at IS NULL";

fn post_id(id: Result<Path<String>, PathRejection>) -> Result<i64, ApiError> {
    id.ok()
        .and_then(|Path(id)| id.parse::<i64>().ok())
        .ok_or_else(post_not_found)
}

fn post_not_found() -> ApiError {
    error(StatusCode::NOT_FOUND, "Post not found")
}

/// `(author_id, parent_id)` of a visible post, or a 404.
async fn visible(pool: &PgPool, id: i64) -> Result<(i64, Option<i64>), ApiError> {
    sqlx::query_as(VISIBLE)
        .bind(id)
        .fetch_optional(pool)
        .await
        .map_err(database_error)?
        .ok_or_else(post_not_found)
}

fn filter_text(value: Option<&str>) -> Result<Option<&str>, ApiError> {
    match value.map(str::trim) {
        None | Some("") => Ok(None),
        Some(value) if value.contains('\0') => Err(bad_request("Invalid query")),
        Some(value) => Ok(Some(value)),
    }
}

#[utoipa::path(get, operation_id = "listPosts", path = "/api/posts", params(ListFilters), responses(
    (status = 200, description = "Top-level posts, newest first, 20 per page", body = PostPage),
    (status = 400, body = ErrorBody),
    (status = 500, body = ErrorBody)
))]
pub(crate) async fn list(
    State(pool): State<PgPool>,
    filters: Result<Query<ListFilters>, QueryRejection>,
) -> Result<Json<PostPage>, ApiError> {
    let filters = query(filters)?;
    if filters.kind == Some(PostType::Reply) {
        return Err(bad_request(
            "type must be announcement, article or question",
        ));
    }
    let page = filters.page.unwrap_or(1);
    if !(1..=MAX_PAGE).contains(&page) {
        return Err(bad_request("page must be between 1 and 10000"));
    }
    let school = filter_text(filters.school.as_deref())?;
    let course_code = filter_text(filters.course_code.as_deref())?;
    if course_code.is_some() && school.is_none() {
        return Err(bad_request("courseCode requires school"));
    }
    let tag = filter_text(filters.tag.as_deref())?;
    let search = filter_text(filters.q.as_deref())?;
    if search.is_some_and(|search| search.chars().count() > 100) {
        return Err(bad_request("Search must be at most 100 characters"));
    }
    let search = search.map(like_literal);

    let conditions = "post.parent_id IS NULL AND post.deleted_at IS NULL
        AND ($1::text IS NULL OR post.type = $1)
        AND ($2::text IS NULL OR post.school = $2)
        AND ($3::text IS NULL OR post.course_code = $3)
        AND ($4::text IS NULL OR lower(post.title) LIKE '%' || lower($4) || '%'
            OR lower(post.content) LIKE '%' || lower($4) || '%')
        AND ($5::text IS NULL OR EXISTS (
            SELECT 1 FROM post_tags WHERE post_id = post.id AND tag = $5))";
    let total: i64 = sqlx::query_scalar(&format!(
        "SELECT count(*) FROM posts AS post WHERE {conditions}"
    ))
    .bind(filters.kind)
    .bind(school)
    .bind(course_code)
    .bind(&search)
    .bind(tag)
    .fetch_one(&pool)
    .await
    .map_err(database_error)?;
    let statement = format!(
        "SELECT {}, left(post.content, 200) AS excerpt {FROM} WHERE {conditions}
         ORDER BY post.created_at DESC, post.id DESC LIMIT $6 OFFSET $7",
        columns("NULL")
    );
    let posts = sqlx::query_as(&statement)
        .bind(filters.kind)
        .bind(school)
        .bind(course_code)
        .bind(&search)
        .bind(tag)
        .bind(PAGE_SIZE)
        .bind((page - 1) * PAGE_SIZE)
        .fetch_all(&pool)
        .await
        .map_err(database_error)?;
    Ok(Json(PostPage {
        posts,
        page,
        page_size: PAGE_SIZE,
        total,
    }))
}

pub(crate) async fn by_author(pool: &PgPool, author_id: i64) -> Result<Vec<PostSummary>, ApiError> {
    let statement = format!(
        "SELECT {}, left(post.content, 200) AS excerpt {FROM}
         WHERE post.author_id = $1 AND post.parent_id IS NULL AND post.deleted_at IS NULL
         ORDER BY post.created_at DESC, post.id DESC LIMIT 50",
        columns("NULL")
    );
    sqlx::query_as(&statement)
        .bind(author_id)
        .fetch_all(pool)
        .await
        .map_err(database_error)
}

async fn load_detail(
    pool: &PgPool,
    id: i64,
    viewer: Option<i64>,
) -> Result<Option<PostDetail>, ApiError> {
    let statement = format!(
        "SELECT {}, post.content {FROM}
         WHERE post.id = $1 AND post.parent_id IS NULL AND post.deleted_at IS NULL",
        columns("$2")
    );
    let Some(mut post): Option<PostDetail> = sqlx::query_as(&statement)
        .bind(id)
        .bind(viewer)
        .fetch_optional(pool)
        .await
        .map_err(database_error)?
    else {
        return Ok(None);
    };
    let statement = format!(
        "SELECT {}, post.content {FROM}
         WHERE post.parent_id = $1 AND post.deleted_at IS NULL
         ORDER BY post.created_at, post.id LIMIT $3",
        columns("$2")
    );
    post.replies = sqlx::query_as(&statement)
        .bind(id)
        .bind(viewer)
        .bind(MAX_REPLIES)
        .fetch_all(pool)
        .await
        .map_err(database_error)?;
    Ok(Some(post))
}

#[utoipa::path(get, operation_id = "getPost", path = "/api/posts/{id}", params(("id" = i64, Path, description = "Post ID")), responses(
    (status = 200, description = "Top-level post with up to 1000 replies, oldest first", body = PostDetail),
    (status = 404, body = ErrorBody),
    (status = 500, body = ErrorBody)
), security((), ("session" = [])))]
pub(crate) async fn detail(
    State(state): State<AppState>,
    MaybeUser(viewer): MaybeUser,
    id: Result<Path<String>, PathRejection>,
) -> Result<Json<PostDetail>, ApiError> {
    let id = post_id(id)?;
    load_detail(&state.pool, id, viewer.map(|viewer| viewer.id))
        .await?
        .map(Json)
        .ok_or_else(post_not_found)
}

#[derive(Deserialize, ToSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct NewPost {
    /// `announcement` (admins only), `article` or `question`.
    #[serde(rename = "type")]
    kind: PostType,
    /// 1-200 characters, single line.
    title: String,
    /// 1-20000 characters of plain text (Markdown source).
    content: String,
    /// School slug.
    #[serde(default)]
    school: Option<String>,
    /// Cross-term course code at `school`.
    #[serde(default)]
    course_code: Option<String>,
    /// Up to 5 tags of 1-30 characters each; duplicates are dropped.
    #[serde(default)]
    tags: Vec<String>,
}

fn content(raw: &str) -> Result<String, ApiError> {
    text::required(raw, 20_000, true)
        .ok_or_else(|| bad_request("Content must be 1-20000 characters of plain text"))
}

fn title(raw: &str) -> Result<String, ApiError> {
    text::required(raw, 200, false)
        .ok_or_else(|| bad_request("Title must be 1-200 characters on one line"))
}

#[utoipa::path(post, operation_id = "createPost", path = "/api/posts", request_body = NewPost, responses(
    (status = 201, description = "Created post", body = PostDetail),
    (status = 400, body = ErrorBody),
    (status = 401, body = ErrorBody),
    (status = 403, description = "Announcements need an admin account", body = ErrorBody),
    (status = 500, body = ErrorBody)
), security(("session" = [])))]
pub(crate) async fn create(
    State(state): State<AppState>,
    CurrentUser(me): CurrentUser,
    Body(input): Body<NewPost>,
) -> Result<(StatusCode, Json<PostDetail>), ApiError> {
    let pool = &state.pool;
    match input.kind {
        PostType::Reply => {
            return Err(bad_request(
                "type must be announcement, article or question",
            ));
        }
        PostType::Announcement if !me.is_admin => {
            return Err(error(
                StatusCode::FORBIDDEN,
                "Only admins can post announcements",
            ));
        }
        _ => {}
    }
    let title = title(&input.title)?;
    let content = content(&input.content)?;
    let school = text::optional(input.school.as_deref(), 64, false)
        .map_err(|()| bad_request("Unknown school"))?;
    let course_code = text::optional(input.course_code.as_deref(), 100, false)
        .map_err(|()| bad_request("Unknown course"))?;
    if input.tags.len() > 5 {
        return Err(bad_request("At most 5 tags"));
    }
    let mut tags = Vec::new();
    for tag in &input.tags {
        let tag = text::required(tag, 30, false)
            .ok_or_else(|| bad_request("Tags must be 1-30 characters on one line"))?;
        if !tags.contains(&tag) {
            tags.push(tag);
        }
    }
    match (&school, &course_code) {
        (None, Some(_)) => return Err(bad_request("courseCode requires school")),
        (Some(school), Some(code)) => {
            if !catalog::course_exists(pool, school, code)
                .await
                .map_err(database_error)?
            {
                return Err(bad_request("Unknown course"));
            }
        }
        (Some(school), None) => {
            let known: bool =
                sqlx::query_scalar("SELECT EXISTS (SELECT 1 FROM schools WHERE slug = $1)")
                    .bind(school)
                    .fetch_one(pool)
                    .await
                    .map_err(database_error)?;
            if !known {
                return Err(bad_request("Unknown school"));
            }
        }
        (None, None) => {}
    }

    let mut transaction = pool.begin().await.map_err(database_error)?;
    let id: i64 = sqlx::query_scalar(
        "INSERT INTO posts (author_id, type, title, content, school, course_code)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
    )
    .bind(me.id)
    .bind(input.kind)
    .bind(&title)
    .bind(&content)
    .bind(&school)
    .bind(&course_code)
    .fetch_one(&mut *transaction)
    .await
    .map_err(database_error)?;
    sqlx::query("INSERT INTO post_tags (post_id, tag) SELECT $1, unnest($2::text[])")
        .bind(id)
        .bind(&tags)
        .execute(&mut *transaction)
        .await
        .map_err(database_error)?;
    transaction.commit().await.map_err(database_error)?;
    let post = load_detail(pool, id, Some(me.id))
        .await?
        .ok_or_else(post_not_found)?;
    Ok((StatusCode::CREATED, Json(post)))
}

#[derive(Deserialize, ToSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct NewReply {
    /// 1-20000 characters of plain text (Markdown source).
    content: String,
}

#[utoipa::path(post, operation_id = "createReply", path = "/api/posts/{id}/replies", params(("id" = i64, Path, description = "Top-level post ID")), request_body = NewReply, responses(
    (status = 201, description = "Created reply", body = Reply),
    (status = 400, body = ErrorBody),
    (status = 401, body = ErrorBody),
    (status = 404, body = ErrorBody),
    (status = 500, body = ErrorBody)
), security(("session" = [])))]
pub(crate) async fn reply(
    State(state): State<AppState>,
    CurrentUser(me): CurrentUser,
    id: Result<Path<String>, PathRejection>,
    Body(input): Body<NewReply>,
) -> Result<(StatusCode, Json<Reply>), ApiError> {
    let pool = &state.pool;
    let id = post_id(id)?;
    let content = content(&input.content)?;
    let (_, parent) = visible(pool, id).await?;
    if parent.is_some() {
        return Err(bad_request("Replies cannot be nested"));
    }
    let reply: i64 = sqlx::query_scalar(
        "INSERT INTO posts (author_id, type, content, parent_id)
         VALUES ($1, 'reply', $2, $3) RETURNING id",
    )
    .bind(me.id)
    .bind(&content)
    .bind(id)
    .fetch_one(pool)
    .await
    .map_err(database_error)?;
    let statement = format!(
        "SELECT {}, post.content {FROM} WHERE post.id = $1",
        columns("$2")
    );
    sqlx::query_as(&statement)
        .bind(reply)
        .bind(me.id)
        .fetch_one(pool)
        .await
        .map(|reply| (StatusCode::CREATED, Json(reply)))
        .map_err(database_error)
}

/// Omitted fields stay unchanged. Replies have no title.
#[derive(Deserialize, ToSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct PostUpdate {
    #[serde(default)]
    title: Option<String>,
    #[serde(default)]
    content: Option<String>,
}

#[utoipa::path(patch, operation_id = "updatePost", path = "/api/posts/{id}", params(("id" = i64, Path, description = "Post or reply ID")), request_body = PostUpdate, responses(
    (status = 204, description = "Updated"),
    (status = 400, body = ErrorBody),
    (status = 401, body = ErrorBody),
    (status = 403, description = "Not the author", body = ErrorBody),
    (status = 404, body = ErrorBody),
    (status = 500, body = ErrorBody)
), security(("session" = [])))]
pub(crate) async fn update(
    State(state): State<AppState>,
    CurrentUser(me): CurrentUser,
    id: Result<Path<String>, PathRejection>,
    Body(input): Body<PostUpdate>,
) -> Result<StatusCode, ApiError> {
    let pool = &state.pool;
    let id = post_id(id)?;
    let new_title = input.title.as_deref().map(title).transpose()?;
    let new_content = input.content.as_deref().map(content).transpose()?;
    if new_title.is_none() && new_content.is_none() {
        return Err(bad_request("Nothing to update"));
    }
    let (author, parent) = visible(pool, id).await?;
    if author != me.id {
        return Err(error(StatusCode::FORBIDDEN, "Only the author can edit"));
    }
    if parent.is_some() && new_title.is_some() {
        return Err(bad_request("Replies have no title"));
    }
    sqlx::query(
        "UPDATE posts SET title = coalesce($2, title), content = coalesce($3, content),
             updated_at = now()
         WHERE id = $1",
    )
    .bind(id)
    .bind(&new_title)
    .bind(&new_content)
    .execute(pool)
    .await
    .map_err(database_error)?;
    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(delete, operation_id = "deletePost", path = "/api/posts/{id}", params(("id" = i64, Path, description = "Post or reply ID")), responses(
    (status = 204, description = "Soft-deleted; a deleted top-level post hides its whole thread"),
    (status = 401, body = ErrorBody),
    (status = 403, description = "Neither the author nor an admin", body = ErrorBody),
    (status = 404, body = ErrorBody),
    (status = 500, body = ErrorBody)
), security(("session" = [])))]
pub(crate) async fn delete(
    State(state): State<AppState>,
    CurrentUser(me): CurrentUser,
    id: Result<Path<String>, PathRejection>,
) -> Result<StatusCode, ApiError> {
    let pool = &state.pool;
    let id = post_id(id)?;
    let (author, _) = visible(pool, id).await?;
    if author != me.id && !me.is_admin {
        return Err(error(
            StatusCode::FORBIDDEN,
            "Only the author or an admin can delete",
        ));
    }
    sqlx::query("UPDATE posts SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL")
        .bind(id)
        .execute(pool)
        .await
        .map_err(database_error)?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Deserialize, ToSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct VoteInput {
    /// -1 (down), 0 (remove) or 1 (up).
    #[schema(minimum = -1, maximum = 1)]
    value: i64,
}

#[utoipa::path(put, operation_id = "votePost", path = "/api/posts/{id}/vote", params(("id" = i64, Path, description = "Post or reply ID")), request_body = VoteInput, responses(
    (status = 200, description = "The post's new score and the caller's vote", body = VoteResult),
    (status = 400, body = ErrorBody),
    (status = 401, body = ErrorBody),
    (status = 404, body = ErrorBody),
    (status = 500, body = ErrorBody)
), security(("session" = [])))]
pub(crate) async fn vote(
    State(state): State<AppState>,
    CurrentUser(me): CurrentUser,
    id: Result<Path<String>, PathRejection>,
    Body(input): Body<VoteInput>,
) -> Result<Json<VoteResult>, ApiError> {
    let pool = &state.pool;
    let id = post_id(id)?;
    let value = i16::try_from(input.value)
        .ok()
        .filter(|value| (-1..=1).contains(value))
        .ok_or_else(|| bad_request("Vote must be -1, 0 or 1"))?;
    visible(pool, id).await?;
    if value == 0 {
        sqlx::query("DELETE FROM post_votes WHERE post_id = $1 AND user_id = $2")
            .bind(id)
            .bind(me.id)
            .execute(pool)
            .await
    } else {
        sqlx::query(
            "INSERT INTO post_votes (post_id, user_id, value) VALUES ($1, $2, $3)
             ON CONFLICT (post_id, user_id) DO UPDATE SET value = EXCLUDED.value",
        )
        .bind(id)
        .bind(me.id)
        .bind(value)
        .execute(pool)
        .await
    }
    .map_err(database_error)?;
    let score: i64 = sqlx::query_scalar(
        "SELECT coalesce(sum(value), 0)::bigint FROM post_votes WHERE post_id = $1",
    )
    .bind(id)
    .fetch_one(pool)
    .await
    .map_err(database_error)?;
    Ok(Json(VoteResult {
        score,
        my_vote: value,
    }))
}
