//! Router tests against a real database (`sqlx::test` creates one per test).

use axum::{
    Router,
    body::{Body, to_bytes},
    http::{Request, StatusCode, header},
};
use serde_json::{Value, json};
use sqlx::PgPool;
use tower::ServiceExt;
use unicourse_catalog::MIGRATOR;
use unicourse_ingest::{import, parse_snapshot};

const NTNU: &[u8] = include_bytes!("../../../fixtures/ntnu-115-1.json");
const NYCU: &[u8] = include_bytes!("../../../fixtures/nycu-115-1.json");
const NTHU: &[u8] = include_bytes!("../../../fixtures/nthu-115-1.json");
const NTHU_OLDER: &[u8] = include_bytes!("../../../fixtures/nthu-114-2.json");
const NTHU_DEPARTMENT: &str =
    "/api/schools/nthu/departments/%E7%A4%BA%E7%AF%84%E6%95%B8%E5%AD%B8%E7%B3%BB";

async fn seed(pool: &PgPool) {
    for fixture in [NTNU, NYCU, NTHU, NTHU_OLDER] {
        import(pool, &parse_snapshot(fixture).unwrap())
            .await
            .unwrap();
    }
}

async fn import_offerings(pool: &PgPool, base: &[u8], offerings: Vec<Value>) {
    let mut snapshot: Value = serde_json::from_slice(base).unwrap();
    snapshot["offerings"] = json!(offerings);
    import(
        pool,
        &parse_snapshot(&serde_json::to_vec(&snapshot).unwrap()).unwrap(),
    )
    .await
    .unwrap();
}

fn synthetic_offering(code: &str, title: &str, enrolled: i32) -> Value {
    json!({
        "sourceId": code, "courseCode": code, "title": title, "enrolled": enrolled,
        "instructors": [], "sourceUrl": "https://www.nthu.edu.tw/"
    })
}

struct Response {
    status: StatusCode,
    cookie: Option<String>,
    body: Value,
}

async fn call(
    app: &Router,
    method: &str,
    uri: &str,
    cookie: Option<&str>,
    body: Option<Value>,
) -> Response {
    let mut request = Request::builder().method(method).uri(uri);
    if let Some(cookie) = cookie {
        request = request.header(header::COOKIE, cookie);
    }
    let request = match body {
        Some(body) => request
            .header(header::CONTENT_TYPE, "application/json")
            .body(Body::from(body.to_string())),
        None => request.body(Body::empty()),
    }
    .unwrap();
    let response = app.clone().oneshot(request).await.unwrap();
    let status = response.status();
    let cookie = response
        .headers()
        .get(header::SET_COOKIE)
        .map(|value| value.to_str().unwrap().to_owned());
    let bytes = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let body = if bytes.is_empty() {
        assert_eq!(status, StatusCode::NO_CONTENT);
        Value::Null
    } else {
        serde_json::from_slice(&bytes).unwrap()
    };
    Response {
        status,
        cookie,
        body,
    }
}

/// `uc_session=...` from a Set-Cookie header, ready for a Cookie header.
fn session(set_cookie: &str) -> String {
    set_cookie.split(';').next().unwrap().to_owned()
}

async fn register(app: &Router, username: &str) -> String {
    let response = call(
        app,
        "POST",
        "/api/auth/register",
        None,
        Some(json!({ "username": username, "password": "correct horse" })),
    )
    .await;
    assert_eq!(response.status, StatusCode::CREATED, "{}", response.body);
    session(&response.cookie.unwrap())
}

#[sqlx::test(migrator = "MIGRATOR")]
async fn register_login_me_logout(pool: PgPool) {
    seed(&pool).await;
    let app = unicourse_api::router(pool.clone());

    let created = call(
        &app,
        "POST",
        "/api/auth/register",
        None,
        Some(json!({ "username": "Alice_1", "password": "correct horse", "displayName": " 愛麗絲 " })),
    )
    .await;
    assert_eq!(created.status, StatusCode::CREATED);
    assert_eq!(created.body["username"], "alice_1");
    assert_eq!(created.body["displayName"], "愛麗絲");
    assert_eq!(created.body["isAdmin"], false);
    assert!(created.body.get("id").is_none() && created.body.get("passwordHash").is_none());
    let set_cookie = created.cookie.unwrap();
    assert!(set_cookie.starts_with("uc_session="));
    for attribute in ["HttpOnly", "SameSite=Lax", "Path=/", "Max-Age=2592000"] {
        assert!(set_cookie.contains(attribute), "{set_cookie}");
    }
    assert!(!set_cookie.contains("Secure"));
    let cookie = session(&set_cookie);

    // Usernames are case-insensitively unique.
    let taken = call(
        &app,
        "POST",
        "/api/auth/register",
        None,
        Some(json!({ "username": "ALICE_1", "password": "another password" })),
    )
    .await;
    assert_eq!(taken.status, StatusCode::CONFLICT);
    assert_eq!(taken.body["code"], "username_taken");
    assert_eq!(taken.body["message"], "Username is taken");

    for body in [
        json!({ "username": "ab", "password": "correct horse" }),
        json!({ "username": "bob!", "password": "correct horse" }),
        json!({ "username": "bob", "password": "short" }),
        json!({ "username": "bob", "password": "x".repeat(129) }),
        json!({ "username": "bob", "password": "correct horse", "displayName": "a\u{0}b" }),
        json!({ "username": "bob", "password": "correct horse", "displayName": "x".repeat(51) }),
        json!({ "username": "bob", "password": "correct horse", "extra": 1 }),
        json!({ "username": "bob" }),
    ] {
        let response = call(&app, "POST", "/api/auth/register", None, Some(body.clone())).await;
        assert_eq!(response.status, StatusCode::BAD_REQUEST, "{body}");
        assert!(response.body["message"].is_string());
    }

    let me = call(&app, "GET", "/api/auth/me", Some(&cookie), None).await;
    assert_eq!(me.status, StatusCode::OK);
    assert_eq!(me.body["username"], "alice_1");
    let anonymous = call(&app, "GET", "/api/auth/me", None, None).await;
    assert_eq!(anonymous.status, StatusCode::UNAUTHORIZED);
    assert_eq!(anonymous.body["code"], "unauthorized");
    let forged = call(
        &app,
        "GET",
        "/api/auth/me",
        Some("uc_session=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"),
        None,
    )
    .await;
    assert_eq!(forged.status, StatusCode::UNAUTHORIZED);

    let updated = call(
        &app,
        "PATCH",
        "/api/auth/me",
        Some(&cookie),
        Some(json!({ "bio": "資工系\n大三", "school": "nthu" })),
    )
    .await;
    assert_eq!(updated.status, StatusCode::OK);
    assert_eq!(updated.body["bio"], "資工系\n大三");
    assert_eq!(updated.body["school"], "nthu");
    assert_eq!(updated.body["displayName"], "愛麗絲");
    let cleared = call(
        &app,
        "PATCH",
        "/api/auth/me",
        Some(&cookie),
        Some(json!({ "displayName": null, "school": "" })),
    )
    .await;
    assert_eq!(cleared.body["displayName"], Value::Null);
    assert_eq!(cleared.body["school"], Value::Null);
    assert_eq!(cleared.body["bio"], "資工系\n大三");
    for body in [
        json!({ "school": "nowhere" }),
        json!({ "bio": "x".repeat(501) }),
        json!({ "bio": "a\u{0}" }),
    ] {
        let response = call(
            &app,
            "PATCH",
            "/api/auth/me",
            Some(&cookie),
            Some(body.clone()),
        )
        .await;
        assert_eq!(response.status, StatusCode::BAD_REQUEST, "{body}");
    }

    let wrong = call(
        &app,
        "POST",
        "/api/auth/login",
        None,
        Some(json!({ "username": "alice_1", "password": "wrong password" })),
    )
    .await;
    assert_eq!(wrong.status, StatusCode::UNAUTHORIZED);
    let unknown = call(
        &app,
        "POST",
        "/api/auth/login",
        None,
        Some(json!({ "username": "nobody\u{0}", "password": "correct horse" })),
    )
    .await;
    assert_eq!(unknown.status, StatusCode::UNAUTHORIZED);
    let login = call(
        &app,
        "POST",
        "/api/auth/login",
        None,
        Some(json!({ "username": "ALICE_1", "password": "correct horse" })),
    )
    .await;
    assert_eq!(login.status, StatusCode::OK);
    assert_eq!(login.body["username"], "alice_1");
    let second = session(&login.cookie.unwrap());
    assert_ne!(second, cookie);

    let logout = call(&app, "POST", "/api/auth/logout", Some(&cookie), None).await;
    assert_eq!(logout.status, StatusCode::NO_CONTENT);
    assert!(logout.cookie.unwrap().contains("Max-Age=0"));
    let gone = call(&app, "GET", "/api/auth/me", Some(&cookie), None).await;
    assert_eq!(gone.status, StatusCode::UNAUTHORIZED);
    let still = call(&app, "GET", "/api/auth/me", Some(&second), None).await;
    assert_eq!(still.status, StatusCode::OK);

    // Expired sessions are rejected.
    sqlx::query("UPDATE sessions SET expires_at = now() - interval '1 second'")
        .execute(&pool)
        .await
        .unwrap();
    let expired = call(&app, "GET", "/api/auth/me", Some(&second), None).await;
    assert_eq!(expired.status, StatusCode::UNAUTHORIZED);
}

