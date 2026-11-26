# @unicourse/crawler-ntnu — 國立臺灣師範大學

## Source

- System: 臺師大課程查詢系統 › 當學期課程查詢 › 開課和課程大綱查詢
  (`https://courseap2.itc.ntnu.edu.tw/acadmOpenCourse/index.jsp`).
- Data: the JSON endpoint the site's own ExtJS grid calls,
  `CofopdlCtrl?action=showGrid&acadmYear=115&acadmTerm=1&deptCode=<code>&…&limit=99999`
  (same endpoint as the historical `NTNU-Course` package), plus the department list
  `CofnameCtrl?action=cof&type=chn&year=115&term=1`.
- Past terms use the same two endpoints with older `acadmYear`/`acadmTerm` (`year`/`term` for the
  department list), so the department list is always fetched for the requested term, not the current one.
  Each grid row's `acadm_year` and `acadm_term` must match the requested term. See *History* below.
- Per-offering page (`sourceUrl` / `syllabusUrl`): `SyllabusCtrl?year=&term=&courseCode=&courseGroup=&deptCode=&formS=&classes1=&deptGroup=`,
  the page the grid's 「課程綱要」 button opens.

## Access check (2026-11-26)

- Login-free; no CAPTCHA. Course data is public (the query page is linked from the 教務處 site).
- `robots.txt`: none (404 on `courseap2.itc.ntnu.edu.tw`). The HTML pages carry
  `<meta name="ROBOTS" content="NOINDEX, NOFOLLOW">`, i.e. "do not put this page in a search index";
  we do not republish the pages, only the course facts, and link back to the official syllabus.
- No terms-of-use page was found for the system.
- Changes since `NTNU-Course` (which used one query with an empty `deptCode`):
  - The JSON endpoints now return `非法執行 Wrong Access` / an empty body unless the request carries the
    `JSESSIONID` cookie from `CofopdlCtrl?language=chinese` **and** that page as `Referer`
    (plus `X-Requested-With: XMLHttpRequest`), exactly like the site's own front end. The crawler opens
    the query page once, then reuses the session; it re-opens it once if a response comes back empty.
  - An empty `deptCode` now returns an empty body, so the crawler queries one department code at a time.
  - New query parameters `clang` and `weekSection` (sent empty / `N`).
- `SyllabusCtrl` works without a session.

## Request volume (full term)

- 1 session page + 1 department list + one grid request per department code.
- 115-1 lists 348 codes: 141 departments/colleges/common units, 202 `ZU..` 學分學程 codes and
  5 `9...` 校際 codes. By default the 343 non-校際 codes are queried (5 `9...` codes skipped), so a
  full crawl is ~345 requests, 0.1–3 s each server side (most program codes are tiny); at the kit
  defaults (2 concurrent, ≥400 ms spacing) it took 191 s for 115-1 (3,226 offerings).
- The 學分學程 codes mostly repeat departmental rows, but 20 offerings in 115-1 are listed only
  under a program code, so they are queried too (department codes first; duplicates are dropped).
- Optional `NTNU_FETCH_DETAILS=1`: one `SyllabusCtrl` request per offering (~4,000) to add
  `description` (課程簡介). Off by default.

Environment switches (all off by default):

| variable | effect |
| --- | --- |
| `NTNU_FETCH_DETAILS=1` | fetch every syllabus page for `description` |
| `NTNU_SKIP_PROGRAMS=1` | skip the `ZU..` 學分學程 codes (~200 fewer requests, loses ~20 offerings) |
| `NTNU_INCLUDE_CROSS_SCHOOL=1` | also include `9...` 校際臺大/臺科大 codes, i.e. NTU/NTUST courses open to NTNU students |

## History (backfilled 2026-11-27)

Crawled back to **105-1** (20 terms, 105-1 … 114-2, plus the live 115-1). Every term ran with the default
switches, at kit defaults, in 1.5–2.8 min. `requests` is what the crawler logs (`requests: N`, logical
requests: session page + department list + one grid query per code; kit-internal 429/5xx retries not
counted). No term needed a session re-open.

| term | dept codes (queried) | offerings | with `enrolled` | only under 學分學程 | requests | seconds |
| --- | --- | --- | --- | --- | --- | --- |
| 105-1 | 135 (130) | 3,125 | 3,125 | 0 | 132 | 94 |
| 105-2 | 134 (129) | 3,002 | 3,002 | 0 | 131 | 167 |
| 106-1 | 146 (141) | 3,185 | 3,185 | 51 | 143 | 99 |
| 106-2 | 147 (142) | 3,108 | 3,108 | 57 | 144 | 106 |
| 107-1 | 163 (158) | 3,239 | 3,239 | 29 | 160 | 124 |
| 107-2 | 161 (156) | 3,125 | 3,125 | 39 | 158 | 118 |
| 108-1 | 166 (161) | 3,238 | 3,238 | 26 | 163 | 120 |
| 108-2 | 165 (160) | 3,108 | 3,108 | 36 | 162 | 118 |
| 109-1 | 172 (167) | 3,329 | 3,329 | 31 | 169 | 135 |
| 109-2 | 170 (165) | 3,206 | 3,206 | 37 | 167 | 115 |
| 110-1 | 171 (166) | 3,326 | 3,326 | 30 | 168 | 117 |
| 110-2 | 168 (163) | 3,164 | 3,164 | 32 | 165 | 124 |
| 111-1 | 172 (167) | 3,285 | 3,285 | 22 | 169 | 130 |
| 111-2 | 172 (167) | 3,131 | 3,131 | 34 | 169 | 128 |
| 112-1 | 184 (179) | 3,267 | 3,267 | 28 | 181 | 138 |
| 112-2 | 183 (178) | 3,136 | 3,136 | 35 | 180 | 138 |
| 113-1 … 114-2 | 189–214 | 3,087–3,217 | all | ≈20–24 | 189–315 | 138–191 |

