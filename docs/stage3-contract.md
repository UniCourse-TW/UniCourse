# Stage 3: nationwide institution list, crawl status page, 10-year history (contract)

## Institutions master list

`data/institutions.json` (committed) lists every Taiwanese 大專校院 from the Ministry of Education open data
(大專校院名錄 / 學校基本資料, data.gov.tw), one object per institution:

```
{ "code": "0001", "name": "國立政治大學", "nameEn": "National Chengchi University",
  "slug": "nccu" | null, "kind": "university" | "college" | "junior_college",
  "ownership": "public" | "private", "city": "臺北市", "website": "https://www.nccu.edu.tw/",
  "system": "general" | "technical" | "military_police" | "religious" | "open" }
```

`code` is the MOE 學校代碼 (string, leading zeros kept). `slug` links to our crawler slug when one
exists (the 12 current slugs), otherwise null. Keep the source URL and retrieval date in
`data/institutions.README.md`. Closed/merged schools are excluded.

## Crawl status

`crawlers/status.json` is hand-maintained, one entry per slug:

```
{ "ntu": { "status": "live", "note": "每日更新；課程網未刊登修課人數", "issue": null },
  "ncku": { "status": "blocked", "note": "查詢約 5 個系所後要求驗證碼", "issue": 40 }, ... }
```

`status`: `live` (in the nightly refresh), `partial` (crawler exists, not scheduled or subset only),
`blocked` (official source forbids or prevents crawling), `planned` (no crawler yet). `issue` is a
GitHub issue number in UniCourse-TW/UniCourse or null.

## API

`GET /api/institutions` → `{ institutions: Institution[], updatedAt }` where each item merges the
master list with live catalog stats:

```
{ ...institution fields..., "status": "live|partial|blocked|planned|none", "note": string|null,
  "issue": number|null, "terms": string[] (indexed, newest first), "offerings": number,
  "courses": number, "latestImportedAt": string|null }
```

`status` is `none` for institutions without a crawler slug. Stats are 0/empty for schools with no data.
Counts use the same imported terms and offerings as `/api/coverage`, including withdrawn offerings.
Both JSON files are embedded into the API binary at build time (`include_str!`) so the deploy image
needs no extra files; a unit test checks every slug in `status.json` exists in `institutions.json`
and in the Rust slug list, and that every crawler package under `crawlers/` has a status entry.

## Web

- Home: remove the 資料總覽 section (totals + per-school table). Keep search + ranking. Add one line
  under the ranking: 「目前收錄 N 校、M 個學期 · 查看各校收錄狀態」 linking to `/schools`.
- `/schools`: nationwide status page. Summary counts by status; then a table of all institutions
  grouped by `system` then `ownership` (or filterable), columns: 學校（代碼）, 狀態 badge, 收錄學期數 /
  班次數, 最近更新, 說明 (note + issue link). Live schools link to `/schools/{slug}`.
- `/schools/{slug}` stays as is.