#[sqlx::test(migrator = "MIGRATOR")]
async fn login_failures_are_rate_limited(pool: PgPool) {
    let app = unicourse_api::router(pool.clone());
    register(&app, "carol").await;
    sqlx::query("INSERT INTO login_attempts (username) SELECT 'carol' FROM generate_series(1, 10)")
        .execute(&pool)
        .await
        .unwrap();
    let limited = call(
        &app,
        "POST",
        "/api/auth/login",
        None,
        Some(json!({ "username": "carol", "password": "correct horse" })),
    )
    .await;
    assert_eq!(limited.status, StatusCode::TOO_MANY_REQUESTS);
    assert_eq!(limited.body["code"], "rate_limited");
    sqlx::query("UPDATE login_attempts SET attempted_at = now() - interval '2 minutes'")
        .execute(&pool)
        .await
        .unwrap();
    let allowed = call(
        &app,
        "POST",
        "/api/auth/login",
        None,
        Some(json!({ "username": "carol", "password": "correct horse" })),
    )
    .await;
    assert_eq!(allowed.status, StatusCode::OK);

    let secure = unicourse_api::router_with(
        pool,
        unicourse_api::Config {
            cookie_secure: true,
        },
    );
    let login = call(
        &secure,
        "POST",
        "/api/auth/login",
        None,
        Some(json!({ "username": "carol", "password": "correct horse" })),
    )
    .await;
    assert!(login.cookie.unwrap().ends_with("; Secure"));
}

