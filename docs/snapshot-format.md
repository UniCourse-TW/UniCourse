# Course snapshot format (v2)

A snapshot is one JSON file holding the complete public course list of **one school for one term**.
Crawlers under `crawlers/` write snapshots; `crates/ingest` validates and imports them in one transaction.
Importing the same snapshot twice must not create duplicates; offerings missing from a newer snapshot
are deactivated (hidden from search) but never deleted.

Version 1 fields (the synthetic `fixtures/ntnu-115-1.json` and `fixtures/nycu-115-1.json`) stay valid: every field added in v2 is optional.
The canonical machine-readable schema is the Zod schema in `crawlers/kit/src/schema.ts`; the Rust side in
`crates/ingest` must accept exactly the same shape (`deny_unknown_fields`).

Field names mirror the historical UniCourse `course-pack` format (Backend repo) and the `NTNU-Course`
package where a reasonable equivalent exists (`code`, `credit`, `teachers` → `courseCode`, `credits`,
`instructors`).

## Top level

| field | type | required | meaning |
| --- | --- | --- | --- |
| `school` | string | yes | School slug from the fixed list in `crawlers/kit/src/schools.ts` (mirrored in `crates/ingest`); other slugs are rejected. |
| `schoolName` | string | yes | Official Chinese name, e.g. `國立臺灣大學`. |
| `schoolNameEn` | string | no | Official English name. |
| `term` | string | yes | Taiwanese academic year and term as `YYY-N`, e.g. `115-1`. `N` is 1, 2 or 3 (summer). |
| `isDemo` | boolean | yes | `true` only for synthetic data. A demo snapshot can never overwrite live data, and never renames a school that already exists. |
| `source` | object | no | `{ name, url, fetchedAt }`: human name of the official system, its entry URL, UTC time the crawl finished as `YYYY-MM-DDTHH:MM:SS[.fraction]Z` (1–9 fraction digits, a real calendar date and time). A snapshot whose `fetchedAt` is older than the one already imported for the same school and term is rejected; when either side has no `fetchedAt`, no comparison is made. |
| `offerings` | array | yes | Non-empty list of offerings (one row per 開課班次). |

## Offering

Identity: `(school, term, sourceId)` is the offering identity; `(school, courseCode)` groups the same course across terms.
Pick `sourceId` from the school's own stable per-term identifier (流水號 / 開課序號 / 當期課號).
If a school only provides a code that is stable across terms, use it as both `courseCode` and `sourceId`
(optionally suffixed with the class code).

| field | type | required | meaning |
| --- | --- | --- | --- |
| `sourceId` | string | yes | School's per-term unique identifier for this class section. Trimmed, non-empty. |
| `courseCode` | string | yes | School's course code (課號 / 科目代碼), stable across terms where the school has one. |
| `classCode` | string | no | Class/section code (班次 / 組別) when the school splits one course code into sections. |
| `title` | string | yes | Chinese course title. |
| `titleEn` | string | no | English course title. |
| `instructors` | string[] | yes | Instructor names, one per element, trimmed; may be empty. |
| `department` | string | no | Offering unit name (開課單位 / 系所). |
| `departmentCode` | string | no | Offering unit code as published by the school. |
| `credits` | number | no | Credits as a decimal number, at most two decimals, < 1000 (0–999.99); omit when unknown. |
| `requirement` | enum | no | `required`, `elective`, `general` (通識), `other`. Omit when unknown. |
| `requirementText` | string | no | Raw 必選修 text from the school (e.g. `必修`, `選修`, `通識`, `群修`). |
| `schedule` | array | no | Structured meeting times: `{ day, periods, location? }`. `day` is 1 (Mon) to 7 (Sun). `periods` lists the school's own period labels as strings in order (`"3"`, `"4"`, `"A"`). `location` is the room/building text. |
| `scheduleText` | string | no | Raw time/location text exactly as the school shows it. Always keep this when a school has schedule data, even when `schedule` is parsed. |
| `capacity` | integer | no | Enrollment limit (人數上限), 0–2147483647. |
| `enrolled` | integer | no | Students enrolled/registered as published by the school when crawled (選課人數 / 修課人數), 0–2147483647. Used for the historical popularity ranking; omit when the school does not publish it. |
| `language` | string | no | Teaching language as published (e.g. `中文`, `英語`). |
| `campus` | string | no | Campus name when multi-campus. |
| `grade` | string | no | Target year/grade as published (e.g. `1`, `碩1`). |
| `description` | string | no | Course description / 概述 text (plain text, trimmed). |
| `syllabusUrl` | string | no | URL of the official syllabus page for this offering. |
| `sourceUrl` | string | yes | HTTP(S) URL of the official page this record came from (a detail page when available, otherwise the query system entry). No credentials in the URL. |
| `notes` | string | no | Remarks (備註). |
| `extra` | object | no | School-specific fields that do not fit above, as `{ string: string | number | boolean | null }`. Keys are shown to students as labels: use the school's own UI label (Chinese), not API field names such as `unt_ls` or `gdeTpe`, and drop internal codes, sort keys and JSON blobs. Keys are non-empty, not `__proto__`, and contain no NUL. |

Rules

- Strings are trimmed and non-empty and never contain NUL (`\u0000`); drop the field instead of writing `""`.
- URLs (`source.url`, `syllabusUrl`, `sourceUrl`) are absolute: they start with `http://` or `https://`
  (any case), have a host and carry no credentials.
- Never invent data. If the school does not publish a field, omit it.
- Do not include personal data beyond instructor names as published by the school.
- Crawlers must only use public, login-free pages or official open-data endpoints, identify themselves with
  a `UniCourse` User-Agent, run at most two concurrent requests per school, and back off on 429/5xx.

## Known limitations

- Trimming: Zod (`String.prototype.trim`) and Rust (`str::trim`) use slightly different whitespace
  sets; e.g. JavaScript also trims U+FEFF (BOM), Rust does not. A hand-written value with such a
  character at either end may be trimmed by the kit but rejected by ingest. Crawlers write the value
  after Zod parsing, so their output is unaffected.
- `extra`: the Rust side rejects the `__proto__` key like Zod, but numbers are only checked for being
  valid JSON numbers; very large or very precise numbers may lose precision in JavaScript consumers.
