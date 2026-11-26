use serde_json::{Value, json};
use sqlx::PgPool;
use unicourse_catalog::{
    ExtraValue, Filters, MIGRATOR, Meeting, Requirement, departments, offering, schools, search,
    terms,
};
use unicourse_ingest::{import, parse_snapshot};

const NTNU: &[u8] = include_bytes!("../../../fixtures/ntnu-115-1.json");
const NYCU: &[u8] = include_bytes!("../../../fixtures/nycu-115-1.json");
const NTHU: &[u8] = include_bytes!("../../../fixtures/nthu-115-1.json");

fn school(slug: &str) -> Filters<'_> {
    Filters {
        school: Some(slug),
        ..Filters::default()
    }
}

fn edited(fixture: &[u8], edit: impl FnOnce(&mut Value)) -> Vec<u8> {
    let mut snapshot: Value = serde_json::from_slice(fixture).unwrap();
    edit(&mut snapshot);
    serde_json::to_vec(&snapshot).unwrap()
}

#[test]
fn rejects_empty_snapshot_and_duplicate_offering_ids() {
    let mut snapshot: Value = serde_json::from_slice(NTNU).unwrap();
    let original = snapshot["offerings"][0].clone();
    snapshot["offerings"] = json!([]);
    assert!(parse_snapshot(&serde_json::to_vec(&snapshot).unwrap()).is_err());
    snapshot["offerings"] = json!([original, original]);
    assert!(parse_snapshot(&serde_json::to_vec(&snapshot).unwrap()).is_err());
}

#[test]
fn accepts_v1_and_v2_fixtures() {
    for fixture in [NTNU, NYCU, NTHU] {
        parse_snapshot(fixture).unwrap();
    }
}

#[test]
fn rejects_invalid_v2_fields() {
    let offering_edits: [(&str, Value); 30] = [
        ("requirement", json!("mandatory")),
        ("credits", json!(-1)),
        ("credits", json!(1000)),
        ("credits", json!(2.345)),
        ("capacity", json!(-1)),
        ("capacity", json!(1.5)),
        ("capacity", json!(2_147_483_648_i64)),
        ("enrolled", json!(-1)),
        ("enrolled", json!(1.5)),
        ("enrolled", json!(2_147_483_648_i64)),
        ("enrolled", json!("10")),
        ("syllabusUrl", json!("javascript:alert(1)")),
        ("syllabusUrl", json!("https://user:secret@example.edu/")),
        ("syllabusUrl", json!("https:example.edu/")),
        ("syllabusUrl", json!(" https://example.edu/")),
        ("sourceUrl", json!("https://example.edu/\n")),
        ("sourceUrl", json!("//example.edu/")),
        ("department", json!(" 數學系")),
        ("title", json!("線性\u{0}代數")),
        ("instructors", json!(["王\u{0}"])),
        ("titleEn", json!("")),
        ("notes", Value::Null),
        ("schedule", json!([{ "day": 8, "periods": ["1"] }])),
        ("schedule", json!([{ "day": 1, "periods": [] }])),
        (
            "schedule",
            json!([{ "day": 1, "periods": ["1"], "room": "A" }]),
        ),
        ("schedule", json!([{ "day": 1, "periods": ["1\u{0}"] }])),
        ("extra", json!({ "nested": { "a": 1 } })),
        ("extra", json!({ "a\u{0}b": 1 })),
        ("extra", json!({ "__proto__": 1 })),
        ("extra", json!({ "a": "x\u{0}" })),
    ];
    for (field, value) in offering_edits {
        let bytes = edited(NTHU, |snapshot| {
            snapshot["offerings"][0][field] = value.clone();
        });
        assert!(
            parse_snapshot(&bytes).is_err(),
            "accepted {field} = {value}"
        );
    }

    let source = |fetched_at: &str| json!({ "name": "x", "url": "https://example.edu/", "fetchedAt": fetched_at });
    let snapshot_edits: [(&str, Value); 15] = [
        ("school", json!("NTHU")),
        ("school", json!("example")),
        ("term", json!("115-4")),
        ("schoolNameEn", json!("")),
        ("schoolName", json!("清華\u{0}")),
        (
            "source",
            json!({ "name": "x", "url": "https://example.edu/" }),
        ),
        (
            "source",
            json!({ "name": "x", "url": "HTTPS:example.edu", "fetchedAt": "2026-11-20T02:30:00Z" }),
        ),
        ("source", source("2026-11-20 02:30")),
        ("source", source("2026-11-20T24:00:00Z")),
        ("source", source("2026-13-01T00:00:00Z")),
        ("source", source("2026-02-29T00:00:00Z")),
        ("source", source("2026-11-20T02:30:60Z")),
        ("source", source("2026-11-20T02:30:00.1234567890Z")),
        ("source", source("2026-11-20T02:30:00+08:00")),
        ("unexpected", json!(true)),
    ];
    for (field, value) in snapshot_edits {
        let bytes = edited(NTHU, |snapshot| snapshot[field] = value.clone());
        assert!(
            parse_snapshot(&bytes).is_err(),
            "accepted {field} = {value}"
        );
    }
}