#[sqlx::test(migrator = "MIGRATOR")]
async fn ratings_upsert_and_stats(pool: PgPool) {
    seed(&pool).await;
    let app = unicourse_api::router(pool.clone());
    let alice = register(&app, "alice").await;
    let bob = register(&app, "bob").await;
    let base = "/api/courses/nthu/DEMO201/ratings";

    let empty = call(&app, "GET", &format!("{base}/stats"), None, None).await;
    assert_eq!(empty.status, StatusCode::OK);
    assert_eq!(
        empty.body,
        json!({ "count": 0, "average": null, "histogram": [0, 0, 0, 0, 0] })
    );
    assert_eq!(
        call(&app, "GET", &format!("{base}/me"), None, None)
            .await
            .status,
        StatusCode::UNAUTHORIZED
    );
    let unrated = call(&app, "GET", &format!("{base}/me"), Some(&alice), None).await;
    assert_eq!(unrated.status, StatusCode::OK);
    assert_eq!(unrated.body, Value::Null);

    let put = |cookie: String, body: Value| {
        let app = app.clone();
        async move {
            call(
                &app,
                "PUT",
                &format!("{base}/me"),
                Some(&cookie),
                Some(body),
            )
            .await
        }
    };
    let first = put(alice.clone(), json!({ "score": 3, "review": "  還不錯 " })).await;
    assert_eq!(first.status, StatusCode::OK);
    assert_eq!(first.body["score"], 3);
    assert_eq!(first.body["review"], "還不錯");
    let replaced = put(alice.clone(), json!({ "score": 5 })).await;
    assert_eq!(replaced.body["score"], 5);
    assert_eq!(replaced.body["review"], Value::Null);
    assert_eq!(replaced.body["createdAt"], first.body["createdAt"]);
    put(
        bob.clone(),
        json!({ "score": 2, "review": "作業很多\n但有收穫" }),
    )
    .await;

    let stats = call(&app, "GET", &format!("{base}/stats"), None, None).await;
    assert_eq!(
        stats.body,
        json!({ "count": 2, "average": 3.5, "histogram": [0, 1, 0, 0, 1] })
    );
    let list = call(&app, "GET", base, None, None).await;
    let list = list.body.as_array().unwrap();
    assert_eq!(list.len(), 2);
    assert_eq!(list[0]["username"], "bob");
    assert_eq!(list[1]["username"], "alice");
    let mine = call(&app, "GET", &format!("{base}/me"), Some(&alice), None).await;
    assert_eq!(mine.body["score"], 5);

    for body in [
        json!({ "score": 0 }),
        json!({ "score": 6 }),
        json!({ "score": 2.5 }),
        json!({ "score": "5" }),
        json!({ "score": 4, "review": "x".repeat(2001) }),
        json!({ "score": 4, "review": "a\u{0}b" }),
        json!({}),
    ] {
        assert_eq!(
            put(alice.clone(), body.clone()).await.status,
            StatusCode::BAD_REQUEST,
            "{body}"
        );
    }
    // Only known cross-term courses can be rated.
    let unknown = call(
        &app,
        "PUT",
        "/api/courses/nthu/NOPE/ratings/me",
        Some(&alice),
        Some(json!({ "score": 4 })),
    )
    .await;
    assert_eq!(unknown.status, StatusCode::NOT_FOUND);
    let unknown = call(
        &app,
        "GET",
        "/api/courses/nthu/NOPE/ratings/me",
        Some(&alice),
        None,
    )
    .await;
    assert_eq!(unknown.status, StatusCode::NOT_FOUND);
    assert_eq!(
        unknown.body,
        json!({"code": "not_found", "message": "Course not found"})
    );
    assert_eq!(
        call(&app, "GET", "/api/courses/ntu/DEMO201/ratings", None, None)
            .await
            .status,
        StatusCode::NOT_FOUND
    );
    assert_eq!(
        call(&app, "GET", "/api/courses/nthu/DEMO%00/ratings", None, None)
            .await
            .status,
        StatusCode::BAD_REQUEST
    );

    let profile = call(&app, "GET", "/api/users/ALICE", None, None).await;
    assert_eq!(profile.status, StatusCode::OK);
    assert_eq!(profile.body["ratings"][0]["courseCode"], "DEMO201");
    assert_eq!(profile.body["ratings"][0]["title"], "線性代數");
    let latest: String = sqlx::query_scalar("SELECT id::text FROM offerings WHERE school = 'nthu' AND course_code = 'DEMO201' AND term = '115-1'")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(profile.body["ratings"][0]["latestOfferingId"], latest);
    assert_eq!(
        call(&app, "GET", "/api/users/nobody", None, None)
            .await
            .status,
        StatusCode::NOT_FOUND
    );

    let deleted = call(&app, "DELETE", &format!("{base}/me"), Some(&alice), None).await;
    assert_eq!(deleted.status, StatusCode::NO_CONTENT);
    let stats = call(&app, "GET", &format!("{base}/stats"), None, None).await;
    assert_eq!(stats.body["count"], 1);
    assert_eq!(stats.body["average"], 2.0);

    sqlx::query("DELETE FROM offerings WHERE school = 'nthu' AND course_code = 'DEMO201'")
        .execute(&pool)
        .await
        .unwrap();
    unicourse_catalog::refresh_rankings(&pool).await.unwrap();
    let profile = call(&app, "GET", "/api/users/bob", None, None).await;
    assert_eq!(profile.body["ratings"][0]["latestOfferingId"], Value::Null);
}

