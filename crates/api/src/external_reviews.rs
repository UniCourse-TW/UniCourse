//! External review search index (docs/external-reviews.md): indexed posts plus outbound search links for
//! sources we may only link to.

use axum::{
    Json,
    extract::{Path, State, rejection::PathRejection},
    http::StatusCode,
};
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use serde::Serialize;
use sqlx::PgPool;
use unicourse_catalog::{self as catalog, ExternalReview, ExternalSourceCount};
use utoipa::ToSchema;

use crate::{ApiError, ErrorBody, database_error, error, path};

/// An outbound search link to a `link_only` source; nothing from that site is stored or shown.
#[derive(Debug, PartialEq, Eq, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub(crate) struct OutboundLink {
    /// Source id: `opt`, `dcard` or `ntu-rating`.
    source: &'static str,
    /// Human source name, e.g. `OPT 歐趴糖`.
    label: &'static str,
    url: String,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ExternalReviews {
    /// All indexed posts, by source (the list below is capped at 100).
    sources: Vec<ExternalSourceCount>,
    /// Up to 100 indexed posts, newest first.
    posts: Vec<ExternalReview>,
    /// Search links on sites we only link to, built from their public URL patterns.
    link_only: Vec<OutboundLink>,
}

/// JavaScript `encodeURIComponent`: everything but `A-Z a-z 0-9 - _ . ! ~ * ' ( )` is percent-encoded.
fn encode_component(value: &str) -> String {
    let mut encoded = String::with_capacity(value.len() * 3);
    for byte in value.bytes() {
        if byte.is_ascii_alphanumeric() || b"-_.!~*'()".contains(&byte) {
            encoded.push(byte as char);
        } else {
            encoded.push_str(&format!("%{byte:02X}"));
        }
    }
    encoded
}

/// Short school name as students write it in posts and searches.
fn short_name(school: &str) -> Option<&'static str> {
    Some(match school {
        "ntu" => "臺大",
        "ntnu" => "師大",
        "nycu" => "陽明交大",
        "nthu" => "清大",
        "ncku" => "成大",
        "nccu" => "政大",
        "nchu" => "中興",
        "ccu" => "中正",
        "ncu" => "中央",
        "fcu" => "逢甲",
        "tnua" => "北藝大",
        "ntua" => "臺藝大",
        _ => return None,
    })
}

/// OPT 歐趴糖 search result page: `search-result/` + base64url(encodeURIComponent(JSON conditions)), the
/// same encoding its own search box uses.
fn opt_link(keyword: &str) -> OutboundLink {
    let conditions = serde_json::json!({ "keyword": keyword, "type": 0, "order": "-modify_time" });
    let token = URL_SAFE_NO_PAD.encode(encode_component(&conditions.to_string()));
    OutboundLink {
        source: "opt",
        label: "OPT 歐趴糖",
        url: format!("https://www.1111opt.com.tw/search-result/{token}"),
    }
}

fn dcard_link(query: &str) -> OutboundLink {
    OutboundLink {
        source: "dcard",
        label: "Dcard",
        url: format!(
            "https://www.dcard.tw/search?query={}",
            encode_component(query)
        ),
    }
}

/// 想鑑你 NTU Rating course search (NTU only).
fn ntu_rating_link(course: Option<&str>, instructor: Option<&str>) -> OutboundLink {
    let mut parameters = Vec::new();
    if let Some(course) = course {
        parameters.push(format!("courseName={}", encode_component(course)));
    }
    if let Some(instructor) = instructor {
        parameters.push(format!("instructor={}", encode_component(instructor)));
    }
    OutboundLink {
        source: "ntu-rating",
        label: "想鑑你 NTU Rating",
        url: format!("https://rating.myntu.me/search/0?{}", parameters.join("&")),
    }
}

/// Outbound search links for one course, most specific first.
pub(crate) fn course_links(school: &str, title: &str, instructors: &[String]) -> Vec<OutboundLink> {
    let teacher = instructors.first().map(String::as_str);
    let query = [short_name(school), Some(title), teacher]
        .into_iter()
        .flatten()
        .collect::<Vec<_>>()
        .join(" ");
    let mut links = Vec::new();
    if school == "ntu" {
        links.push(ntu_rating_link(Some(title), teacher));
    }
    links.push(opt_link(title));
    links.push(dcard_link(&query));
    links
}

/// Outbound search links for one teacher.
pub(crate) fn instructor_links(school: &str, name: &str) -> Vec<OutboundLink> {
    let query = [short_name(school), Some(name)]
        .into_iter()
        .flatten()
        .collect::<Vec<_>>()
        .join(" ");
    let mut links = Vec::new();
    if school == "ntu" {
        links.push(ntu_rating_link(None, Some(name)));
    }
    links.push(opt_link(name));
    links.push(dcard_link(&query));
    links
}