Per-term notes:

- The JSON format is unchanged since 105-1 (same keys, same `time_inf` syntax, UTF-8); the parser
  needed no changes. `src/samples/grid-105-1.json` covers an old-term row.
- Campus label: up to 113-1 the main campus is printed as `本部`; from 113-2 on as `和平`. Both are kept
  as published (`campus` = `本部` / `和平`); they are the same campus, but the crawler does not rename it.
- 105-1 and 105-2 department lists have no `ZU..` 學分學程 codes, so no program-only offerings exist for
  those terms (later terms have 22–57).
- `◎密集課程` (109-2 on) and `◎面授/同步` (112-1 on) segments have no day/period; they stay in
  `scheduleText` only. One 110-1 row (`0338`) has `1-4 本部 誠204` without a weekday; it is kept in
  `scheduleText` and gets no `schedule` (the day is not guessed).
- `counter_exceptAuth` is present on every row of every term and is the final count of the term; 8–27
  offerings per term have `enrolled = 0`, and ~150–240 per term exceed `capacity` (限修人數), as on the
  live system (manual/authorised additions).

Older terms: the department list answers back to **89-1** (88-1 and earlier return an empty list), and a
spot check of the `EU00` grid for 90-1 and 95-1 returned rows. Those terms were not crawled (outside the
ten-year target); note that 95-1 sample rows show `counter_exceptAuth = 0`, so enrolment numbers before
105 should be checked before they are trusted.

## Field mapping

| NTNU raw field | snapshot field | notes |
| --- | --- | --- |
| `serial_no` (開課序號) | `sourceId` | 4-digit, unique within the term; rows are de-duplicated on it |
| `course_code` (科目代碼) | `courseCode` | stable across terms |
| `course_group` (組別) | `classCode` | `A`, `B`, … when a course is split into groups |
| `chn_name` | `title` | text before `</br>`; the `[ 學分學程：… ]` suffix goes to `extra.學分學程` |
| `eng_name` | `titleEn` | text before `</br>` |
| `teacher` | `instructors` | split on whitespace (the grid's separator); consecutive Latin-script tokens are re-joined (`汪明輝 Richard Howitt` → 2 names) |
| `dept_chiabbr` / `dept_code` | `department` / `departmentCode` | |
| `credit` | `credits` | `"2.0"` → `2` |
| `option_code` | `requirementText`, `requirement` | `必`/`選`/`通` (raw), mapped with `requirementFromText` (`通` → `general`) |
| `time_inf` | `scheduleText`, `schedule` | `二 6-7 公館 Ｓ102, 四 3-4 …`: day, period range (0–10, A–D, expanded), room text as `location`. `請洽系所辦` is not kept as a location; `◎面授/同步`-style segments are kept only in `scheduleText` |
| first token of `time_inf` room | `campus` | `和平` / `公館` / `林口`, only when all meetings agree |
| `limit_count_h` (限修人數) | `capacity` | |
| `counter_exceptAuth` (選課人數，不含授權碼) | `enrolled` | The count displayed under 課程名額. Includes numeric zero, excludes enrollment through authorization codes as stated by the school; not substituted with the unlabeled `counter`. |
| `eng_teach` = `是` | `language` = `英語` | omitted otherwise (not assumed to be 中文) |
| `form_s` | `grade` | 年級 when the course targets one year |
| `comment` (備註) | `notes` | |
| `restrict` (限修) | `extra.限修` | |
| `course_kind` | `extra.全/半年` | |
| `class_name` | `extra.班別` | e.g. `大碩博`, `甲` |
| `dept_group_name` | `extra.系組` | |
| `selfTeachName` | `extra.正課/實驗親授` | |
| `authorize_p` | `extra.授權碼名額` | |
| `intensive` = `Y` | `extra.密集課程` | |
| syllabus `cof_outline.brief` | `description` | only with `NTNU_FETCH_DETAILS=1` |

Rows whose own `dept_code` starts with `9` (校際) are dropped even when they appear under a
學分學程 code, unless `NTNU_INCLUDE_CROSS_SCHOOL=1`. Rows with `status = V` (停開, cancelled) are skipped. Live enrolment counters (`counter`,
`counter_exceptAuth`, `authorize_r`, …) are not exported because they change by the minute.

## Known gaps

- `description` needs the opt-in syllabus pass (verified on a 3-offering run).
- 學分學程 rows found only through a program code carry that code as `departmentCode`
  (e.g. `ZU93`) and the program's abbreviation as `department`.
- 校際 (`9...`) courses are other universities' courses and are excluded by default; enable them with
  `NTNU_INCLUDE_CROSS_SCHOOL=1` if the product wants them.
- A few instructor names contain Unicode private-use characters (rare-character glyphs from the
  school's own font); they are kept as published.
- Two romanised names in a row (`John Smith Mary Lee`) cannot be told apart, because the grid
  only separates names with spaces; they would come out as one name. Not seen in 115-1.