#[sqlx::test(migrator = "MIGRATOR")]
async fn posts_replies_votes_and_soft_delete(pool: PgPool) {
    seed(&pool).await;
    let app = unicourse_api::router(pool.clone());
    let alice = register(&app, "alice").await;
    let bob = register(&app, "bob").await;

    let created = call(
        &app,
        "POST",
        "/api/posts",
        Some(&alice),
        Some(json!({
            "type": "question",
            "title": " 線代期中考範圍？ ",
            "content": "<script>alert(1)</script>\n第幾章？",
            "school": "nthu",
            "courseCode": "DEMO201",
            "tags": ["期中考", "線代", "期中考"],
        })),
    )
    .await;
    assert_eq!(created.status, StatusCode::CREATED, "{}", created.body);
    let post = &created.body;
    let id = post["id"].as_i64().unwrap();
    assert_eq!(post["type"], "question");
    assert_eq!(post["title"], "線代期中考範圍？");
    // Content is stored verbatim as plain text; escaping is the renderer's job.
    assert_eq!(post["content"], "<script>alert(1)</script>\n第幾章？");
    assert_eq!(
        post["author"],
        json!({ "username": "alice", "displayName": null })
    );
    assert_eq!(post["tags"], json!(["期中考", "線代"]));
    assert_eq!(post["replies"], json!([]));
    assert_eq!(post["myVote"], 0);

    let article = call(
        &app,
        "POST",
        "/api/posts",
        Some(&bob),
        Some(json!({ "type": "article", "title": "選課心得", "content": "推薦 DEMO202" })),
    )
    .await;
    assert_eq!(article.status, StatusCode::CREATED);
    let article_id = article.body["id"].as_i64().unwrap();

    // Announcements need an admin account.
    let announcement = json!({ "type": "announcement", "title": "公告", "content": "維護" });
    assert_eq!(
        call(
            &app,
            "POST",
            "/api/posts",
            Some(&alice),
            Some(announcement.clone())
        )
        .await
        .status,
        StatusCode::FORBIDDEN
    );
    sqlx::query("UPDATE users SET is_admin = true WHERE username = 'alice'")
        .execute(&pool)
        .await
        .unwrap();
    assert_eq!(
        call(&app, "POST", "/api/posts", Some(&alice), Some(announcement))
            .await
            .status,
        StatusCode::CREATED
    );
    sqlx::query("UPDATE users SET is_admin = false WHERE username = 'alice'")
        .execute(&pool)
        .await
        .unwrap();

    for body in [
        json!({ "type": "reply", "title": "x", "content": "x" }),
        json!({ "type": "article", "title": "", "content": "x" }),
        json!({ "type": "article", "title": "x".repeat(201), "content": "x" }),
        json!({ "type": "article", "title": "a\nb", "content": "x" }),
        json!({ "type": "article", "title": "x", "content": "   " }),
        json!({ "type": "article", "title": "x", "content": "x".repeat(20_001) }),
        json!({ "type": "article", "title": "x", "content": "a\u{0}b" }),
        json!({ "type": "article", "title": "x", "content": "x", "courseCode": "DEMO201" }),
        json!({ "type": "article", "title": "x", "content": "x", "school": "nthu", "courseCode": "NOPE" }),
        json!({ "type": "article", "title": "x", "content": "x", "school": "nowhere" }),
        json!({ "type": "article", "title": "x", "content": "x", "tags": ["1", "2", "3", "4", "5", "6"] }),
        json!({ "type": "article", "title": "x", "content": "x", "tags": ["x".repeat(31)] }),
        json!({ "type": "poll", "title": "x", "content": "x" }),
    ] {
        let response = call(&app, "POST", "/api/posts", Some(&bob), Some(body.clone())).await;
        assert_eq!(response.status, StatusCode::BAD_REQUEST, "{body}");
    }

    let reply = call(
        &app,
        "POST",
        &format!("/api/posts/{id}/replies"),
        Some(&bob),
        Some(json!({ "content": "第一到四章" })),
    )
    .await;
    assert_eq!(reply.status, StatusCode::CREATED, "{}", reply.body);
    let reply_id = reply.body["id"].as_i64().unwrap();
    assert_eq!(reply.body["author"]["username"], "bob");
    let nested = call(
        &app,
        "POST",
        &format!("/api/posts/{reply_id}/replies"),
        Some(&alice),
        Some(json!({ "content": "x" })),
    )
    .await;
    assert_eq!(nested.status, StatusCode::BAD_REQUEST);
    call(
        &app,
        "POST",
        &format!("/api/posts/{id}/replies"),
        Some(&alice),
        Some(json!({ "content": "謝謝" })),
    )
    .await;

    let vote = |cookie: String, target: i64, value: i64| {
        let app = app.clone();
        async move {
            call(
                &app,
                "PUT",
                &format!("/api/posts/{target}/vote"),
                Some(&cookie),
                Some(json!({ "value": value })),
            )
            .await
        }
    };
    assert_eq!(
        vote(alice.clone(), id, 1).await.body,
        json!({ "score": 1, "myVote": 1 })
    );
    assert_eq!(
        vote(bob.clone(), id, 1).await.body,
        json!({ "score": 2, "myVote": 1 })
    );
    assert_eq!(
        vote(bob.clone(), id, -1).await.body,
        json!({ "score": 0, "myVote": -1 })
    );
    assert_eq!(
        vote(bob.clone(), id, 0).await.body,
        json!({ "score": 1, "myVote": 0 })
    );
    assert_eq!(vote(alice.clone(), reply_id, -1).await.body["score"], -1);
    assert_eq!(
        vote(alice.clone(), id, 2).await.status,
        StatusCode::BAD_REQUEST
    );
    assert_eq!(
        vote(alice.clone(), 999_999, 1).await.status,
        StatusCode::NOT_FOUND
    );

    let thread = call(&app, "GET", &format!("/api/posts/{id}"), Some(&alice), None).await;
    assert_eq!(thread.status, StatusCode::OK);
    assert_eq!(thread.body["score"], 1);
    assert_eq!(thread.body["myVote"], 1);
    assert_eq!(thread.body["replyCount"], 2);
    let replies = thread.body["replies"].as_array().unwrap();
    assert_eq!(replies[0]["content"], "第一到四章");
    assert_eq!(replies[0]["myVote"], -1);
    assert_eq!(replies[1]["content"], "謝謝");
    let anonymous = call(&app, "GET", &format!("/api/posts/{id}"), None, None).await;
    assert_eq!(anonymous.body["myVote"], 0);
    // Replies are only shown inside their thread.
    assert_eq!(
        call(&app, "GET", &format!("/api/posts/{reply_id}"), None, None)
            .await
            .status,
        StatusCode::NOT_FOUND
    );

    // Listing: top-level only, newest first, with filters.
    let all = call(&app, "GET", "/api/posts", None, None).await;
    assert_eq!(all.body["total"], 3);
    assert_eq!(all.body["pageSize"], 20);
    let titles: Vec<_> = all.body["posts"]
        .as_array()
        .unwrap()
        .iter()
        .map(|post| post["title"].clone())
        .collect();
    assert_eq!(
        titles,
        [json!("公告"), json!("選課心得"), json!("線代期中考範圍？")]
    );
    assert_eq!(all.body["posts"][2]["replyCount"], 2);
    assert_eq!(all.body["posts"][2]["score"], 1);
    let filtered = |query: &'static str| {
        let app = app.clone();
        async move {
            call(&app, "GET", &format!("/api/posts?{query}"), None, None)
                .await
                .body["total"]
                .clone()
        }
    };
    assert_eq!(filtered("type=question").await, 1);
    assert_eq!(filtered("school=nthu&courseCode=DEMO201").await, 1);
    assert_eq!(filtered("q=DEMO202").await, 1);
    assert_eq!(filtered("q=%25").await, 0);
    assert_eq!(filtered("tag=%E7%B7%9A%E4%BB%A3").await, 1);
    assert_eq!(
        call(&app, "GET", "/api/posts?page=2", None, None)
            .await
            .body["posts"],
        json!([])
    );

    // Editing: author only; replies have no title.
    let edit = |cookie: String, target: i64, body: Value| {
        let app = app.clone();
        async move {
            call(
                &app,
                "PATCH",
                &format!("/api/posts/{target}"),
                Some(&cookie),
                Some(body),
            )
            .await
            .status
        }
    };
    assert_eq!(
        edit(bob.clone(), id, json!({ "title": "x" })).await,
        StatusCode::FORBIDDEN
    );
    assert_eq!(
        edit(alice.clone(), id, json!({})).await,
        StatusCode::BAD_REQUEST
    );
    assert_eq!(
        edit(alice.clone(), id, json!({ "content": "" })).await,
        StatusCode::BAD_REQUEST
    );
    assert_eq!(
        edit(alice.clone(), id, json!({ "title": "線代期中考範圍" })).await,
        StatusCode::NO_CONTENT
    );
    assert_eq!(
        edit(bob.clone(), reply_id, json!({ "title": "x" })).await,
        StatusCode::BAD_REQUEST
    );
    assert_eq!(
        edit(bob.clone(), reply_id, json!({ "content": "第一到五章" })).await,
        StatusCode::NO_CONTENT
    );
    let thread = call(&app, "GET", &format!("/api/posts/{id}"), None, None).await;
    assert_eq!(thread.body["title"], "線代期中考範圍");
    assert_eq!(thread.body["replies"][0]["content"], "第一到五章");
    sqlx::query("UPDATE posts SET created_at = '2026-11-27 08:00:00.000100+00', updated_at = '2026-11-27 08:00:00.000200+00' WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .unwrap();
    let thread = call(&app, "GET", &format!("/api/posts/{id}"), None, None).await;
    assert_eq!(thread.body["createdAt"], "2026-11-27T08:00:00.000100Z");
    assert_eq!(thread.body["updatedAt"], "2026-11-27T08:00:00.000200Z");
    let invalid = call(&app, "GET", "/api/posts?type=reply", None, None).await;
    assert_eq!(invalid.status, StatusCode::BAD_REQUEST);
    assert_eq!(invalid.body["code"], "invalid_query");

    // Soft delete: author or admin.
    let remove = |cookie: String, target: i64| {
        let app = app.clone();
        async move {
            call(
                &app,
                "DELETE",
                &format!("/api/posts/{target}"),
                Some(&cookie),
                None,
            )
            .await
            .status
        }
    };
    assert_eq!(
        remove(alice.clone(), article_id).await,
        StatusCode::FORBIDDEN
    );
    assert_eq!(remove(alice.clone(), reply_id).await, StatusCode::FORBIDDEN);
    assert_eq!(remove(bob.clone(), reply_id).await, StatusCode::NO_CONTENT);
    let thread = call(&app, "GET", &format!("/api/posts/{id}"), None, None).await;
    assert_eq!(thread.body["replyCount"], 1);
    assert_eq!(thread.body["replies"].as_array().unwrap().len(), 1);
    assert_eq!(remove(bob.clone(), reply_id).await, StatusCode::NOT_FOUND);
    assert_eq!(
        vote(alice.clone(), reply_id, 1).await.status,
        StatusCode::NOT_FOUND
    );

    sqlx::query("UPDATE users SET is_admin = true WHERE username = 'alice'")
        .execute(&pool)
        .await
        .unwrap();
    assert_eq!(
        remove(alice.clone(), article_id).await,
        StatusCode::NO_CONTENT
    );
    assert_eq!(remove(alice.clone(), id).await, StatusCode::NO_CONTENT);
    assert_eq!(
        call(&app, "GET", &format!("/api/posts/{id}"), None, None)
            .await
            .status,
        StatusCode::NOT_FOUND
    );
    assert_eq!(filtered("").await, 1);
    // Replying to a deleted thread is not possible.
    let late = call(
        &app,
        "POST",
        &format!("/api/posts/{id}/replies"),
        Some(&bob),
        Some(json!({ "content": "x" })),
    )
    .await;
    assert_eq!(late.status, StatusCode::NOT_FOUND);
    let rows: i64 = sqlx::query_scalar("SELECT count(*) FROM posts")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(rows, 5, "soft delete keeps rows");

    let profile = call(&app, "GET", "/api/users/bob", None, None).await;
    assert_eq!(profile.body["posts"], json!([]));
}

