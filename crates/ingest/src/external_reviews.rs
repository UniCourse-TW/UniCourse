//! External review snapshots (docs/external-reviews.md): validation, matching to catalog courses and an
//! idempotent import keyed by `(source, url)`.
//!
//! The accepted shape mirrors `ExternalReviewSnapshot` in `crawlers/kit/src/external-reviews.ts`.

use std::collections::{HashMap, HashSet};

use anyhow::{Result, bail, ensure};
use serde::Deserialize;
use sqlx::PgPool;
use unicourse_catalog::SCHOOL_SLUGS;

use crate::{
    ensure_http_url, ensure_optional_text, ensure_text, is_text, is_utc_timestamp, present,
};

/// Maximum excerpt length in Unicode code points.
pub const EXCERPT_MAX: usize = 120;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Snapshot {
    format: String,
    version: u32,
    source: String,
    board: String,
    board_url: String,
    #[serde(default, deserialize_with = "present")]
    school: Option<String>,
    is_demo: bool,
    fetched_at: String,
    posts: Vec<Post>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Post {
    url: String,
    title: String,
    #[serde(default, deserialize_with = "present")]
    author: Option<String>,
    #[serde(default, deserialize_with = "present")]
    posted_at: Option<String>,
    #[serde(default, deserialize_with = "present")]
    push_score: Option<i32>,
    #[serde(default, deserialize_with = "present")]
    excerpt: Option<String>,
    #[serde(default, deserialize_with = "present")]
    tag: Option<String>,
    #[serde(default, deserialize_with = "present")]
    term: Option<String>,
    #[serde(default, deserialize_with = "present")]
    course_title: Option<String>,
    #[serde(default, deserialize_with = "present")]
    teachers: Option<Vec<String>>,
}

/// An external review snapshot that passed every check in [`parse_external_reviews`].
pub struct ValidExternalReviews(Snapshot);

impl ValidExternalReviews {
    pub fn board(&self) -> &str {
        &self.0.board
    }
}

fn is_term(value: &str) -> bool {
    value.split_once('-').is_some_and(|(year, term)| {
        year.len() == 3
            && year.bytes().all(|byte| byte.is_ascii_digit())
            && matches!(term, "1" | "2" | "3")
    })
}

fn validate_post(post: &Post, snapshot: &Snapshot) -> Result<()> {
    ensure_http_url(&post.url, "url")?;
    // Real PTT posts must link to PTT itself; demo data uses example URLs.
    if snapshot.source == "ptt" && !snapshot.is_demo {
        ensure!(
            post.url.starts_with("https://www.ptt.cc/"),
            "ptt url must start with https://www.ptt.cc/"
        );
    }
    ensure_text(&post.title, "title")?;
    for (value, field) in [
        (&post.author, "author"),
        (&post.excerpt, "excerpt"),
        (&post.tag, "tag"),
        (&post.course_title, "courseTitle"),
    ] {
        ensure_optional_text(value.as_ref(), field)?;
    }
    if let Some(excerpt) = &post.excerpt {
        ensure!(
            excerpt.chars().count() <= EXCERPT_MAX,
            "excerpt must be at most {EXCERPT_MAX} characters"
        );
    }
    if let Some(posted_at) = &post.posted_at {
        ensure!(
            is_utc_timestamp(posted_at),
            "postedAt must be an ISO-8601 UTC timestamp"
        );
    }
    if let Some(score) = post.push_score {
        ensure!(
            (-1_000_000..=1_000_000).contains(&score),
            "pushScore out of range"
        );
    }
    if let Some(term) = &post.term {
        ensure!(is_term(term), "expected term in YYY-N format");
    }
    if let Some(teachers) = &post.teachers {
        ensure!(
            !teachers.is_empty() && teachers.iter().all(|name| is_text(name)),
            "teachers must be a non-empty list of trimmed names without NUL"
        );
    }
    Ok(())
}

pub fn parse_external_reviews(bytes: &[u8]) -> Result<ValidExternalReviews> {
    let snapshot: Snapshot = serde_json::from_slice(bytes)?;
    ensure!(
        snapshot.format == "external-reviews",
        "format must be \"external-reviews\""
    );
    ensure!(
        snapshot.version == 1,
        "unsupported external-reviews version {}",
        snapshot.version
    );
    ensure!(
        snapshot.source == "ptt",
        "unknown source {:?}",
        snapshot.source
    );
    ensure_text(&snapshot.board, "board")?;
    ensure_http_url(&snapshot.board_url, "boardUrl")?;
    if let Some(school) = &snapshot.school {
        ensure!(
            SCHOOL_SLUGS.contains(&school.as_str()),
            "unknown school slug {school:?}"
        );
    }
    ensure!(
        is_utc_timestamp(&snapshot.fetched_at),
        "fetchedAt must be an ISO-8601 UTC timestamp"
    );
    let mut urls = HashSet::new();
    for post in &snapshot.posts {
        if let Err(error) = validate_post(post, &snapshot) {
            bail!("post {:?}: {error:#}", post.url);
        }
        ensure!(urls.insert(&post.url), "duplicate url: {}", post.url);
    }
    Ok(ValidExternalReviews(snapshot))
}

/// Normalise a course title for matching: fullwidth to halfwidth, lower case, 臺 → 台, roman numerals to
/// Chinese ones, and every character that is not a letter or digit (punctuation, brackets, spaces) dropped.
pub fn normalise_title(value: &str) -> String {
    value
        .chars()
        .map(halfwidth)
        .flat_map(char::to_lowercase)
        .map(|character| match character {
            '臺' => '台',
            'ⅰ' | 'Ⅰ' => '一',
            'ⅱ' | 'Ⅱ' => '二',
            'ⅲ' | 'Ⅲ' => '三',
            'ⅳ' | 'Ⅳ' => '四',
            other => other,
        })
        .filter(|character| character.is_alphanumeric())
        .collect()
}

/// Normalise a person name: halfwidth, no spaces or punctuation, without a trailing 老師/教授.
pub fn normalise_name(value: &str) -> String {
    let name: String = value
        .chars()
        .map(halfwidth)
        .flat_map(char::to_lowercase)
        .filter(|character| character.is_alphanumeric())
        .collect();
    ["老師", "教授", "講師", "助教"]
        .iter()
        .find_map(|suffix| name.strip_suffix(suffix).filter(|rest| !rest.is_empty()))
        .unwrap_or(&name)
        .to_owned()
}

fn halfwidth(character: char) -> char {
    match character {
        '\u{3000}' => ' ',
        '\u{FF01}'..='\u{FF5E}' => char::from_u32(character as u32 - 0xFEE0).unwrap_or(character),
        other => other,
    }
}

/// How a post was matched to a course.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum MatchKind {
    /// Same normalised title and one of the post's teachers teaches it.
    Exact,
    /// Same normalised title, no teacher in the post, and only one course at the school has that title.
    Title,
    /// One title contains the other and one of the post's teachers teaches it.
    Contains,
}

