# NTHU crawler

## Source and access

The [NTHU Division of Curriculum open-data page](https://curricul.site.nthu.edu.tw/p/404-1208-111356.php?Lang=zh-tw#json) documents the daily whole-term JSON export. Its [current-term download page](https://curricul.site.nthu.edu.tw/p/404-1208-308552.php?Lang=zh-tw) downloads that export from the [public JSON delivery endpoint](https://nthu-courses-proxy.philosophysis.workers.dev/) in its own JavaScript. The same office publishes the [course-number, period, and department code guide](https://curricul.site.nthu.edu.tw/p/406-1208-290466,r7880.php?Lang=zh-tw), used to map department names.

Access checked November 27, 2026 (Taipei): no login or credentials. The curriculum site's `robots.txt` allows `/`. The delivery endpoint returned a JSON course list rather than a robots policy at `/robots.txt`; no crawl directives were present. The original `www.ccxp.nthu.edu.tw` host disallows crawling except its exact inquiry entry, so the crawler does not request it. No separate terms or license grant was found on the cited download pages; the office explicitly describes the JSON as suitable for systems integration. Its instructions say the data is updated daily rather than in real time.

The office also publishes [historical course workbooks](https://curricul.site.nthu.edu.tw/p/404-1208-306821.php?Lang=zh-tw) and [dated enrollment workbooks](https://curricul.site.nthu.edu.tw/p/404-1208-134751.php?Lang=zh-tw). `114-2`, `114-1`, `113-2`, and `113-1` use their named archive sheets rather than the rolling JSON. XLSX processing needs `python3` (3.8+, standard library only). The crawler checks the term embedded in each course identifier, including those in the enrollment files. An uncatalogued term fails if the rolling feed contains a different term.

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
