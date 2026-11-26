//! Nationwide institution list merged with crawl status and catalog stats (docs/stage3-contract.md).
//!
//! `data/institutions.json` (MOE open data, see `data/institutions.README.md`) and
//! `crawlers/status.json` are embedded at build time so the API binary needs no extra files.

use std::{collections::BTreeMap, sync::LazyLock};

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::Coverage;

const INSTITUTIONS_JSON: &str = include_str!("../../../data/institutions.json");
const STATUS_JSON: &str = include_str!("../../../crawlers/status.json");

#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize, Serialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum InstitutionKind {
    University,
    College,
    JuniorCollege,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize, Serialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum Ownership {
    Public,
    Private,
}

/// Higher-education system: general (incl. teacher education), technical and vocational,
/// military and police, religious colleges, or open universities.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize, Serialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum EducationSystem {
    General,
    Technical,
    MilitaryPolice,
    Religious,
    Open,
}

/// `live`: in the scheduled refresh; `partial`: crawler exists but is not scheduled or covers a
/// subset; `blocked`: the official source forbids or prevents crawling; `planned`: no crawler yet;
/// `none`: no entry in `crawlers/status.json` (no data source yet).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize, Serialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum CrawlStatus {
    Live,
    Partial,
    Blocked,
    Planned,
    None,
}

/// One row of `data/institutions.json`.
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct InstitutionRecord {
    pub code: String,
    pub name: String,
    pub name_en: Option<String>,
    /// Snapshot `school` value; see `data/institutions.README.md` for the derivation rule.
    pub slug: String,
    pub kind: InstitutionKind,
    pub ownership: Ownership,
    pub city: Option<String>,
    pub website: Option<String>,
    pub system: EducationSystem,
}

/// One entry of `crawlers/status.json`.
#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct StatusEntry {
    pub status: CrawlStatus,
    pub note: String,
    pub issue: Option<u32>,
    /// Crawler package under `crawlers/` that produces this school's snapshots when it is not the
    /// school's own package, e.g. `tvc` for the national 大學校院課程資源網. Absent means
    /// `crawlers/<slug>`, which then always wins over the national source.
    #[serde(default)]
    pub source: Option<String>,
}

pub static INSTITUTION_RECORDS: LazyLock<Vec<InstitutionRecord>> = LazyLock::new(|| {
    serde_json::from_str(INSTITUTIONS_JSON).expect("data/institutions.json is invalid")
});

