//! External review snapshots: validation, matching at import time and idempotent re-imports.

use serde_json::{Value, json};
use sqlx::PgPool;
use unicourse_catalog::MIGRATOR;
use unicourse_ingest::{
    ImportSummary, import, import_external_reviews, parse_external_reviews, parse_snapshot,
};

const NTHU: &[u8] = include_bytes!("../../../fixtures/nthu-115-1.json");
const NTHU_OLDER: &[u8] = include_bytes!("../../../fixtures/nthu-114-2.json");
const REVIEWS: &[u8] = include_bytes!("../../../fixtures/external-reviews/ptt-demo.json");

fn edited(edit: impl FnOnce(&mut Value)) -> Vec<u8> {
    let mut snapshot: Value = serde_json::from_slice(REVIEWS).unwrap();
    edit(&mut snapshot);
    serde_json::to_vec(&snapshot).unwrap()
}

#[test]
fn accepts_the_fixture_and_rejects_invalid_fields() {
    parse_external_reviews(REVIEWS).unwrap();
    let post_edits: [(&str, Value); 12] = [
        ("excerpt", json!("字".repeat(121))),
        ("excerpt", json!("")),
        ("excerpt", json!(" 前後空白")),
        ("author", Value::Null),
        ("url", json!("javascript:alert(1)")),
        ("url", json!("https:example.com/x")),
        ("postedAt", json!("2026-07-01 08:00:00")),
        ("pushScore", json!(1.5)),
        ("term", json!("2026-1")),
        ("teachers", json!([])),
        ("teachers", json!(["王\u{0}"])),
        ("comments", json!("not allowed")),
    ];
    for (field, value) in post_edits {
        let bytes = edited(|snapshot| snapshot["posts"][0][field] = value.clone());
        assert!(
            parse_external_reviews(&bytes).is_err(),
            "{field} = {value} should be rejected"
        );
    }
    assert!(
        parse_external_reviews(&edited(|snapshot| {
            snapshot["posts"][0]["excerpt"] = json!("字".repeat(120));
        }))
        .is_ok()
    );
    let snapshot_edits: [(&str, Value); 6] = [
        ("format", json!("course-snapshot")),
        ("version", json!(2)),
        ("source", json!("dcard")),
        ("school", json!("harvard")),
        ("fetchedAt", json!("yesterday")),
        ("extra", json!(1)),
    ];
    for (field, value) in snapshot_edits {
        let bytes = edited(|snapshot| snapshot[field] = value.clone());
        assert!(parse_external_reviews(&bytes).is_err(), "{field} = {value}");
    }
    // Duplicate URLs, and live PTT data that does not link to PTT.
    assert!(
        parse_external_reviews(&edited(|snapshot| {
            let first = snapshot["posts"][0].clone();
            snapshot["posts"][1] = first;
        }))
        .is_err()
    );
    assert!(parse_external_reviews(&edited(|snapshot| snapshot["isDemo"] = json!(false))).is_err());
}

async fn seed(pool: &PgPool) {
    for fixture in [NTHU, NTHU_OLDER] {
        import(pool, &parse_snapshot(fixture).unwrap())
            .await
            .unwrap();
    }
}

type Stored = (String, Option<String>, Option<String>, Option<String>, bool);

async fn stored(pool: &PgPool) -> Vec<Stored> {
    sqlx::query_as(
        "SELECT url, course_code, instructor, match_kind, is_demo FROM external_reviews ORDER BY url",
    )
    .fetch_all(pool)
    .await
    .unwrap()
}

#[sqlx::test(migrator = "MIGRATOR")]
async fn matches_at_import_and_reimports_in_place(pool: PgPool) {
    seed(&pool).await;
    let snapshot = parse_external_reviews(REVIEWS).unwrap();
    let summary = import_external_reviews(&pool, &snapshot).await.unwrap();
    assert_eq!(
        summary,
        ImportSummary {
            posts: 4,
            matched: 3,
            skipped: 0
        }
    );
    let base = "https://example.com/demo/ptt/DEMO_Course/";
    let row = |id: &str, code: Option<&str>, instructor: Option<&str>, kind: Option<&str>| {
        (
            format!("{base}{id}"),
            code.map(str::to_owned),
            instructor.map(str::to_owned),
            kind.map(str::to_owned),
            true,
        )
    };
    let expected = vec![
        // Exact title, same teacher.
        row("1", Some("DEMO201"), Some("王示範"), Some("exact")),
        // Swapped title/teacher, then title-contains (計算機程式設計（一） ⊃ 計算機程式設計).
        row("2", Some("DEMO202"), Some("林範例"), Some("contains")),
        // Unmatched, but the teacher is known: kept with no course.
        row("3", None, Some("王示範"), None),
        // No teacher, the only course with that title.
        row("4", Some("DEMO203"), None, Some("title")),
    ];
    assert_eq!(stored(&pool).await, expected);

    // Importing again updates in place.
    import_external_reviews(&pool, &snapshot).await.unwrap();
    assert_eq!(stored(&pool).await, expected);
}

#[sqlx::test(migrator = "MIGRATOR")]
async fn demo_posts_never_replace_live_ones(pool: PgPool) {
    seed(&pool).await;
    let url = "https://www.ptt.cc/bbs/NTHU_Course/M.1700000000.A.ABC.html";
    let snapshot = |demo: bool, title: &str| {
        let bytes = edited(|snapshot| {
            snapshot["isDemo"] = json!(demo);
            snapshot["posts"] = json!([{
                "url": url, "title": title, "courseTitle": "線性代數", "teachers": ["王示範"]
            }]);
        });
        parse_external_reviews(&bytes).unwrap()
    };
    let live = import_external_reviews(&pool, &snapshot(false, "[心得] 線性代數 王示範"))
        .await
        .unwrap();
    assert_eq!((live.posts, live.matched), (1, 1));
    let demo = import_external_reviews(&pool, &snapshot(true, "[心得] 示範"))
        .await
        .unwrap();
    assert_eq!((demo.posts, demo.skipped), (0, 1));
    let (title, demo): (String, bool) =
        sqlx::query_as("SELECT title, is_demo FROM external_reviews WHERE url = $1")
            .bind(url)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!((title.as_str(), demo), ("[心得] 線性代數 王示範", false));
}
