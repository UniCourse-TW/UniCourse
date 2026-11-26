# CCU course crawler

Source: [國立中正大學 eCourse2 系所課程大綱](https://ecourse2.ccu.edu.tw/local/syllabus/syllabus_dep.php).
The department index and course listings are public UTF-8 HTML without a login. Unlike the
selection portal, the eCourse2 catalog does not require guest sign-in and lists courses even if
they have no syllabus link. The old `kiki.ccu.edu.tw/~ccmisp06/Course/` site timed out over HTTP and
HTTPS from the test network. The current selection and historical administrative portals require
sign-in, so they are not used. On 2026-11-27 (Taipei) the source host's `robots.txt` returned HTTP 404.
The catalog links the university's [privacy statement](https://www.ccu.edu.tw/p/403-1000-3232.php);
no crawler-specific terms or public bulk download were linked from the catalog.

## Run

```sh
corepack pnpm --filter @unicourse/crawler-ccu crawl -- --term 115-1 --out ../../snapshots/ccu-115-1.json
```

115-1 was published in eCourse2. A complete public catalog crawl made 135 sequential requests
(one directory and 134 department pages, 110 departments with listings), took 55.1 seconds, and
returned 2,063 offerings. A 20-course smoke crawl used three requests. Requests use the shared
`UniCourseBot` user agent, rate limit and retry policy. If a department has no option for the
requested term and displays the explicit empty table, it contributes no courses. A valid row with
no link uses its department listing as the source. Set `CCU_FETCH_SYLLABI=1` and `--limit 20`
(or smaller) to fetch the English title and description when available; full runs do not request
individual syllabi or attachments.

The same department listings support every term from `105-1` through `114-2` via `yearterm` (e.g. `114_2`).
The crawler checks the selected term and each returned row's 開課學年度, with the explicit empty-table exception above.

## Historical terms (ten-year backfill, run 2026-11-27)

Each department page's `yearterm` selector lists archived terms: `cd=I001` goes back to 97-1 and
`cd=1104` to 93-1 (older terms exist at the source, but only 105-1 onwards were crawled to cover ten
academic years). The page layout, table headers, `課程代碼` format (`NNNNNNN_NN`) and period labels
are identical in 105-1 and 115-1, so no parser change was needed; `src/samples/department-I001-105-1.html`
is a trimmed real 105-1 page used by a test (includes a row without syllabus link). In older terms some
rows have no syllabus link (e.g. 105-1: 25 of 2,061), which falls back to the department listing as
`sourceUrl`. Enrollment is not published for any term, so no snapshot has `enrolled`.

Caveats: the department directory is the *current* list (134 departments), so units that were
dissolved or renamed before 115 do not appear and their historical offerings are absent. Departments
that did not exist yet show no option for the term and contribute nothing (departments with offerings:
93 in 105-1 growing to 109 in 114-2). Summer terms (`_3`) appear in the `I001` selector only up to 103-3, so none were crawled for 105+. All terms used 135 sequential requests (one directory + 134 departments).

| Term | Offerings | Seconds | Term | Offerings | Seconds |
| --- | --- | --- | --- | --- | --- |
| 105-1 | 2,061 | 55 | 110-1 | 2,006 | 55 |
| 105-2 | 1,949 | 55 | 110-2 | 1,933 | 55 |
| 106-1 | 2,053 | 56 | 111-1 | 2,055 | 57 |
| 106-2 | 1,944 | 55 | 111-2 | 1,905 | 55 |
| 107-1 | 2,058 | 56 | 112-1 | 2,025 | 56 |
| 107-2 | 1,972 | 55 | 112-2 | 1,924 | 57 |
| 108-1 | 2,033 | 58 | 113-1 | 2,036 | ~55 |
| 108-2 | 1,917 | 55 | 113-2 | 1,984 | ~55 |
| 109-1 | 2,035 | 55 | 114-1 | 2,042 | ~55 |
| 109-2 | 1,916 | 55 | 114-2 | 1,975 | ~55 |

| Source field | Snapshot field | Mapping notes |
| --- | --- | --- |
| 課程代碼 | `sourceId`, `courseCode`, `classCode` | For `1101620_01`, use the full code as the term's identity, `1101620` as the catalog code, and `01` as the class. |
| 課程名稱及介紹 | `title`, `syllabusUrl`, `sourceUrl` | Keep the displayed title and link, if provided. |
| 開課單位、系所查詢 `cd` | `department`, `departmentCode` | Use the published unit and its directory code. |
| 授課教師 | `instructors` | Split the names, including team teaching. Bare staff numbers printed when a name is missing (`589142538`) are dropped. |
| 學分數、必/選修 | `credits`, `requirementText`, `requirement` | Numeric credits and raw/normalized requirement. |
| 上課時間 | `scheduleText`, `schedule` | Preserve the display text; parse weekdays and numeric or lettered periods. |
| — | `enrolled` (omitted) | The public eCourse2 listing does not publish enrollment, capacity, or remaining seats. |
| 遠距教學、核心能力 | `extra` | Keep the published flag and course-map link. |
| 大綱英文課名、課程概述 | `titleEn`, `description` | Optional syllabus fetch only. |

Room, enrollment capacity, campus, teaching language, grade, and course notes are not published
by this listing. The remote-learning flag is not a teaching language. This snapshot represents
the public eCourse2 catalog; there is no independent completeness check against the authenticated
enrollment portal.