#[test]
fn accepts_valid_edge_values() {
    let bytes = edited(NTHU, |snapshot| {
        snapshot["source"]["url"] = json!("HTTPS://www.nthu.edu.tw/");
        snapshot["source"]["fetchedAt"] = json!("2028-02-29T23:59:59.123456789Z");
        snapshot["offerings"][0]["credits"] = json!(2.2);
        snapshot["offerings"][1]["credits"] = json!(999.99);
        snapshot["offerings"][0]["capacity"] = json!(2_147_483_647);
        snapshot["offerings"][0]["enrolled"] = json!(2_147_483_647);
        snapshot["offerings"][1]["enrolled"] = json!(0);
    });
    parse_snapshot(&bytes).unwrap();
}

#[sqlx::test(migrator = "MIGRATOR")]
async fn demo_snapshots_do_not_rename_schools(pool: PgPool) {
    let live = parse_snapshot(&edited(NTHU, |snapshot| {
        snapshot["isDemo"] = json!(false);
        snapshot["term"] = json!("114-2");
        snapshot["schoolName"] = json!("清華大學（正式）");
        snapshot.as_object_mut().unwrap().remove("schoolNameEn");
    }))
    .unwrap();
    import(&pool, &live).await.unwrap();
    let names = || async {
        let school = schools(&pool).await.unwrap().remove(0);
        (school.name, school.name_en)
    };
    assert_eq!(names().await, ("清華大學（正式）".into(), None));

    import(&pool, &parse_snapshot(NTHU).unwrap()).await.unwrap();
    assert_eq!(names().await, ("清華大學（正式）".into(), None));

    let renamed = parse_snapshot(&edited(NTHU, |snapshot| {
        snapshot["isDemo"] = json!(false);
        snapshot["term"] = json!("114-2");
    }))
    .unwrap();
    import(&pool, &renamed).await.unwrap();
    assert_eq!(
        names().await,
        (
            "國立清華大學".into(),
            Some("National Tsing Hua University".into())
        )
    );
}

