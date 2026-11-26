# NTHU crawler

## Source and access

The [NTHU Division of Curriculum open-data page](https://curricul.site.nthu.edu.tw/p/404-1208-111356.php?Lang=zh-tw#json) documents the daily whole-term JSON export. Its [current-term download page](https://curricul.site.nthu.edu.tw/p/404-1208-308552.php?Lang=zh-tw) downloads that export from the [public JSON delivery endpoint](https://nthu-courses-proxy.philosophysis.workers.dev/) in its own JavaScript. The same office publishes the [course-number, period, and department code guide](https://curricul.site.nthu.edu.tw/p/406-1208-290466,r7880.php?Lang=zh-tw), used to map department names.

Access checked November 27, 2026 (Taipei): no login or credentials. The curriculum site's `robots.txt` allows `/`. The delivery endpoint returned a JSON course list rather than a robots policy at `/robots.txt`; no crawl directives were present. The original `www.ccxp.nthu.edu.tw` host disallows crawling except its exact inquiry entry, so the crawler does not request it. No separate terms or license grant was found on the cited download pages; the office explicitly describes the JSON as suitable for systems integration. Its instructions say the data is updated daily rather than in real time.

The office also publishes [historical course workbooks](https://curricul.site.nthu.edu.tw/p/404-1208-306821.php?Lang=zh-tw) and [dated enrollment workbooks](https://curricul.site.nthu.edu.tw/p/404-1208-134751.php?Lang=zh-tw). `114-2`, `114-1`, `113-2`, and `113-1` use their named archive sheets rather than the rolling JSON. XLSX processing needs `python3` (3.8+, standard library only). The crawler checks the term embedded in each course identifier, including those in the enrollment files. An uncatalogued term fails if the rolling feed contains a different term.

## Past terms (oldest available: 104-1)

The office's archives start with the 104 academic year; nothing older is published. Terms `104-1`–`112-2` come from three multi-term workbooks that are filtered to the requested term by the year/semester prefix of `科號` (summer terms `-3` are in the files but not crawled):

| Terms | Workbook (sheet) | Layout |
| --- | --- | --- |
| `104-1`–`107-2` | `104_107cousedata.xlsx` (`104-107`) | `課名`, `學分`, `教師` (one row per instructor), `開課單位`, `總人數`, `通識相關`, `領域別`, `課程屬性`, `英文課名`. No schedule, room, capacity or remarks. |
| `108-1`–`110-2` | `108-110coursedata_n(3).xlsx` (`108-110`) | Full layout with `上課時間`, `教室`, `人限`, `課程列入系所班別`, `通識分類`, `總人數`. Instructors comma-separated. |
| `111-1`–`112-2` | `111all-113all_courses_redo.xlsx` (`111全及112全`) | Same as 108–110 with `備註欄`, `code`, `系所全名`; counts are post-withdrawal (see the sheet `資料日期`). |

Quirks and decisions:

- `總人數` is mapped to `enrolled` for all of 104–112. For 108–110 the workbook was downloaded after the 110-2 withdrawal period (2022-05-04); the 104–107 file does not state a date.
- 104–107: duplicate rows per instructor are merged (rows that differ in any other column still fail as duplicates). Two-character names padded with spaces (`沈  琪`) are collapsed, and organisation placeholders in the instructor column (`TIGP Program`, `BME／CHE`, `…專班`) are dropped; the same cleaning applies to all archives.
- 106–107: about 1,600 rows (former NUTE units such as 藝設系, 體育系, 師培中心) carry only a four-digit serial instead of a full `科號`, repeated with different titles across terms, so they have no stable identity and are skipped (counted in the crawl log). Terms 104-x and 105-x contain no such rows.
- 105–107: the workbook's `英文課名` column belongs to other courses for roughly 75–80 % of the rows (checked against the 108–112 workbooks; 104 is consistent), so `titleEn` is omitted for these terms. Chinese titles and credits agree with later years.
- 105–107 have no 必選修 column; it is joined from the office's required/optional workbooks by full `科號` (`(redo)105-106_required_optional.xlsx` lists each program class with 必/選, `107-110_required_optional.xlsx` gives only 必修/選修). The source is recorded in `extra.必選修來源`.
- 104–107 lack schedules and capacities, so those fields are omitted.

Request volume: one request for 108–112 (and 104), two for 105–107 (catalogue plus requirement workbook); each fetch downloads the whole 0.5–2.5 MB workbook. Runtime is a few seconds per term.

Before retries, `115-1` makes three requests (daily JSON, department guide, enrollment workbook), `114-2` makes two (course archive and enrollment workbook), and the other three archived terms make one each. A smoke run downloads the same files before trimming the output.

```sh
corepack pnpm --filter @unicourse/crawler-nthu crawl -- --term 115-1 --out "$PWD/snapshots/nthu-115-1.json"
```

## Fields

| NTHU field | Snapshot field | Mapping |
| --- | --- | --- |
| `科號` | `sourceId`, `courseCode`, `classCode`, `departmentCode`, `grade` | Preserve the full padded offering identity. The stable course code is the department plus the four-digit subject, without the term or two-digit section; the course guide describes leading `1`–`4` as undergraduate year recommendations. |
| 開課代碼表 or workbook's 系所全名 / 開課系所 | `department` | Join the live department guide by the published code; use the school-provided name in archived rows. |
| `課程中文名稱`, `課程英文名稱` | `title`, `titleEn` | Trim and decode HTML entities. Where the archive provides only an English title, use that published title rather than dropping the offering. |
| `授課教師` | `instructors` | One instructor per line, with tab-separated Chinese and English names; prefer Chinese, fall back to English, and omit organization-only placeholders. |
| `學分數`, `人限` | `credits`, `capacity` | Parse as numbers. A blank `人限` means unlimited and is omitted. |
| `停修後人數` or `加退選後人數` | `enrolled` | The live JSON does not publish counts. Use post-withdrawal totals from the workbooks when present (`114-1`, `113-2`, `113-1`). For `114-2` and `115-1`, the published workbooks give post-add/drop counts as of 2026-03-09 and 2026-09-24, respectively; the post-withdrawal columns are blank. Join by the full course/section identifier, disregarding display padding, and omit missing counts. `extra.選課人數來源` links to the separate workbook used for a join. |
| `必選修說明`, `通識類別` | `requirementText`, `requirement` | Preserve tab-separated program requirements; mixed required/elective designations have no single enum. Explicit general-education category takes precedence in the enum. |
| `教室與上課時間` | `scheduleText`, `schedule` | Preserve text; parse room + tab + weekday/period pairs per line. `n` is the noon period. |
| `授課語言`, `備註` | `language`, `notes` | Keep published language labels (`中`, `英`); redact email addresses in remarks. |
| Remaining public columns | `extra` | Preserve nonblank values with original names, including `通識類別`, `停開註記` and `不可加簽說明`. |
| Curriculum office open-data page or archive workbook | `sourceUrl` | The exports do not publish permanent per-offering URLs. |

## Known gaps

- The complete published export excludes inter-university offerings, including courses offered in cooperation with another university, per the source documentation. It is not a full extract of the login-only registration database.
- Course descriptions, permanent syllabus URLs, and campus are not supplied by this feed. Room text without a period stays in `scheduleText` only. Three 115-1 department codes absent from the code guide (`AIIM`, `FMMI`, `QTAM`) are kept as codes without inferred names.
- The published delivery response had `Cache-Control: public, max-age=3600`; a daily schedule is sufficient. No request was blocked from the development environment; cloud egress was not tested separately.
