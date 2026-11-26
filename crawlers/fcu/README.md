# @unicourse/crawler-fcu — 逢甲大學

## Source

- **System:** 逢甲大學課程檢索系統 (public course search, AngularJS front end, ver.1.44.2 when written).
- **Entry:** <https://coursesearch.fcu.edu.tw/> → meta-refresh to `https://coursesearch02.fcu.edu.tw/main.aspx?token=…`
  (the token is a short-lived anonymous JWT; the JSON services below do not need it).
- **Data:** the site's own JSON web services at `https://coursesearch02.fcu.edu.tw/Service/Search.asmx/*`
  (POST, `content-type: application/json`), discovered in `/bundles/js`:
  - `init {lang}` → default term, `yearList`, `languageList` (授課語言 ids).
  - `GetDeptList {baseOptions, degree}` → 學院 per 學制 (`degree` 1 大學部, 3 碩士班, 4 博士班, 5 進修學士班).
  - `GetUnitList {baseOptions, degree, deptId}` → 系所 ids/names.
  - `GetType1Result {baseOptions, typeOptions:{degree, deptId, unitId:'', classId:''}}` → all rows of one 學院
    (the server rejects queries without a 學院: "搜尋範圍過大").
  - `GetType2Result` with only `useLanguage` enabled → all rows taught in one language. The 14 language
    queries partition the term exactly (verified for 115-1: 3555/3555, no overlaps), so they give `language`;
    running them with `lang: 'en'` also returns the English course title.
  - `baseOptions = { lang: 'cht' | 'en', year: 115, sms: 1 }`; `--term 115-1` maps to `year 115, sms 1`.
  - `114-2`, `114-1`, `113-2`, and `113-1` are all available using the same request fields in both language views.
  - Older terms use the same endpoints and fields (see "Past terms" below). `init.yearList` only lists 107…116, but
    the services answer for older years too, so the crawler no longer rejects a year that is missing from it.
- **Syllabus (optional):** `https://coursesearch02.fcu.edu.tw/CourseOutline.aspx?lang=cht&courseid={year}{sms}{選課代碼}`
  redirects to `ilearntools.fcu.edu.tw/W320104/W320104_SyllabusFullVer.aspx?token=…`, whose SPA posts the token
  to `W320104_syllabus.aspx/GetCourseDetail`. Enable with `FCU_FETCH_SYLLABUS=1` to fill `description`.

The old WebForms site `coursesearch04.fcu.edu.tw` (mentioned in older guides) was not used: the JSON services
above are what the current front end calls.

## Access check (2026-11-26)

- Login-free: yes. Results are the same as an anonymous visitor sees (the 開課期程 column is hidden in the UI
  for anonymous users but present in the JSON).
- robots.txt: none. `https://coursesearch02.fcu.edu.tw/robots.txt` and `coursesearch.fcu.edu.tw/robots.txt`
  answer `302 → http://…/` (port 80 is closed); `ilearntools.fcu.edu.tw/robots.txt` is 404.
- Terms: the footer only says 「版權所有© 逢甲大學系統內之所有內容及版面設計－著作權屬逢甲大學」 and links a privacy
  statement; no API terms or rate limits are published. Contact: 教務處註冊課務組 registration@fcu.edu.tw.
- A WAF (`FCU_WAF` cookie on `.fcu.edu.tw`) sits in front of the site; the kit keeps the cookie. No blocking was
  observed from this (residential) IP; behaviour from datacenter IPs is untested.

## Request volume

Full 115-1 term (default, no syllabus): **87 requests, ~35 s** at kit defaults (2 concurrent, 400 ms spacing):
1 `init` + 4 `GetDeptList` + 34 `GetUnitList` + 34 `GetType1Result` + 14 `GetType2Result`.
The largest response (`GetType2Result` 中文, ~3600 rows) is a few MB. `--limit` only trims the output; the list
requests are the same.

With `FCU_FETCH_SYLLABUS=1`: +2 requests per offering (one redirect chain, one JSON POST), ≈ 7100 extra requests,
roughly an hour; with `--limit N` only the first N offerings are fetched.

## Field mapping

One API row exists per (選課代碼, 開課班級); rows are merged by 選課代碼. Strings are trimmed, stray control
characters (the data contains DEL bytes) are removed, `\r\n` becomes `\n`.