impl MatchKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Exact => "exact",
            Self::Title => "title",
            Self::Contains => "contains",
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CourseMatch {
    pub course_code: String,
    /// Catalog spelling of the matched teacher.
    pub instructor: Option<String>,
    pub kind: MatchKind,
}

#[derive(Default)]
struct Course {
    titles: HashSet<String>,
    /// Normalised name → catalog spelling.
    instructors: HashMap<String, String>,
    terms: HashSet<String>,
    newest_term: String,
}

/// The courses of one school, indexed for matching.
#[derive(Default)]
pub struct Catalog {
    courses: HashMap<String, Course>,
    by_title: HashMap<String, Vec<String>>,
    /// Normalised instructor name → (catalog spelling, course codes).
    by_instructor: HashMap<String, (String, Vec<String>)>,
}

impl Catalog {
    /// Build from `(course_code, title, instructors, term)` rows, one per offering.
    pub fn new<'a>(
        offerings: impl IntoIterator<Item = (&'a str, &'a str, &'a [String], &'a str)>,
    ) -> Self {
        let mut catalog = Self::default();
        for (code, title, instructors, term) in offerings {
            let course = catalog.courses.entry(code.to_owned()).or_default();
            let title = normalise_title(title);
            if !title.is_empty() && course.titles.insert(title.clone()) {
                catalog
                    .by_title
                    .entry(title)
                    .or_default()
                    .push(code.to_owned());
            }
            for name in instructors {
                let key = normalise_name(name);
                if key.is_empty() {
                    continue;
                }
                if course
                    .instructors
                    .insert(key.clone(), name.clone())
                    .is_none()
                {
                    let entry = catalog
                        .by_instructor
                        .entry(key)
                        .or_insert_with(|| (name.clone(), Vec::new()));
                    entry.1.push(code.to_owned());
                }
            }
            course.terms.insert(term.to_owned());
            if term > course.newest_term.as_str() {
                course.newest_term = term.to_owned();
            }
        }
        catalog
    }

    /// The catalog spelling of the first post teacher who teaches anything at the school.
    pub fn instructor(&self, teachers: &[String]) -> Option<String> {
        teachers.iter().find_map(|name| {
            self.by_instructor
                .get(&normalise_name(name))
                .map(|(name, _)| name.clone())
        })
    }

    /// Prefer the course offered in the post's term, then the most recently offered one, then the code.
    fn best<'a>(
        &self,
        codes: impl IntoIterator<Item = &'a String>,
        term: Option<&str>,
    ) -> Option<&'a String> {
        codes.into_iter().max_by(|a, b| {
            let (left, right) = (&self.courses[*a], &self.courses[*b]);
            let in_term = |course: &Course| term.is_some_and(|term| course.terms.contains(term));
            in_term(left)
                .cmp(&in_term(right))
                .then_with(|| left.newest_term.cmp(&right.newest_term))
                .then_with(|| b.cmp(a))
        })
    }

    fn teacher_of(&self, code: &str, teachers: &[String]) -> Option<String> {
        let course = &self.courses[code];
        teachers
            .iter()
            .find_map(|name| course.instructors.get(&normalise_name(name)).cloned())
    }

    fn exact(&self, title: &str, teachers: &[String], term: Option<&str>) -> Option<CourseMatch> {
        let codes = self.by_title.get(&normalise_title(title))?;
        let taught: Vec<_> = codes
            .iter()
            .filter(|code| self.teacher_of(code, teachers).is_some())
            .collect();
        let code = self.best(taught, term)?;
        Some(CourseMatch {
            course_code: code.clone(),
            instructor: self.teacher_of(code, teachers),
            kind: MatchKind::Exact,
        })
    }

    fn contains(
        &self,
        title: &str,
        teachers: &[String],
        term: Option<&str>,
    ) -> Option<CourseMatch> {
        let wanted = normalise_title(title);
        if wanted.chars().count() < 2 {
            return None;
        }
        let mut candidates: Vec<(usize, &String)> = Vec::new();
        for name in teachers {
            let Some((_, codes)) = self.by_instructor.get(&normalise_name(name)) else {
                continue;
            };
            for code in codes {
                // The closest title wins: the smallest length difference between the two titles.
                let distance = self.courses[code]
                    .titles
                    .iter()
                    .filter(|candidate| candidate.chars().count() >= 2)
                    .filter(|candidate| {
                        candidate.contains(&wanted) || wanted.contains(candidate.as_str())
                    })
                    .map(|candidate| candidate.chars().count().abs_diff(wanted.chars().count()))
                    .min();
                if let Some(distance) = distance {
                    candidates.push((distance, code));
                }
            }
        }
        let closest = candidates.iter().map(|(distance, _)| *distance).min()?;
        let code = self.best(
            candidates
                .iter()
                .filter(|(distance, _)| *distance == closest)
                .map(|(_, code)| *code),
            term,
        )?;
        Some(CourseMatch {
            course_code: code.clone(),
            instructor: self.teacher_of(code, teachers),
            kind: MatchKind::Contains,
        })
    }

    /// Match a post: exact title with the same teacher first, then title-contains with the same teacher,
    /// each also trying the swapped reading of a two-part title (`王小明 微積分` vs `微積分 王小明`);
    /// without any teacher, an exact title that names exactly one course at the school.
    pub fn find(
        &self,
        course_title: Option<&str>,
        teachers: &[String],
        term: Option<&str>,
    ) -> Option<CourseMatch> {
        let title = course_title?;
        let swapped = (teachers.len() == 1).then(|| (teachers[0].as_str(), [title.to_owned()]));
        let readings: Vec<(&str, &[String])> = std::iter::once((title, teachers))
            .chain(
                swapped
                    .as_ref()
                    .map(|(title, teachers)| (*title, teachers.as_slice())),
            )
            .collect();
        if !teachers.is_empty() {
            for (title, teachers) in &readings {
                if let Some(found) = self.exact(title, teachers, term) {
                    return Some(found);
                }
            }
            for (title, teachers) in &readings {
                if let Some(found) = self.contains(title, teachers, term) {
                    return Some(found);
                }
            }
            return None;
        }
        match self.by_title.get(&normalise_title(title))?.as_slice() {
            [code] => Some(CourseMatch {
                course_code: code.clone(),
                instructor: None,
                kind: MatchKind::Title,
            }),
            _ => None,
        }
    }
}

