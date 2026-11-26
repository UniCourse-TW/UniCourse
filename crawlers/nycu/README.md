# NYCU crawler

## Source and access

The [NYCU public timetable](https://timetable.nycu.edu.tw/) lists courses by term and department. The timetable's own JavaScript calls `get_acysem`, `get_type`, `get_category`, `get_college`, `get_dep`, and `get_cos_list` by form POST. The UI requires a department or a special filter: a term-only query returned no results. The crawler traverses undergraduate, graduate, common, and program department menus and requests each distinct department query once. It deduplicates by `cos_id`, preferring a primary (`1`, 主開) row to a secondary (`2`, 輔開) copy.

Access checked November 27, 2026 (Taipei): all timetable requests are login-free. `/robots.txt` returned HTTP 404; no timetable-specific terms or privacy page was linked from the query or syllabus interface. The crawler uses the kit's `UniCourseBot` User-Agent, serial requests with at least 400 ms between starts, and built-in backoff on transient failures.

Full-term request volume is one term check, the department discovery calls, and one course-list request per distinct department query; the crawler logs these totals before retries. A smoke run stops once it has enough unique rows. The default crawl constructs published syllabus links without visiting individual courses.

The public term menu (`get_acysem`) lists every term from `1151` back to `871`, including summer terms (`…X`). The crawler passes the requested term to menu discovery and to each course query, and checks `acy` and `sem` on the returned rows.

### Past terms and the 2021 merger

National Chiao Tung University (國立交通大學, NCTU) and National Yang-Ming University (國立陽明大學, YM) merged into NYCU on **February 1, 2021**, which falls in term **109-2**, not 110-1. The current timetable serves the pre-merger terms with the same endpoints and parameters, so no separate flag or legacy system is needed. Each pre-merger term contains **both** former universities' courses in one list:

- **Former YM courses** have letter-prefixed per-term numbers (`A024`, `B281`, `C708`), mostly `[YM]` rooms, and the YM colleges (醫學院, 牙醫學院, 護理學院, 藥物科學院, 生物醫學暨工程學院, 生命科學院).
- **Former NCTU courses** have four-digit per-term numbers (`1139`) and Hsinchu or Tainan rooms (`[GF]`, `[BA]`, `[LJ]`, `[GR]`).

The two numbering schemes do not overlap, so `sourceId` stays unique. They continue through **110-2**, after the merger. Unified six-digit numbers start in **111-1**. Snapshots keep the `nycu` slug and the merged school name for every term, because the official source publishes them that way. The rows carry no explicit institution field, and the crawler does not add one. Use the ID pattern above to tell the two universities apart, but treat that pattern as a reading aid, not published data.

Historical backfill on November 27, 2026 (serial, kit defaults, no failed or skipped term):

| term | offerings | with `enrolled` | requests | seconds | notes |
| --- | ---: | ---: | ---: | ---: | --- |
| 105-1 | 3,781 | 3,781 | 291 | 158 | pre-merger NCTU + YM |
| 105-2 | 3,873 | 3,873 | 294 | 164 | YM rows: 1,167 of 1,822 have no `cos_time` (not published) |
| 106-1 | 3,750 | 3,750 | 295 | 158 | pre-merger |
| 106-2 | 3,822 | 3,822 | 295 | 174 | pre-merger |
| 107-1 | 3,826 | 3,826 | 310 | 165 | pre-merger |
| 107-2 | 3,901 | 3,901 | 302 | 164 | pre-merger |
| 108-1 | 3,904 | 3,904 | 323 | 171 | pre-merger |
| 108-2 | 3,950 | 3,950 | 314 | 167 | pre-merger |
| 109-1 | 4,055 | 4,055 | 350 | 181 | last fully pre-merger term |
| 109-2 | 4,267 | 4,267 | 325 | 176 | merger term; 702 YM rows show `reg_num` 0 |
| 110-1 | 3,658 | 3,658 | 324 | 169 | legacy numbering per former school |
| 110-2 | 4,506 | 4,506 | 339 | 184 | legacy numbering; YM rows: 1,025 have no time, 840 show 0 enrolled |
| 111-1 | 3,730 | 3,730 | 372 | 188 | unified six-digit numbers |
| 111-2 | 3,656 | 3,656 | 377 | 192 | |
| 112-1 | 3,584 | 3,584 | 393 | 199 | |
| 112-2 | 3,623 | 3,623 | 385 | 193 | |

Counts from 113-1 to 114-2 are listed in the earlier backfill. Request volume grows with the department menus, from about 290 requests per term in 105 to about 420 in 115. Every term published `reg_num` on every row. The zero counts and missing times above are left exactly as published and are not filled in. Old terms needed no parser change: no Big5 encoding, no new period codes, and every non-empty `cos_time` parses. A pre-merger sample (`src/samples/legacy-105-1.json`) is covered by the tests.

**Oldest term:** the oldest snapshot is `105-1`, the start of the ten-year target. The source has older data: a 95-1 department query and a 100-1 smoke run returned rows, and an 87-1 query to the same department returned an empty list. Terms 100-1 to 104-2 are crawlable but were not backfilled. Terms before academic year 100 cannot be requested, because the kit CLI and the snapshot format accept only three-digit years (`YYY-N`). Summer terms (`…X`, `term` `-3`) are published but were not part of this backfill.

The November 27 full run for **115-1** made **424** requests, including **342** department queries, in **211 seconds**. It consolidated 8,214 returned rows into **3,649 offerings** with no snapshot validation failures. The separate NYCozU sitemap disagreed with the live timetable; sampled NYCozU-only IDs did not resolve in the official timetable's exact-ID query, so the crawler does not merge that index into the snapshot.

```sh
corepack pnpm --filter @unicourse/crawler-nycu crawl -- --term 115-1 --out "$PWD/snapshots/nycu-115-1.json"
```

To preview course descriptions in a separate, limited output, set `UNICOURSE_NYCU_FETCH_DESCRIPTIONS=1` and pass `--limit` from 1 to 20. This adds at most one public `getCrsOutlineDescription` request per selected offering with an HTML syllabus. It does not download attachments or read the contact field. Do not import smoke outputs.

## Fields

| NYCU field | Snapshot field | Mapping |
| --- | --- | --- |
| `cos_id`, `cos_code` | `sourceId`, `courseCode` | Per-term course number and permanent course number, respectively. Distinct sections can share the latter. |
| `cos_cname`, `cos_ename`, `teacher` | `title`, `titleEn`, `instructors` | Trim names and split staff on the roster's `、` separator. |
| `dep_cname`, `dep_id` | `department`, `departmentCode` | Use the department from the primary course row when available; a query department UUID is not substituted for the row code. |
| `cos_type`, `cos_credit`, `num_limit` | `requirementText`, `requirement`, `credits`, `capacity` | Map select labels with the shared helper; accept leading-dot credits such as `.30` and `.00`. Limits above 999 are the timetable's unlimited sentinel and are omitted; a limit of 0 on a course with registered students is omitted too. |
| `reg_num` 修課人數 | `enrolled` | Use the public registered count, including zero. The timetable hides it during add/drop; omit blank or negative placeholders such as `-999`. |
| `cos_time` | `scheduleText`, `schedule`, `campus` | Retain the raw line; parse weekday codes with compact periods and rooms; map the campus suffix when exactly one recognized campus is present. |
| `language.授課語言代碼`, `memo` | `language`, `notes`, `grade` | Keep the published language code and remarks; redact email addresses. Populate grade only from an explicit `主開…年級` label. |
| `crsoutline_type`, `acy`, `sem`, `cos_id` | `syllabusUrl`, `sourceUrl` | Use the timetable's `crsoutline` or `crsoutlinefile` link when present; otherwise point to the timetable. |
| `crs_outline` | `description` | Only in explicitly limited description runs; render the outline as plain text. |
| `cos_hours`, `dep_ename`, `URL`, nested `costype` and `brief` | `extra.上課時數`, `開課單位英文名稱`, `課程網頁`, `課程類別`, `通識向度` | `src/tidy.ts`: `costype` becomes the `、`-joined category names (`程式相關_程式相關` → `程式相關`), `brief` the `、`-joined labels. Internal codes (`degree`, `depType`, `dep_primary`, `dep_limit`), the English requirement copy (`cos_type_e`) and `crsoutline_type` are dropped, as is any other ASCII-named column, so raw API names never reach the course page. Teacher profile links (`TURL`) are excluded. HTML entities and DEL bytes in titles are decoded/removed. |

## Known gaps

- The list response has no separate class code or grade column. The six-digit course number already distinguishes offerings. `brief` is the timetable's category label summary, not a course description.
- Unknown time formats and multi-campus offerings retain the original text even where a normalized time or a single campus cannot be supplied.
- The scheduler should avoid overlapping runs on the same school; a broad crawl traverses hundreds of queries. No direct requests were blocked from the development environment; cloud egress was not tested separately.