#[sqlx::test(migrator = "MIGRATOR")]
async fn rejects_snapshots_older_than_the_imported_one(pool: PgPool) {
    let at = |fetched_at: Option<&str>| {
        parse_snapshot(&edited(NTHU, |snapshot| match fetched_at {
            Some(fetched_at) => snapshot["source"]["fetchedAt"] = json!(fetched_at),
            None => {
                snapshot.as_object_mut().unwrap().remove("source");
            }
        }))
        .unwrap()
    };
    let fetched_at = |pool: PgPool| async move {
        sqlx::query_scalar::<_, Option<String>>(
            "SELECT to_char(fetched_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"')
             FROM course_snapshots WHERE school = 'nthu' AND term = '115-1'",
        )
        .fetch_one(&pool)
        .await
        .unwrap()
    };
    import(&pool, &at(Some("2026-11-20T02:30:00Z")))
        .await
        .unwrap();
    let error = import(&pool, &at(Some("2026-11-19T02:30:00Z")))
        .await
        .unwrap_err();
    assert!(error.to_string().contains("older"), "{error:#}");
    assert_eq!(
        fetched_at(pool.clone()).await.as_deref(),
        Some("2026-11-20T02:30:00Z")
    );
    assert_eq!(search(&pool, "", &school("nthu")).await.unwrap().len(), 3);

    // Same or newer time is accepted; a snapshot without a fetch time is not compared.
    import(&pool, &at(Some("2026-11-20T02:30:00Z")))
        .await
        .unwrap();
    import(&pool, &at(None)).await.unwrap();
    assert_eq!(fetched_at(pool.clone()).await, None);
    import(&pool, &at(Some("2026-11-01T00:00:00Z")))
        .await
        .unwrap();
    import(&pool, &at(Some("2026-11-21T00:00:00.5Z")))
        .await
        .unwrap();
    assert_eq!(
        fetched_at(pool.clone()).await.as_deref(),
        Some("2026-11-21T00:00:00Z")
    );
}

#[sqlx::test(migrator = "MIGRATOR")]
async fn snapshots_are_school_scoped_and_idempotent(pool: PgPool) {
    let ntnu = parse_snapshot(NTNU).unwrap();
    let nycu = parse_snapshot(NYCU).unwrap();
    import(&pool, &ntnu).await.unwrap();
    let original = search(
        &pool,
        "資料",
        &Filters {
            school: Some("ntnu"),
            term: Some("115-1"),
            department: None,
        },
    )
    .await
    .unwrap();
    import(&pool, &nycu).await.unwrap();
    import(&pool, &ntnu).await.unwrap();

    let all = search(&pool, "資料", &Filters::default()).await.unwrap();
    assert_eq!(all.len(), 2);
    assert_ne!(all[0].id, all[1].id);
    let result = search(&pool, "demo101", &school("ntnu")).await.unwrap();
    assert_eq!(result.len(), 1);
    assert_eq!(result[0].id, original[0].id);
    assert!(
        search(&pool, "%", &Filters::default())
            .await
            .unwrap()
            .is_empty()
    );
    assert!(
        search(&pool, "_", &Filters::default())
            .await
            .unwrap()
            .is_empty()
    );

    let mut live: Value = serde_json::from_slice(NTNU).unwrap();
    live["isDemo"] = json!(false);
    live["offerings"].as_array_mut().unwrap().remove(0);
    let live = parse_snapshot(&serde_json::to_vec(&live).unwrap()).unwrap();
    import(&pool, &live).await.unwrap();
    assert!(import(&pool, &ntnu).await.is_err());
    assert_eq!(
        search(&pool, "資料", &Filters::default()).await.unwrap()[0].school,
        "nycu"
    );
    let remaining = search(&pool, "教育", &school("ntnu")).await.unwrap();
    assert_eq!(remaining.len(), 1);
    assert!(!remaining[0].is_demo);
}

