# @unicourse/crawler-ntu — 國立臺灣大學

## Source

- System: 臺大課程網 課程查詢 (`https://nol.ntu.edu.tw/nol/coursesearch/index.php`).
- List: the 課程快速查詢 result page with an empty keyword, which returns every row of the term:
  `search_result.php?current_sem=115-1&cstype=1&csname=&alltime=yes&allproced=yes&allsel=yes&op=stu&page_cnt=150&startrec=<n>`
  (the server caps `page_cnt` at 150). The same query with `lang=EN` gives English titles.
- Department names: the 開課學院 / 開課系所 selects on `search_for_02_dpt.php`.
- Historical terms `114-2`, `114-1`, `113-2`, and `113-1` are available through the same
  `current_sem` parameter. The crawler checks the semester on the returned course links in both languages.
- Per-offering page (`sourceUrl` = `syllabusUrl`): `print_table.php?course_id=&class=&dpt_code=&ser_no=&semester=&lang=CH`
  (課程大綱), linked from each course title.

### Why not course.ntu.edu.tw

The newer front end `course.ntu.edu.tw` is a Next.js app whose data comes from `/api/…`, but its
`robots.txt` says `Disallow: /api/` (and `/_next/`). We honour that and use nol.ntu.edu.tw instead.

## Access check (2026-11-26)

- Login-free, no CAPTCHA. Pages are UTF-8 now (no Big5 decoding needed).
- `robots.txt`: none on `nol.ntu.edu.tw` (404). `course.ntu.edu.tw/robots.txt` disallows `/api/`
  and `/_next/` (not used).
- No terms-of-use page for the course search was found.

## Request volume (full term)

- 1 department page + 107 Chinese result pages + 107 English result pages = **215 requests** for 115-1
  (16,034 rows), ~200–300 KB and ~1.3 s each. At the kit defaults (2 concurrent, ≥400 ms spacing)
  a full crawl took **276 s**.
- Optional `NTU_FETCH_DETAILS=1`: one `print_table.php` request per offering (~9,750 more requests,
  roughly 1.5 h at the default rate) to add `description` (課程概述). Off by default; verified on a
  3-offering run.

## Rows that are not offerings

- Rows without 流水號 (134 in 115-1) are placeholders that tell each department which common
  course to take (e.g. 課號 `Common1011` 國文領域 for 生技系); they are skipped.
- Rows marked 停開 (cancelled icon, 2,290 serials in 115-1) are skipped.
- The same 流水號 is listed once per 授課對象 (target department). Those rows are merged into one
  offering; every 授課對象 is kept in `extra.授課對象` and the extra dpt_codes in `extra.授課對象代碼`.
  The first row wins for 必/選修, which can differ between target departments; a missing value is
  filled from a later row.

## Field mapping

| NTU column | snapshot field | notes |
| --- | --- | --- |
| 流水號 | `sourceId` | unique per term |
| 課號 | `courseCode` | e.g. `PE1003`, `Chem8000` |
| 班次 | `classCode` | |
| 課程名稱 | `title` | |
| 課程名稱 (lang=EN page) | `titleEn` | joined on 流水號 |
| 授課教師 | `instructors` | one name per `<a>` link |
| dpt_code from the title link | `departmentCode` | first 授課對象 |
| name of that code on `search_for_02_dpt.php` | `department` | falls back to 授課對象; missing for codes not in that list (`0000`, `T010`, `S010`) |
| 學分 | `credits` | |
| 必/選修 | `requirementText`, `requirement` | `必修`/`選修`/`必帶`, mapped with `requirementFromText` |
| 時間教室 | `scheduleText`, `schedule` | `一3,4(中央籃球場) 五10,A(新102)`: weekday, period labels (0–10, A–D), room in parentheses (nested parentheses kept). `請洽系所辦` is not kept as a location. Week-only texts such as `第1,4,6 週` stay only in `scheduleText` |
| 總人數 | `capacity` | leading integer; the raw text goes to `extra.總人數` when it is not a plain number, e.g. `100(含開放臺大系統人數:10)` |
| — | `enrolled` (omitted) | The public NOL list and course outlines do not publish a registered count or a remaining-seat count. 總人數 and system-specific quotas are limits, not enrollment. |
| 備註 | `notes`; `language` | `language` = `英語` only when 備註 says `本課程以英語授課` (`日語` likewise) |
| 課程識別碼 | `extra.課程識別碼` | e.g. `002 50010` |
| 全/半年 | `extra.全/半年` | |
| 加選方式 | `extra.加選方式` | 1/2/3 |
| 領域專長 | `extra.領域專長` | |
| 選課限制條件 | `extra.選課限制條件` | |
| 授課對象 | `extra.授課對象` | all target departments, `、`-joined |
| 課程網頁 | `extra.課程網頁` | e.g. NTU COOL link |
| 異動 icon | `extra.異動` | `true` when the row is marked as changed |
| print_table 課程概述 | `description` | only with `NTU_FETCH_DETAILS=1` |

## Known gaps

- `description` needs the opt-in detail pass.
- `campus` and `grade` are not published in the list.
- 213 offerings have no instructor listed (e.g. not yet assigned). I have not checked whether the
  list can show fewer instructors than the detail page for co-taught courses.
- Pagination is by row offset on a live query. If the school edits rows during a crawl, a row can
  shift between pages; duplicates are merged, and a page with fewer rows than expected is logged as
  a warning.