#[utoipa::path(get, operation_id = "courseExternalReviews", path = "/api/courses/{school}/{courseCode}/external-reviews", params(
    ("school" = String, Path, description = "School slug"),
    ("courseCode" = String, Path, description = "Cross-term course code (URL-encoded)")
), responses(
    (status = 200, description = "Indexed posts about the course from other sites, newest first, plus outbound search links", body = ExternalReviews),
    (status = 400, body = ErrorBody),
    (status = 404, body = ErrorBody),
    (status = 500, body = ErrorBody)
))]
pub(crate) async fn course(
    State(pool): State<PgPool>,
    segments: Result<Path<(String, String)>, PathRejection>,
) -> Result<Json<ExternalReviews>, ApiError> {
    let (school, code) = path(segments, "Course not found", |(school, code)| {
        vec![school.as_str(), code.as_str()]
    })?;
    let (title, instructors) = catalog::course_identity(&pool, &school, &code)
        .await
        .map_err(database_error)?
        .ok_or_else(|| error(StatusCode::NOT_FOUND, "Course not found"))?;
    let (sources, posts) = catalog::course_external_reviews(&pool, &school, &code)
        .await
        .map_err(database_error)?;
    Ok(Json(ExternalReviews {
        sources,
        posts,
        link_only: course_links(&school, &title, &instructors),
    }))
}

#[utoipa::path(get, operation_id = "instructorExternalReviews", path = "/api/instructors/{school}/{name}/external-reviews", params(
    ("school" = String, Path, description = "School slug"),
    ("name" = String, Path, description = "Instructor name exactly as published (URL-encoded)")
), responses(
    (status = 200, description = "Indexed posts naming the teacher, newest first, plus outbound search links", body = ExternalReviews),
    (status = 400, body = ErrorBody),
    (status = 404, body = ErrorBody),
    (status = 500, body = ErrorBody)
))]
pub(crate) async fn instructor(
    State(pool): State<PgPool>,
    segments: Result<Path<(String, String)>, PathRejection>,
) -> Result<Json<ExternalReviews>, ApiError> {
    let (school, name) = path(segments, "Instructor not found", |(school, name)| {
        vec![school.as_str(), name.as_str()]
    })?;
    let name = name.trim().to_owned();
    if name.is_empty() || !catalog::SCHOOL_SLUGS.contains(&school.as_str()) {
        return Err(error(StatusCode::NOT_FOUND, "Instructor not found"));
    }
    let (sources, posts) = catalog::instructor_external_reviews(&pool, &school, &name)
        .await
        .map_err(database_error)?;
    Ok(Json(ExternalReviews {
        sources,
        posts,
        link_only: instructor_links(&school, &name),
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn component_encoding_matches_javascript() {
        assert_eq!(encode_component("a b&c/d"), "a%20b%26c%2Fd");
        assert_eq!(encode_component("(ok)!*'~._-"), "(ok)!*'~._-");
        assert_eq!(encode_component("物理"), "%E7%89%A9%E7%90%86");
    }

    #[test]
    fn opt_link_decodes_to_the_search_conditions() {
        let link = opt_link("普通物理");
        let token = link.url.rsplit('/').next().unwrap();
        let decoded = String::from_utf8(URL_SAFE_NO_PAD.decode(token).unwrap()).unwrap();
        // The page decodes with decodeURIComponent(atob(token)).
        assert!(decoded.starts_with("%7B%22keyword%22%3A%22%E6%99%AE"));
        assert!(decoded.contains("modify_time"));
    }

    #[test]
    fn course_links_are_school_specific() {
        let teachers = vec!["王小明".to_owned()];
        let ntu = course_links("ntu", "普通物理", &teachers);
        assert_eq!(
            ntu.iter().map(|link| link.source).collect::<Vec<_>>(),
            ["ntu-rating", "opt", "dcard"]
        );
        assert_eq!(
            ntu[0].url,
            "https://rating.myntu.me/search/0?courseName=%E6%99%AE%E9%80%9A%E7%89%A9%E7%90%86&instructor=%E7%8E%8B%E5%B0%8F%E6%98%8E"
        );
        let nthu = course_links("nthu", "線性代數", &[]);
        assert_eq!(nthu.len(), 2);
        assert_eq!(
            nthu[1].url,
            "https://www.dcard.tw/search?query=%E6%B8%85%E5%A4%A7%20%E7%B7%9A%E6%80%A7%E4%BB%A3%E6%95%B8"
        );
    }
}