| FCU field (UI label) | snapshot field | notes |
| --- | --- | --- |
| `scr_selcode` 選課代碼 | `sourceId` | Per-term id, unique within the term (may have leading zeros, e.g. `0017`). |
| `sub_id3` 課程編碼 | `courseCode` | Cross-term course code (e.g. `IEE2000`); falls back to `sub_id`. |
| `sub_id` | `extra.科目代碼` | Older 5-digit subject code. |
| `scr_dup` | `classCode` | 班別 (`001`, `002`, …) within the same subject. |
| `sub_name` | `title` | |
| `sub_name` (`lang: en`) | `titleEn` | Upper-case English title as published. |
| `scr_period` 上課時間/上課教室/授課教師 | `schedule`, `scheduleText`, `instructors` | See below. |
| `scr_teacher` | `instructors` | Only used to locate the instructor list in `scr_period` (it is truncated for long lists). |
| `cls_id` (first 4 chars) | `departmentCode`, `department` | 系所 id/name from `GetUnitList`. The service stores names in a 13-character column, so long program names arrive cut (`美國加州舊金山州立大學資訊` = NM07, the SFSU 2+2 資訊工程雙學士學位學程); `src/tidy.ts` maps every cut name seen in 105-1…115-1 to its full name (sources in the comment there) and appends `…` to any new cut name. When the id is in no unit list (`XC07` 通識選修, some 專班) the offering college (`extra.開課學院`, e.g. `通識中心`) is used and `departmentCode` is omitted. |
| `cls_name` / `cls_id` 開課班級 | `extra.開課班級`, `extra.班級代碼` | All classes of the merged rows, `、` / `,` joined. |
| 學制 / 學院 of the query | `extra.學制`, `extra.開課學院` | Query context the row was found under. |
| `scr_credit` 學分 | `credits` | |
| `scj_scr_mso` 必選修 | `requirementText`, `requirement` | Only `必修` / `選修` occur; via `requirementFromText`. |
| `scr_precnt` 開放名額 | `capacity` or `extra.開放名額` | 開放名額 is the number of seats opened in online selection; students the department pre-registers (必修 帶入) are not in it, so e.g. `微積分(一)實習` shows 開放名額 5 with 63 students and many 必修 show 0. Used as `capacity` only when it is ≥ `enrolled`; otherwise kept as `extra.開放名額`. |
| `scr_acptcnt` 實收名額 | `enrolled` | The published enrollment count, not 開放名額; keep nonnegative integers including zero and omit blanks. |
| 授課語言 (language query) | `language` | `中文`, `英語`, `中英`, `日語`, … (from `init.languageList`). |
| `scr_english` 英語/EMI | `extra.EMI課程` | boolean. |
| `scr_examid` / `scr_examfn` / `scr_exambf` | `extra.期中考` / `extra.期末考` / `extra.提前考` | `是`/`否` → boolean. |
| `scr_ldl` 上課方式 | `extra.上課方式` | 課堂教學 / 實時線上 / 混成式學習 / 線上教學On-line. |
| `scr_date` 開課期程 | `extra.開課期程` | `全學期` or a date range. |
| `scr_remarks` 備註 | `notes` | |
| — | `syllabusUrl`, `sourceUrl` | `CourseOutline.aspx?lang=cht&courseid={year}{sms}{選課代碼}` (public redirector to the syllabus). |
| syllabus `description.describe_ch` | `description` | Only with `FCU_FETCH_SYLLABUS=1`; English `describe_eh` as fallback. |

`scr_period` format: slots `(一)06-07 ROOM`, `(五)09     ROOM` (single periods are space padded), followed by the
comma-separated instructor list (names may contain spaces, e.g. `Giorgio L. Risso`). The room may be missing,
or be the placeholders `待排` / `未排教室` (→ no `location`). Slots whose first period is `00` (`(一)00 待排`,
`(日)00-02 待排`) mean "time not scheduled" and produce no `schedule` entry. `periods` are FCU period numbers
without zero padding (`"1"`…`"14"`). `scheduleText` is the time/room part with whitespace collapsed (as the
browser renders it); the instructor names are not repeated there.

## Known gaps

- `grade`: not published as a field; class names such as `資訊二甲` imply it, but `cls_id` encodings are not
  reliable (e.g. `XC07111` 通識選修), so it is left out.
- `campus`: FCU publishes no campus field (rooms may name other sites in `notes`).
- `description` requires the optional syllabus pass (off by default because of ~7000 requests).
- No `通識` requirement value: 通識 courses are labelled `選修`/`必修` by the school; `extra.開課學院`
  (`通識中心`) identifies them.
- Summer terms (`sms` 3/4) are not supported; `--term 115-3` fails loudly.

## Past terms (10-year backfill, 2026-11-27)

Snapshots exist for **105-1 … 114-2** (20 terms) plus the current 115-1; history files are git-ignored under
`snapshots/history/fcu-<term>.json`.

- **Oldest term:** 105-1 is the oldest one backfilled (the task goal). The services answer much further back —
  probes returned rows for 90-1, 95-1, 98-1, 100-1, 102-1, 103-1, 104-1 (CI 學院, degree 1) — so older terms are
  available if wanted; they were not crawled. `init.yearList` only lists 107…116 (the UI drop-down), so the
  crawler logs instead of rejecting years outside that list.
- **Same endpoints and fields for every year.** The 14 language queries still work in old terms; only the
  `GetType2Result` rows are repeated per 開課班級 (e.g. 105-1 中文 returns 4683 rows for ~4300 offerings), which
  the language map collapses by 選課代碼. About 60 offerings per old term (碩士論文/專班 research courses) are not
  returned by any language query and therefore have no `language` (left out, not guessed).
- **Hidden degree `2` (105-1 … 112-1):** `GetDeptList` with `degree: '2'` lists 通識核心課 (`XC`, later `GE`), the
  evening general-education classes (`通識－人文(夜)(H)`, …, 31–53 offerings per term). They are in no other degree
  list, so `DEGREES` now includes it (`extra.學制 = "學制2"`, the label is a placeholder because the site publishes
  no name). Empty from 112-2 on. Degree `8` (資電學院 專班, 105-1 … 111-2) only repeats rows already under degree 1.
- **College lists change per term** (e.g. 工程與科學學院 `CA`/創能學院 `CC`/通識中心 `GE` from 110, 經管學院 `MB` for
  碩士班 in 105): the crawler always walks `GetDeptList`, so no per-term configuration is needed.
- **Blank placeholders:** very old terms (at least 104-1) publish `上課方式 = 無` and `開課期程 = " ~"`; these are
  dropped from `extra`. 105-1…112-2 only show `課堂教學`/`全學期` or the 111+ delivery modes as before.
- `enrolled` (`scr_acptcnt`) is present for every offering in every term (all terms: enrolled count = offerings).
- Offering counts: ~4300 in 105/106/107 (incl. 夜間通識), ~3600–3800 from 108 on; request volume 94–102 per term
  (1 init + 5 `GetDeptList` + 2 per 學院 + 14 language queries), 47–54 s at kit defaults. Per-term numbers are in
  `snapshots/.backfill/validation-10y-fcu.log`.