#[sqlx::test(migrator = "MIGRATOR")]
async fn rankings_overview_and_browsing(pool: PgPool) {
    seed(&pool).await;
    let app = unicourse_api::router(pool.clone());

    let ranking = call(&app, "GET", "/api/rankings/courses?school=nthu", None, None).await;
    assert_eq!(ranking.status, StatusCode::OK);
    let rows = ranking.body.as_array().unwrap();
    let codes: Vec<_> = rows
        .iter()
        .map(|row| row["courseCode"].as_str().unwrap())
        .collect();
    assert_eq!(codes, ["DEMO201", "DEMO204", "DEMO202", "DEMO203"]);
    let linear = &rows[0];
    assert_eq!(linear["terms"], 2);
    assert_eq!(linear["offerings"], 2);
    assert_eq!(linear["enrolledTotal"], 58 + 55);
    assert_eq!(linear["capacityTotal"], 60);
    assert_eq!(linear["schoolName"], "國立清華大學");
    assert_eq!(linear["title"], "線性代數");
    assert_eq!(linear["isDemo"], true);
    let latest: String = sqlx::query_scalar(
        "SELECT id::text FROM offerings WHERE school = 'nthu' AND term = '115-1' AND course_code = 'DEMO201'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(linear["latestOfferingId"], latest);
    assert_eq!(linear["latestActiveOfferingId"], latest);
    assert_eq!(
        linear["trend"],
        json!([
            {"term": "115-1", "enrolled": 58, "capacity": 60},
            {"term": "114-2", "enrolled": 55, "capacity": null}
        ])
    );
    assert_eq!(rows[1]["capacityTotal"], Value::Null);
    assert_eq!(rows[3]["enrolledTotal"], Value::Null);
    assert_eq!(rows[3]["capacityTotal"], Value::Null);

    let all = call(&app, "GET", "/api/rankings/courses?limit=2", None, None).await;
    assert_eq!(all.body.as_array().unwrap().len(), 2);
    assert_eq!(all.body[0]["courseCode"], "DEMO201");
    let every = call(&app, "GET", "/api/rankings/courses?limit=100", None, None).await;
    let every = every.body.as_array().unwrap();
    // Schools without `enrolled` fall back to capacity ordering after every enrolled total.
    let first_null = every
        .iter()
        .position(|row| row["enrolledTotal"].is_null())
        .unwrap();
    assert!(
        every[first_null..]
            .iter()
            .all(|row| row["enrolledTotal"].is_null())
    );

    // Withdrawn offerings still count; the ranking is refreshed by every import.
    let shrunk: Value = {
        let mut snapshot: Value = serde_json::from_slice(NTHU).unwrap();
        snapshot["offerings"].as_array_mut().unwrap().truncate(1);
        snapshot
    };
    import(
        &pool,
        &parse_snapshot(&serde_json::to_vec(&shrunk).unwrap()).unwrap(),
    )
    .await
    .unwrap();
    let ranking = call(&app, "GET", "/api/rankings/courses?school=nthu", None, None).await;
    assert_eq!(ranking.body.as_array().unwrap().len(), 4);
    let withdrawn = &ranking.body[2];
    assert_eq!(withdrawn["courseCode"], "DEMO202");
    assert_eq!(withdrawn["latestActiveOfferingId"], Value::Null);
    assert_eq!(
        withdrawn["trend"],
        json!([{"term": "115-1", "enrolled": 72, "capacity": 0}])
    );
    let detail = call(
        &app,
        "GET",
        &format!(
            "/api/courses/{}",
            withdrawn["latestOfferingId"].as_str().unwrap()
        ),
        None,
        None,
    )
    .await;
    assert_eq!(detail.status, StatusCode::OK);
    assert_eq!(detail.body["active"], false);

    let overview = call(&app, "GET", "/api/stats/overview", None, None).await;
    assert_eq!(overview.status, StatusCode::OK);
    let nthu = overview.body["schools"]
        .as_array()
        .unwrap()
        .iter()
        .find(|school| school["slug"] == "nthu")
        .unwrap()
        .clone();
    assert_eq!(nthu["terms"], 2);
    assert_eq!(nthu["offerings"], 5);
    assert_eq!(nthu["courses"], 4);
    assert!(nthu["latestImportedAt"].as_str().unwrap().ends_with('Z'));
    assert_eq!(overview.body["totals"]["schools"], 3);
    assert_eq!(overview.body["totals"]["terms"], 2);

    let listed = call(&app, "GET", "/api/institutions", None, None).await;
    assert_eq!(listed.status, StatusCode::OK);
    let rows = listed.body["institutions"].as_array().unwrap();
    assert!(rows.len() > 100);
    let by_slug = |slug: &str| rows.iter().find(|row| row["slug"] == slug).unwrap().clone();
    let institution = by_slug("nthu");
    assert_eq!(institution["code"], "0002");
    assert_eq!(institution["name"], "國立清華大學");
    assert_eq!(institution["status"], "live");
    assert_eq!(institution["terms"], json!(["115-1", "114-2"]));
    assert_eq!(institution["offerings"], 5);
    assert_eq!(institution["courses"], 4);
    assert_eq!(institution["latestImportedAt"], nthu["latestImportedAt"]);
    let blocked = by_slug("ncku");
    assert_eq!(blocked["status"], "blocked");
    assert_eq!(blocked["issue"], 1);
    assert_eq!(blocked["terms"], json!([]));
    assert_eq!(blocked["offerings"], 0);
    assert_eq!(blocked["latestImportedAt"], Value::Null);
    let other = rows.iter().find(|row| row["slug"].is_null()).unwrap();
    assert_eq!(other["status"], "none");
    assert_eq!(other["note"], Value::Null);
    let newest = rows
        .iter()
        .filter_map(|row| row["latestImportedAt"].as_str())
        .max()
        .unwrap();
    assert_eq!(listed.body["updatedAt"], newest);

    let school = call(&app, "GET", "/api/schools/nthu", None, None).await;
    assert_eq!(school.status, StatusCode::OK);
    assert_eq!(school.body["terms"], json!(["115-1", "114-2"]));
    assert_eq!(school.body["offerings"], nthu["offerings"]);
    assert_eq!(school.body["courses"], nthu["courses"]);
    assert_eq!(
        school.body["departments"],
        json!([{ "name": "示範數學系", "offerings": 3, "courses": 2 }])
    );
    assert_eq!(
        call(&app, "GET", "/api/schools/nowhere", None, None)
            .await
            .status,
        StatusCode::NOT_FOUND
    );

    let department = call(
        &app,
        "GET",
        "/api/schools/nthu/departments/%E7%A4%BA%E7%AF%84%E6%95%B8%E5%AD%B8%E7%B3%BB",
        None,
        None,
    )
    .await;
    assert_eq!(department.status, StatusCode::OK);
    assert_eq!(department.body["total"], 3);
    assert_eq!(department.body["terms"], json!(["115-1", "114-2"]));
    for (term, total) in [("114-2", 2), ("113-1", 0)] {
        let filtered = call(
            &app,
            "GET",
            &format!("{NTHU_DEPARTMENT}?term={term}"),
            None,
            None,
        )
        .await;
        assert_eq!(filtered.status, StatusCode::OK);
        assert_eq!(filtered.body["total"], total);
        assert_eq!(filtered.body["terms"], department.body["terms"]);
        let offerings = filtered.body["offerings"].as_array().unwrap();
        assert_eq!(offerings.len(), total);
        assert!(offerings.iter().all(|offering| offering["term"] == term));
    }
    let terms: Vec<_> = department.body["offerings"]
        .as_array()
        .unwrap()
        .iter()
        .map(|offering| offering["term"].as_str().unwrap())
        .collect();
    assert_eq!(terms, ["115-1", "114-2", "114-2"]);
    assert_eq!(department.body["offerings"][0]["enrolled"], 58);
    assert_eq!(
        call(
            &app,
            "GET",
            "/api/schools/nthu/departments/%E6%95%B8%E5%AD%B8%E7%B3%BB",
            None,
            None
        )
        .await
        .status,
        StatusCode::NOT_FOUND
    );

    // 王示範 teaches DEMO201 in both terms.
    let instructor = call(
        &app,
        "GET",
        "/api/instructors/nthu/%E7%8E%8B%E7%A4%BA%E7%AF%84",
        None,
        None,
    )
    .await;
    assert_eq!(instructor.status, StatusCode::OK);
    assert_eq!(
        instructor.body["summary"],
        json!({ "offerings": 2, "courses": 1, "terms": ["115-1", "114-2"], "departments": ["示範數學系"] })
    );
    assert_eq!(instructor.body["offerings"][0]["term"], "115-1");
    // Exact name match only.
    assert_eq!(
        call(&app, "GET", "/api/instructors/nthu/%E7%8E%8B", None, None)
            .await
            .status,
        StatusCode::NOT_FOUND
    );
    assert_eq!(
        call(
            &app,
            "GET",
            "/api/instructors/ntu/%E7%8E%8B%E7%A4%BA%E7%AF%84",
            None,
            None
        )
        .await
        .status,
        StatusCode::NOT_FOUND
    );
}

#[sqlx::test(migrator = "MIGRATOR")]
async fn course_history_keeps_withdrawn_offerings(pool: PgPool) {
    seed(&pool).await;
    let app = unicourse_api::router(pool.clone());
    let url = "/api/courses/nthu/DEMO201";
    let history = call(&app, "GET", url, None, None).await;
    assert_eq!(history.status, StatusCode::OK);
    let terms = history.body["terms"].as_array().unwrap();
    let newest = terms[0]["offerings"][0].clone();
    let older = terms[1]["offerings"][0].clone();
    assert_eq!(newest["active"], true);
    assert_eq!(older["active"], true);
    assert_eq!(
        history.body,
        json!({
            "school": "nthu", "schoolName": "國立清華大學", "courseCode": "DEMO201",
            "title": "線性代數", "titleEn": "Linear Algebra (Demo)", "department": "示範數學系",
            "terms": [
                {"term": "115-1", "offerings": [newest], "enrolled": 58, "capacity": 60},
                {"term": "114-2", "offerings": [older], "enrolled": 55, "capacity": null}
            ],
            "totals": {"terms": 2, "offerings": 2, "enrolledTotal": 113, "capacityTotal": 60},
            "latestActiveOfferingId": newest["id"]
        })
    );
    let mut snapshot: Value = serde_json::from_slice(NTHU).unwrap();
    snapshot["offerings"].as_array_mut().unwrap().remove(0);
    import(
        &pool,
        &parse_snapshot(&serde_json::to_vec(&snapshot).unwrap()).unwrap(),
    )
    .await
    .unwrap();
    let history = call(&app, "GET", url, None, None).await;
    assert_eq!(history.body["latestActiveOfferingId"], older["id"]);
    assert_eq!(history.body["terms"][0]["offerings"][0]["active"], false);
    assert_eq!(history.body["totals"]["enrolledTotal"], 113);

    let unknown = call(&app, "GET", "/api/courses/nthu/unknown", None, None).await;
    assert_eq!(unknown.status, StatusCode::NOT_FOUND);
    assert_eq!(unknown.body["code"], "not_found");
    let unpublished = call(&app, "GET", "/api/courses/nthu/DEMO203", None, None).await;
    assert_eq!(unpublished.status, StatusCode::OK);
    assert!(unpublished.body.get("titleEn").is_none());
    assert_eq!(
        unpublished.body["totals"],
        json!({"terms": 1, "offerings": 1, "enrolledTotal": null, "capacityTotal": null})
    );
}

#[sqlx::test(migrator = "MIGRATOR")]
async fn trends_aggregate_the_active_catalog(pool: PgPool) {
    seed(&pool).await;
    let app = unicourse_api::router(pool.clone());
    let school_url = "/api/schools/nthu/trends";
    let department_url = &format!("{NTHU_DEPARTMENT}/trends");
    let instructor_url = "/api/instructors/nthu/%E7%8E%8B%E7%A4%BA%E7%AF%84/trends";
    for (url, expected) in [
        (
            school_url,
            json!([
                {"term": "115-1", "offerings": 3, "courses": 3, "enrolled": 130, "capacity": 60},
                {"term": "114-2", "offerings": 2, "courses": 2, "enrolled": 135, "capacity": null}
            ]),
        ),
        (
            department_url,
            json!([
                {"term": "115-1", "offerings": 1, "courses": 1, "enrolled": 58, "capacity": 60},
                {"term": "114-2", "offerings": 2, "courses": 2, "enrolled": 135, "capacity": null}
            ]),
        ),
        (
            instructor_url,
            json!([
                {"term": "115-1", "offerings": 1, "courses": 1, "enrolled": 58, "capacity": 60},
                {"term": "114-2", "offerings": 1, "courses": 1, "enrolled": 55, "capacity": null}
            ]),
        ),
    ] {
        let response = call(&app, "GET", url, None, None).await;
        assert_eq!(response.status, StatusCode::OK, "{url}");
        assert_eq!(response.body, expected, "{url}");
    }
    for url in [
        "/api/schools/unknown/trends",
        "/api/schools/nthu/departments/unknown/trends",
        "/api/instructors/nthu/%E7%8E%8B/trends",
    ] {
        let response = call(&app, "GET", url, None, None).await;
        assert_eq!(response.status, StatusCode::NOT_FOUND, "{url}");
        assert_eq!(response.body["code"], "not_found");
    }

    let mut snapshot: Value = serde_json::from_slice(NTHU).unwrap();
    let offerings = snapshot["offerings"].as_array_mut().unwrap();
    offerings.truncate(1);
    let mut duplicate = offerings[0].clone();
    duplicate["sourceId"] = json!("second-section");
    duplicate.as_object_mut().unwrap().remove("enrolled");
    offerings.push(duplicate);
    import(
        &pool,
        &parse_snapshot(&serde_json::to_vec(&snapshot).unwrap()).unwrap(),
    )
    .await
    .unwrap();
    let response = call(&app, "GET", school_url, None, None).await;
    assert_eq!(
        response.body[0],
        json!({"term": "115-1", "offerings": 2, "courses": 1, "enrolled": 58, "capacity": 120})
    );
}

#[sqlx::test(migrator = "MIGRATOR")]
async fn ranking_trends_are_limited_to_ten_terms(pool: PgPool) {
    seed(&pool).await;
    let mut snapshot: Value = serde_json::from_slice(NTHU_OLDER).unwrap();
    snapshot["offerings"].as_array_mut().unwrap().truncate(1);
    for year in 105..=114 {
        snapshot["term"] = json!(format!("{year}-1"));
        import(
            &pool,
            &parse_snapshot(&serde_json::to_vec(&snapshot).unwrap()).unwrap(),
        )
        .await
        .unwrap();
    }
    let app = unicourse_api::router(pool);
    let response = call(
        &app,
        "GET",
        "/api/rankings/courses?school=nthu&limit=1",
        None,
        None,
    )
    .await;
    assert_eq!(response.status, StatusCode::OK);
    let ranking = &response.body[0];
    assert_eq!(ranking["terms"], 12);
    assert_eq!(ranking["enrolledTotal"], 58 + 55 * 11);
    let trend = ranking["trend"].as_array().unwrap();
    assert_eq!(trend.len(), 10);
    assert_eq!(trend[0]["term"], "115-1");
    assert_eq!(trend[9]["term"], "107-1");
}

#[sqlx::test(migrator = "MIGRATOR")]
async fn search_pages_sort_and_keep_totals(pool: PgPool) {
    seed(&pool).await;
    let mut snapshot: Value = serde_json::from_slice(NTHU).unwrap();
    let offerings = snapshot["offerings"].as_array_mut().unwrap();
    let template = offerings[0].clone();
    for section in 1..=50 {
        let mut offering = template.clone();
        offering["sourceId"] = json!(format!("class-{section}"));
        offering["enrolled"] = json!(section);
        offerings.push(offering);
    }
    import(
        &pool,
        &parse_snapshot(&serde_json::to_vec(&snapshot).unwrap()).unwrap(),
    )
    .await
    .unwrap();
    let app = unicourse_api::router(pool);
    let query = "school=nthu&term=115-1&q=DEMO201";
    let legacy = call(&app, "GET", &format!("/api/courses?{query}"), None, None).await;
    let path = &format!("/api/courses/search?{query}");
    let first = call(&app, "GET", path, None, None).await;
    assert_eq!(first.status, StatusCode::OK);
    assert_eq!(first.body["offset"], 0);
    assert_eq!(first.body["total"], 51);
    assert_eq!(first.body["courses"].as_array().unwrap().len(), 50);
    assert_eq!(legacy.body, first.body["courses"]);
    let last = call(
        &app,
        "GET",
        &format!("{path}&offset=50&sort=enrolled"),
        None,
        None,
    )
    .await;
    assert_eq!(last.body["total"], 51);
    assert_eq!(last.body["offset"], 50);
    assert_eq!(last.body["courses"][0]["enrolled"], 1);
    let empty = call(&app, "GET", &format!("{path}&offset=90"), None, None).await;
    assert_eq!(
        empty.body,
        json!({"total": 51, "offset": 90, "courses": []})
    );
    let titles = call(
        &app,
        "GET",
        "/api/courses/search?school=nthu&sort=title",
        None,
        None,
    )
    .await;
    assert_eq!(titles.status, StatusCode::OK);
    let titles = titles.body["courses"].as_array().unwrap();
    assert!(
        titles
            .windows(2)
            .all(|rows| rows[0]["title"].as_str() <= rows[1]["title"].as_str())
    );
    for extra in ["offset=-1", "sort=unknown", "term=%00"] {
        let response = call(
            &app,
            "GET",
            &format!("/api/courses/search?{extra}"),
            None,
            None,
        )
        .await;
        assert_eq!(response.status, StatusCode::BAD_REQUEST);
        assert_eq!(response.body["code"], "invalid_query");
    }
}

#[sqlx::test(migrator = "MIGRATOR")]
async fn search_relevance_prefers_codes_and_titles_over_metadata(pool: PgPool) {
    let mut metadata = synthetic_offering("META", "方法與實務", 999);
    metadata["instructors"] = json!(["資料教師"]);
    metadata["department"] = json!("資料中心");
    let mut english = synthetic_offering("ENGLISH", "其他主題", 100);
    english["titleEn"] = json!("資料 Introduction");
    import_offerings(
        &pool,
        NTHU,
        vec![
            metadata,
            english,
            synthetic_offering("FUZZY", "甲資料乙", 250),
            synthetic_offering("CONTAINS", "甲 資料 乙", 5),
            synthetic_offering("LOW", "資料探勘", 10),
            synthetic_offering("EXACT", "資料", 2),
            synthetic_offering("資料-I", "專題研討", 999),
            synthetic_offering("資料", "獨立研究", 1),
            synthetic_offering("X資料", "無關主題", 100),
            synthetic_offering("SYMBOL", "符號%_測試", 1),
        ],
    )
    .await;
    import_offerings(
        &pool,
        NTHU_OLDER,
        vec![synthetic_offering("OLDER", "資料結構", 300)],
    )
    .await;
    let app = unicourse_api::router(pool);
    let query = "q=%E8%B3%87%E6%96%99";
    let page = call(
        &app,
        "GET",
        &format!("/api/courses/search?{query}"),
        None,
        None,
    )
    .await;
    assert_eq!(page.status, StatusCode::OK, "{}", page.body);
    assert_eq!(page.body["total"], 9);
    let courses = &page.body["courses"];
    assert_eq!(
        courses
            .as_array()
            .unwrap()
            .iter()
            .map(|row| row["courseCode"].as_str().unwrap())
            .collect::<Vec<_>>(),
        [
            "資料", "EXACT", "ENGLISH", "LOW", "OLDER", "CONTAINS", "FUZZY", "資料-I", "META"
        ]
    );
    let legacy = call(&app, "GET", &format!("/api/courses?{query}"), None, None).await;
    assert_eq!(&legacy.body, courses);
    let percent = call(&app, "GET", "/api/courses/search?q=%25%5F", None, None).await;
    assert_eq!(percent.body["total"], 1);
    assert_eq!(percent.body["courses"][0]["courseCode"], "SYMBOL");
}

#[sqlx::test(migrator = "MIGRATOR")]
async fn rankings_default_to_academic_courses(pool: PgPool) {
    let mut zero_credit = synthetic_offering("ZERO", "服務學習", 500);
    zero_credit["credits"] = json!(0);
    let mut credit = synthetic_offering("CREDIT", "服務學習", 20);
    credit["credits"] = json!(1);
    import_offerings(
        &pool,
        NTHU,
        vec![
            synthetic_offering("CLASS", "大一班會", 999),
            zero_credit,
            credit,
        ],
    )
    .await;
    let app = unicourse_api::router(pool);
    let url = "/api/rankings/courses?school=nthu&limit=1";
    let default = call(&app, "GET", url, None, None).await;
    assert_eq!(default.status, StatusCode::OK);
    assert_eq!(default.body[0]["courseCode"], "CREDIT");
    let explicit = call(&app, "GET", &format!("{url}&academic=true"), None, None).await;
    assert_eq!(default.body, explicit.body);
    let all = call(
        &app,
        "GET",
        "/api/rankings/courses?academic=false",
        None,
        None,
    )
    .await;
    assert_eq!(all.status, StatusCode::OK);
    assert_eq!(all.body[0]["courseCode"], "CLASS");
    assert_eq!(all.body[1]["courseCode"], "ZERO");
    assert_eq!(all.body[2]["courseCode"], "CREDIT");
}

#[sqlx::test(migrator = "MIGRATOR")]
async fn coverage_endpoints_share_all_imported_data_and_cache(pool: PgPool) {
    let empty_app = unicourse_api::router(pool.clone());
    let empty = call(&empty_app, "GET", "/api/coverage", None, None).await;
    assert_eq!(empty.status, StatusCode::OK);
    assert_eq!(
        empty.body,
        json!({
            "earliestTerm": null, "latestTerm": null, "terms": [], "schools": [],
            "totals": {"terms": 0, "schools": 0, "offerings": 0, "courses": 0}
        })
    );
    seed(&pool).await;
    import_offerings(
        &pool,
        NTHU,
        vec![synthetic_offering("DEMO2", "取代後的課程", 5)],
    )
    .await;
    sqlx::query("INSERT INTO schools (slug, name) VALUES ('ncku', '國立成功大學')")
        .execute(&pool)
        .await
        .unwrap();
    let app = unicourse_api::router(pool.clone());
    let coverage = call(&app, "GET", "/api/coverage", None, None).await;
    assert_eq!(coverage.status, StatusCode::OK);
    assert_eq!(coverage.body["earliestTerm"], "114-2");
    assert_eq!(coverage.body["latestTerm"], "115-1");
    assert_eq!(coverage.body["terms"], json!(["115-1", "114-2"]));
    assert_eq!(
        coverage.body["totals"],
        json!({"terms": 2, "schools": 3, "offerings": 9, "courses": 8})
    );
    let nthu = &coverage.body["schools"][0];
    assert_eq!(nthu["slug"], "nthu");
    assert_eq!(nthu["earliestTerm"], "114-2");
    assert_eq!(nthu["latestTerm"], "115-1");
    assert_eq!(nthu["offerings"], 6);
    assert_eq!(nthu["courses"], 5);

    import_offerings(
        &pool,
        NTHU,
        vec![synthetic_offering("NEW", "又一門新課", 6)],
    )
    .await;
    let overview = call(&app, "GET", "/api/stats/overview", None, None).await;
    let institutions = call(&app, "GET", "/api/institutions", None, None).await;
    assert_eq!(overview.body["totals"], coverage.body["totals"]);
    let institution_rows = institutions.body["institutions"].as_array().unwrap();
    for (school, row) in coverage.body["schools"]
        .as_array()
        .unwrap()
        .iter()
        .zip(overview.body["schools"].as_array().unwrap())
    {
        let institution = institution_rows
            .iter()
            .find(|item| item["slug"] == school["slug"])
            .unwrap();
        for field in ["slug", "offerings", "courses", "latestImportedAt"] {
            assert_eq!(school[field], row[field], "overview {field}");
            assert_eq!(school[field], institution[field], "institution {field}");
        }
        assert_eq!(school["terms"], institution["terms"]);
        assert_eq!(
            school["terms"].as_array().unwrap().len(),
            row["terms"].as_u64().unwrap() as usize
        );
    }
    let fresh_app = unicourse_api::router(pool);
    let fresh = call(&fresh_app, "GET", "/api/coverage", None, None).await;
    assert_eq!(fresh.body["totals"]["offerings"], 10);
}