pub static CRAWL_STATUS: LazyLock<BTreeMap<String, StatusEntry>> =
    LazyLock::new(|| serde_json::from_str(STATUS_JSON).expect("crawlers/status.json is invalid"));

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Institution {
    /// MOE 學校代碼: four characters, leading zeros kept (`0001`); religious colleges and open
    /// universities contain a letter (`1R02`, `0A01`).
    pub code: String,
    pub name: String,
    /// Set for schools with a dedicated crawler; the MOE list has no English names.
    pub name_en: Option<String>,
    /// School slug (`/api/schools/{slug}` once the school has imported offerings).
    pub slug: String,
    pub kind: InstitutionKind,
    pub ownership: Ownership,
    pub city: Option<String>,
    pub website: Option<String>,
    pub system: EducationSystem,
    pub status: CrawlStatus,
    /// Crawl status note (zh-TW).
    pub note: Option<String>,
    /// GitHub issue number in UniCourse-TW/UniCourse.
    pub issue: Option<u32>,
    /// Imported terms, newest first.
    pub terms: Vec<String>,
    /// All imported offerings, including withdrawn offerings; zero before the first import.
    pub offerings: i64,
    /// Distinct courses with any imported offering.
    pub courses: i64,
    /// Latest import time (ISO-8601 UTC), `null` before the first import.
    pub latest_imported_at: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Institutions {
    /// Every institution in the MOE list, by code.
    pub institutions: Vec<Institution>,
    /// Latest import time at any school (ISO-8601 UTC), `null` before the first import.
    pub updated_at: Option<String>,
}

pub fn institutions(coverage: &Coverage) -> Institutions {
    let updated_at = coverage
        .schools
        .iter()
        .map(|school| &school.latest_imported_at)
        .max()
        .cloned();
    let stats: BTreeMap<_, _> = coverage
        .schools
        .iter()
        .map(|school| (school.slug.as_str(), school))
        .collect();
    let institutions = INSTITUTION_RECORDS
        .iter()
        .map(|record| {
            let entry = CRAWL_STATUS.get(&record.slug);
            let school = stats.get(record.slug.as_str());
            let status = entry.map_or(CrawlStatus::None, |entry| entry.status);
            Institution {
                code: record.code.clone(),
                name: record.name.clone(),
                name_en: record.name_en.clone(),
                slug: record.slug.clone(),
                kind: record.kind,
                ownership: record.ownership,
                city: record.city.clone(),
                website: record.website.clone(),
                system: record.system,
                status,
                note: entry.map(|entry| entry.note.clone()),
                issue: entry.and_then(|entry| entry.issue),
                offerings: school.map_or(0, |school| school.offerings),
                courses: school.map_or(0, |school| school.courses),
                latest_imported_at: school.map(|school| school.latest_imported_at.clone()),
                terms: school
                    .map(|school| school.terms.clone())
                    .unwrap_or_default(),
            }
        })
        .collect();
    Institutions {
        institutions,
        updated_at,
    }
}

#[cfg(test)]
mod tests {
    use std::{collections::HashSet, path::Path};

    use super::*;
    use crate::SCHOOL_SLUGS;

    #[test]
    fn institution_codes_are_unique_four_character_codes() {
        assert!(INSTITUTION_RECORDS.len() > 100);
        let mut codes = HashSet::new();
        for record in INSTITUTION_RECORDS.iter() {
            assert!(
                record.code.len() == 4
                    && record
                        .code
                        .bytes()
                        .all(|byte| byte.is_ascii_digit() || byte.is_ascii_uppercase()),
                "bad code {:?}",
                record.code
            );
            assert!(codes.insert(&record.code), "duplicate code {}", record.code);
            assert!(!record.name.trim().is_empty());
        }
        // 學校代碼 in the main 大專校院名錄 is digits only.
        let general = INSTITUTION_RECORDS
            .iter()
            .filter(|record| {
                matches!(
                    record.system,
                    EducationSystem::General | EducationSystem::Technical
                )
            })
            .all(|record| record.code.bytes().all(|byte| byte.is_ascii_digit()));
        assert!(general);
    }

    #[test]
    fn slugs_are_unique_and_status_entries_are_known() {
        assert_eq!(
            SCHOOL_SLUGS.len(),
            INSTITUTION_RECORDS.len(),
            "a slug is used twice"
        );
        for slug in SCHOOL_SLUGS.iter() {
            assert!(
                (2..=16).contains(&slug.len())
                    && slug.starts_with(|c: char| c.is_ascii_lowercase())
                    && slug
                        .bytes()
                        .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit()),
                "bad slug {slug:?}"
            );
        }
        let crawlers = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../crawlers");
        for (slug, entry) in CRAWL_STATUS.iter() {
            assert!(
                SCHOOL_SLUGS.contains(slug.as_str()),
                "status for unknown {slug}"
            );
            assert_ne!(entry.status, CrawlStatus::None, "{slug}: none is API-only");
            assert!(!entry.note.trim().is_empty(), "{slug}: empty note");
            if let Some(source) = &entry.source {
                assert!(
                    crawlers.join(source).join("package.json").is_file(),
                    "{slug}: source crawlers/{source} does not exist"
                );
                assert_ne!(
                    source, slug,
                    "{slug}: omit source for the school's own crawler"
                );
            }
        }
    }

    #[test]
    fn every_crawler_package_has_a_status() {
        let crawlers = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../crawlers");
        let mut packages = 0;
        for entry in std::fs::read_dir(&crawlers).unwrap() {
            let path = entry.unwrap().path();
            let name = path.file_name().unwrap().to_str().unwrap().to_owned();
            // `tvc` (national platform) is a multi-school source, referenced by `source`;
            // `reviews-ptt` builds the external review index (docs/external-reviews.md).
            if name == "kit"
                || name == "tvc"
                || name == "reviews-ptt"
                || !path.join("package.json").is_file()
            {
                continue;
            }
            packages += 1;
            assert!(
                CRAWL_STATUS.contains_key(&name),
                "crawlers/{name} has no status"
            );
            assert!(
                SCHOOL_SLUGS.contains(name.as_str()),
                "crawlers/{name} is not a slug"
            );
        }
        assert!(packages > 0);
        // A school without a `source` is crawled by its own package (which then always wins over
        // the national source); one with a `source` may still keep a package, e.g. a blocked one.
        for (slug, entry) in CRAWL_STATUS.iter() {
            if entry.source.is_none() {
                assert!(
                    crawlers.join(slug).join("package.json").is_file(),
                    "{slug} has no source and no crawlers/{slug} package"
                );
            }
        }
    }
}