#[sqlx::test(migrator = "MIGRATOR")]
async fn v2_fields_round_trip(pool: PgPool) {
    import(&pool, &parse_snapshot(NTHU).unwrap()).await.unwrap();

    let found = search(&pool, "線性", &school("nthu")).await.unwrap();
    assert_eq!(found.len(), 1);
    let course = offering(&pool, found[0].id.parse().unwrap())
        .await
        .unwrap()
        .unwrap();
    assert_eq!(course.school_name, "國立清華大學");
    assert_eq!(course.term, "115-1");
    assert_eq!(course.course_code, "DEMO201");
    assert_eq!(course.class_code.as_deref(), Some("01"));
    assert_eq!(course.source_id, "demo-11510-001");
    assert_eq!(course.title_en.as_deref(), Some("Linear Algebra (Demo)"));
    assert_eq!(course.instructors, ["王示範"]);
    assert_eq!(course.department.as_deref(), Some("示範數學系"));
    assert_eq!(course.department_code.as_deref(), Some("DMATH"));
    assert_eq!(course.credits, Some(3.0));
    assert_eq!(course.requirement, Some(Requirement::Required));
    assert_eq!(course.requirement_text.as_deref(), Some("必修"));
    assert_eq!(
        course.schedule.as_deref(),
        Some(
            [
                Meeting {
                    day: 2,
                    periods: vec!["3".into(), "4".into()],
                    location: Some("示範館 101".into()),
                },
                Meeting {
                    day: 4,
                    periods: vec!["3".into()],
                    location: Some("示範館 101".into()),
                },
            ]
            .as_slice()
        )
    );
    assert_eq!(course.schedule_text.as_deref(), Some("T3T4R3 示範館101"));
    assert_eq!(course.capacity, Some(60));
    assert_eq!(course.enrolled, Some(58));
    assert_eq!(course.language.as_deref(), Some("中文"));
    assert_eq!(course.campus.as_deref(), Some("示範校區"));
    assert_eq!(course.grade.as_deref(), Some("1"));
    assert!(course.description.as_deref().unwrap().contains("向量空間"));
    assert_eq!(
        course.syllabus_url.as_deref(),
        Some("https://www.nthu.edu.tw/")
    );
    assert_eq!(course.source_url, "https://www.nthu.edu.tw/");
    assert_eq!(
        course.notes.as_deref(),
        Some("示範備註：本課程為合成資料。")
    );
    let extra = course.extra.unwrap();
    assert_eq!(extra["授課方式"], ExtraValue::Text("講授".into()));
    assert_eq!(extra["英文授課"], ExtraValue::Bool(false));
    assert_eq!(extra["附註"], ExtraValue::Null);
    assert_eq!(serde_json::to_value(&extra["權重"]).unwrap(), json!(1.5));
    assert!(course.is_demo);

    let sparse = search(&pool, "DEMO203", &Filters::default()).await.unwrap();
    assert_eq!(sparse.len(), 1);
    assert_eq!(sparse[0].requirement, Some(Requirement::General));
    assert!(sparse[0].credits.is_none() && sparse[0].schedule.is_none());
    assert!(sparse[0].extra.is_none() && sparse[0].class_code.is_none());
    assert!(sparse[0].enrolled.is_none());
    let programming = search(&pool, "DEMO202", &Filters::default()).await.unwrap();
    assert_eq!(programming[0].credits, Some(2.5));
    assert_eq!(programming[0].capacity, Some(0));
    assert_eq!(programming[0].schedule.as_ref().unwrap()[0].location, None);

    let api_json = serde_json::to_value(&programming[0]).unwrap();
    assert_eq!(api_json["titleEn"], "Introduction to Programming (Demo)");
    assert_eq!(api_json["enrolled"], 72);
    assert_eq!(api_json["requirement"], "elective");
    assert_eq!(
        api_json["schedule"],
        json!([{ "day": 1, "periods": ["a", "b"] }])
    );

    let nthu = schools(&pool).await.unwrap();
    assert_eq!(
        nthu[0].name_en.as_deref(),
        Some("National Tsing Hua University")
    );
    let (source_name, source_url, fetched_at): (String, String, String) = sqlx::query_as(
        "SELECT source_name, source_url,
             to_char(fetched_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"')
         FROM course_snapshots WHERE school = 'nthu' AND term = '115-1'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(source_name, "示範課程資料");
    assert_eq!(source_url, "https://www.nthu.edu.tw/");
    assert_eq!(fetched_at, "2026-11-20T02:30:00Z");
}

#[sqlx::test(migrator = "MIGRATOR")]
async fn v2_search_filters_and_reimport(pool: PgPool) {
    let nthu = parse_snapshot(NTHU).unwrap();
    import(&pool, &nthu).await.unwrap();
    let before = search(&pool, "", &school("nthu")).await.unwrap();
    assert_eq!(before.len(), 3);

    // Re-importing the same snapshot keeps offering IDs and does not duplicate rows.
    import(&pool, &nthu).await.unwrap();
    let after = search(&pool, "", &school("nthu")).await.unwrap();
    let ids = |rows: &[unicourse_catalog::Offering]| {
        let mut ids: Vec<_> = rows.iter().map(|row| row.id.clone()).collect();
        ids.sort();
        ids
    };
    assert_eq!(ids(&before), ids(&after));

    // English titles, departments and any instructor are searchable, case-insensitively.
    let titles = |rows: Vec<unicourse_catalog::Offering>| {
        rows.into_iter().map(|row| row.title).collect::<Vec<_>>()
    };
    let any = Filters::default();
    assert_eq!(
        titles(search(&pool, "linear algebra", &any).await.unwrap()),
        ["線性代數"]
    );
    assert_eq!(
        titles(search(&pool, "通識教育", &any).await.unwrap()),
        ["藝術與人文導論"]
    );
    assert_eq!(
        titles(search(&pool, "陳樣", &any).await.unwrap()),
        ["計算機程式設計"]
    );
    // Course codes match by prefix only.
    assert!(search(&pool, "EMO20", &any).await.unwrap().is_empty());
    assert_eq!(search(&pool, "demo20", &any).await.unwrap().len(), 3);

    // Exact department filter.
    let department = Filters {
        department: Some("示範數學系"),
        ..Filters::default()
    };
    assert_eq!(
        titles(search(&pool, "", &department).await.unwrap()),
        ["線性代數"]
    );
    let partial = Filters {
        department: Some("數學系"),
        ..Filters::default()
    };
    assert!(search(&pool, "", &partial).await.unwrap().is_empty());
    assert_eq!(
        departments(&pool, "nthu").await.unwrap(),
        ["示範數學系", "示範資訊工程學系", "示範通識教育中心"]
    );

    // Term filter and term listing (newest first).
    let older = parse_snapshot(&edited(NTHU, |snapshot| {
        snapshot["term"] = json!("114-2");
        snapshot["offerings"].as_array_mut().unwrap().truncate(1);
    }))
    .unwrap();
    import(&pool, &older).await.unwrap();
    import(&pool, &parse_snapshot(NTNU).unwrap()).await.unwrap();
    assert_eq!(terms(&pool).await.unwrap(), ["115-1", "114-2"]);
    let term = |term| Filters {
        school: Some("nthu"),
        term: Some(term),
        department: None,
    };
    assert_eq!(
        search(&pool, "線性", &term("114-2")).await.unwrap().len(),
        1
    );
    assert_eq!(search(&pool, "", &term("114-2")).await.unwrap().len(), 1);
    assert_eq!(search(&pool, "", &term("115-1")).await.unwrap().len(), 3);
    let both = search(&pool, "線性", &school("nthu")).await.unwrap();
    assert_eq!(
        both.iter().map(|row| row.term.as_str()).collect::<Vec<_>>(),
        ["115-1", "114-2"]
    );

    // A newer snapshot without an offering hides it from search and from the department list.
    let shrunk = parse_snapshot(&edited(NTHU, |snapshot| {
        snapshot["offerings"].as_array_mut().unwrap().truncate(2);
    }))
    .unwrap();
    import(&pool, &shrunk).await.unwrap();
    assert!(search(&pool, "DEMO203", &any).await.unwrap().is_empty());
    assert_eq!(
        departments(&pool, "nthu").await.unwrap(),
        ["示範數學系", "示範資訊工程學系"]
    );
}