/// Load every offering of `school` (active or not: reviews may be about past terms) into a [`Catalog`].
pub async fn load_catalog(pool: &PgPool, school: &str) -> Result<Catalog> {
    let rows: Vec<(String, String, Vec<String>, String)> = sqlx::query_as(
        "SELECT course_code, title, instructors, term FROM offerings WHERE school = $1",
    )
    .bind(school)
    .fetch_all(pool)
    .await?;
    Ok(Catalog::new(rows.iter().map(
        |(code, title, instructors, term)| {
            (
                code.as_str(),
                title.as_str(),
                instructors.as_slice(),
                term.as_str(),
            )
        },
    )))
}

#[derive(Debug, Default, PartialEq, Eq)]
pub struct ImportSummary {
    pub posts: usize,
    pub matched: usize,
    /// Posts that kept an existing live row because this snapshot is demo data.
    pub skipped: usize,
}

/// Import one validated snapshot in a single transaction. Rows are keyed by `(source, url)`, so importing the
/// same file again updates in place; posts missing from a newer snapshot are kept. Every post is matched
/// against the catalog as it is at import time, so re-importing after a catalog import refreshes matches.
pub async fn import_external_reviews(
    pool: &PgPool,
    snapshot: &ValidExternalReviews,
) -> Result<ImportSummary> {
    let ValidExternalReviews(snapshot) = snapshot;
    let catalog = match &snapshot.school {
        Some(school) => load_catalog(pool, school).await?,
        None => Catalog::default(),
    };
    let mut summary = ImportSummary::default();
    let mut transaction = pool.begin().await?;
    for post in &snapshot.posts {
        let teachers = post.teachers.clone().unwrap_or_default();
        let found = catalog.find(
            post.course_title.as_deref(),
            &teachers,
            post.term.as_deref(),
        );
        let instructor = found
            .as_ref()
            .and_then(|found| found.instructor.clone())
            .or_else(|| catalog.instructor(&teachers));
        let written = sqlx::query(
            "INSERT INTO external_reviews (source, board, url, title, author, posted_at, push_score,
                 excerpt, tag, term, course_title, teachers, school, course_code, instructor, match_kind,
                 is_demo, fetched_at)
             VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
                 $17, $18::timestamptz)
             ON CONFLICT (source, url) DO UPDATE SET board = EXCLUDED.board, title = EXCLUDED.title,
                 author = EXCLUDED.author, posted_at = EXCLUDED.posted_at,
                 push_score = EXCLUDED.push_score, excerpt = EXCLUDED.excerpt, tag = EXCLUDED.tag,
                 term = EXCLUDED.term, course_title = EXCLUDED.course_title,
                 teachers = EXCLUDED.teachers, school = EXCLUDED.school,
                 course_code = EXCLUDED.course_code, instructor = EXCLUDED.instructor,
                 match_kind = EXCLUDED.match_kind, is_demo = EXCLUDED.is_demo,
                 fetched_at = EXCLUDED.fetched_at, imported_at = now()
             WHERE NOT EXCLUDED.is_demo OR external_reviews.is_demo",
        )
        .bind(&snapshot.source)
        .bind(&snapshot.board)
        .bind(&post.url)
        .bind(&post.title)
        .bind(&post.author)
        .bind(&post.posted_at)
        .bind(post.push_score)
        .bind(&post.excerpt)
        .bind(&post.tag)
        .bind(&post.term)
        .bind(&post.course_title)
        .bind(&teachers)
        .bind(&snapshot.school)
        .bind(found.as_ref().map(|found| &found.course_code))
        .bind(&instructor)
        .bind(found.as_ref().map(|found| found.kind.as_str()))
        .bind(snapshot.is_demo)
        .bind(&snapshot.fetched_at)
        .execute(&mut *transaction)
        .await?;
        if written.rows_affected() == 0 {
            summary.skipped += 1;
            continue;
        }
        summary.posts += 1;
        summary.matched += usize::from(found.is_some());
    }
    transaction.commit().await?;
    Ok(summary)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn names(values: &[&str]) -> Vec<String> {
        values.iter().map(|value| (*value).to_owned()).collect()
    }

    #[test]
    fn titles_and_names_are_normalised() {
        assert_eq!(normalise_title("普通物理（一）"), "普通物理一");
        assert_eq!(normalise_title("Ｃａｌｃｕｌｕｓ　Ⅱ"), "calculus二");
        assert_eq!(normalise_title("[臺灣史] 導論!"), "台灣史導論");
        assert_eq!(normalise_name(" 王小明老師 "), "王小明");
        assert_eq!(normalise_name("老師"), "老師");
    }

    #[test]
    fn matching_prefers_exact_then_contains_and_tries_the_swap() {
        let wang = names(&["王小明"]);
        let lee = names(&["李大華", "王小明"]);
        let catalog = Catalog::new([
            ("PHY101", "普通物理(一)", wang.as_slice(), "113-1"),
            ("PHY101", "普通物理(一)", wang.as_slice(), "114-1"),
            ("PHY102", "普通物理一", lee.as_slice(), "112-1"),
            ("MATH1", "微積分甲上", lee.as_slice(), "113-1"),
            ("ONLY1", "量子演算法", &[][..], "113-1"),
        ]);
        let found = catalog
            .find(Some("普通物理一"), &names(&["王小明"]), None)
            .unwrap();
        assert_eq!(
            (found.course_code.as_str(), found.kind),
            ("PHY101", MatchKind::Exact)
        );
        assert_eq!(found.instructor.as_deref(), Some("王小明"));
        // In the post's term, PHY102 wins over the more recent PHY101.
        let found = catalog
            .find(Some("普通物理一"), &names(&["王小明"]), Some("112-1"))
            .unwrap();
        assert_eq!(found.course_code, "PHY102");
        // Swapped title and teacher.
        let found = catalog
            .find(Some("李大華"), &names(&["普通物理（一）"]), None)
            .unwrap();
        assert_eq!(
            (found.course_code.as_str(), found.kind),
            ("PHY102", MatchKind::Exact)
        );
        // Title contains with the same teacher.
        let found = catalog
            .find(Some("微積分"), &names(&["李大華老師"]), None)
            .unwrap();
        assert_eq!(
            (found.course_code.as_str(), found.kind),
            ("MATH1", MatchKind::Contains)
        );
        // A teacher who does not teach it: no match, even though the title exists.
        assert_eq!(
            catalog.find(Some("普通物理一"), &names(&["陳無名"]), None),
            None
        );
        // No teacher: only a unique title matches.
        let found = catalog.find(Some("量子演算法"), &[], None).unwrap();
        assert_eq!(found.kind, MatchKind::Title);
        assert_eq!(catalog.find(Some("普通物理一"), &[], None), None);
        assert_eq!(
            catalog.instructor(&names(&["路人", "李大華"])).as_deref(),
            Some("李大華")
        );
    }
}
