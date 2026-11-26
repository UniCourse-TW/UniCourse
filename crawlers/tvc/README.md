# crawler-tvc: 大學校院 / 技職校院課程資源網

One crawler for the Ministry of Education's national course platforms, which every institution fills
in with the 教育部 填報程式 (course upload tool). It writes **one snapshot per school per term**,
`snapshots/tvc/<slug>-<term>.json`, for every school that has no crawler of its own.

| | 大學校院課程資源網 | 技職校院課程資源網 |
| --- | --- | --- |
| Entry | <https://course-tvc.yuntech.edu.tw/web_nu/search_course.aspx> | <https://course-tvc.yuntech.edu.tw/web_nt/search_course.aspx> |
| Schools | universities and colleges of the general system | 科技大學, 技術學院, 專科學校 |
| Operator | 教育部 (高教司), run by 國立雲林科技大學課程工作小組 (ddpc@yuntech.edu.tw, 05-537-2747) | 教育部技職司, same team |

Both are the same ASP.NET WebForms application, Big5 pages. `https://ucourse-tvc.yuntech.edu.tw/webu/`
(the URL search engines show) resets connections from here; the same pages answer on
`course-tvc.yuntech.edu.tw`.

## Access check (2026-11-27)

- `https://course-tvc.yuntech.edu.tw/robots.txt` → 404 (no robots rules). No terms of use or
  anti-automation notice on the site (checked 首頁, 常見問題, 下載專區, 網站導覽). Login-free.
- `https://course-tvc.yuntech.edu.tw/web_nu/` → **403** `您沒有檢視此目錄或網頁的權限。` for every
  User-Agent, including a browser one: it is IIS refusing a directory listing (no default
  document), not a bot block. `web_nu/index.aspx` does not exist (302 to `FileNotFound.htm`); the
  pages live at `web_nu/search_*.aspx`, linked from `webU/index.aspx`.
- The crawler identifies as `UniCourseBot/0.1 (+https://unicourse.observe.tw; …)` (kit default)
  and never received a 403/429 during the crawls below.
- There is no bulk download or open-data file (下載專區 only has the upload tool). The page's own
  匯出 button (Excel / Csv / Ods) exports the full result of a query, which is what this crawler uses.
  The **CSV export is malformed** (fields with commas are not quoted), so the crawler takes **XLSX**.

## How a school/term is fetched

Per school and term, in one WebForms session (cookie jar per session):

1. `GET search_course.aspx` (hidden `__VIEWSTATE`, `__EVENTVALIDATION`, `ctl00$hfCSRFToken`).
2. `POST` the search: 學年度 `YearDDL`, 學期 `TermDDL` (1 上, 2 下, 3 暑期, 9 其他), 學校名稱
   `SBI5$TB` = MOE school name (Big5 form encoding), `__EVENTTARGET=…$SubmitQueryBtn`. The 總計 row
   gives 課程數 / 系所數 / 校數; 0 means the school has nothing on this platform.
3. `POST` `ExportBtn` with 匯出格式 `xlsx`: starts a server-side job.
4. `POST` the job's `Progress_Timer` every 3 s until 進度 reads 處理完畢 (usually 5–8 polls).
5. `POST` `DownFileBtn` → the `.xlsx` (sheet 1 totals, sheet 2 one row per course).

Partial rendering is disabled on the site, so every postback returns the full ~550 KB page:
about **11–19 requests, 6–11 MB and 30–60 s per school**. Technical schools are searched on
`web_nt` first, others on `web_nu`; if the first finds nothing the other is tried (2 more requests).
Limits: one request at a time per session, ≥ 1 s apart (`HTTP_OPTIONS`), at most two sessions in
parallel (`--workers`, default and maximum 2), kit retries with back-off on 429/5xx.

```sh
just crawl-tvc --term 115-1                     # every eligible school -> snapshots/tvc/
just crawl-tvc --term 115-1,114-2 --school nsysu,tku --report /path/report.json
corepack pnpm --filter @unicourse/crawler-tvc crawl -- --term 115-1 --school nsysu --limit 20 --out-dir /tmp/x  # preview
cargo run -p unicourse-ingest -- snapshots/tvc
```

`--report` writes per-school results (offerings, platform course count, requests, bytes, seconds,
errors) as JSON. The process exits 1 when any school failed; the other snapshots are still written.

## Which schools

`src/schools.ts` `eligibleSchools()`: every institution in `data/institutions.json` whose
`crawlers/status.json` entry is missing or has `"source": "tvc"`. Schools crawled by their own package
(an entry without `source`, e.g. `ntu`, `nthu`, `ntua`) are never written, so **the dedicated crawler
always wins** and a national snapshot can never overwrite a direct one. NCKU (CAPTCHA) and NCU
(robots.txt on the school's own system) keep their blocked packages but are marked `source: "tvc"`.

Rows are kept only when 校名 equals the MOE name after normalisation (台→臺, and a
`…學校財團法人` foundation prefix dropped, e.g. `淡江大學學校財團法人淡江大學`). `FORMER_NAMES` lists
earlier names of renamed schools (unverified hints, searched only when the current name finds nothing)
for crawling past years.

## Years

The 學年度 menu covers **86–115** on both platforms, with 上學期, 下學期, 暑期 and 其他. Checked: 國立中山大學
105-1 returns 2,146 courses, so history back to 105 is available. 115-2 will appear once schools
upload it (the 115-1 data was uploaded in October 2026).

## Field mapping

Platform column (XLSX header) → snapshot field.

| platform | snapshot | notes |
| --- | --- | --- |
| 課號 | `courseCode`, `sourceId` | The school's own code. Repeated codes (sections) become `<code>#1…n`, ordered by department, grade, instructors, title, 系統序號. Without a 課號: `<department>/<title>`. |
| 課程名稱 | `title` | No English title in the export. |
| 開課老師 | `instructors` | Split on `,，、;；/`; placeholders (無, 0, 待聘, …) dropped. |
| 系所名稱 (大學) / 科系 (技職) | `department` | No department code. |
| 學分數 | `credits` | |
| 必選修_ | `requirementText`; `requirement` | `general` when 科目類別 contains 通識. |
| 總修課人數 | `enrolled` | Students enrolled when the school uploaded (usually after add/drop). |
| _授課語言 | `language` | |
| 年級 | `grade` | `0` (不分年級) omitted. |
| 課程大綱 | `description` | Placeholders such as 依規定免登, 詳參課程連結 omitted. |
| 課程連結 | `syllabusUrl` | Only when an http(s) URL; other text goes to `extra.課程連結`. |
| 備註 | `notes` | |
| 學院名稱, 系所/科系英文名稱, 學程, 部別, 學制 / 學制學程, 部校訂, 半全年, 科目類別, 教學型態, 全英語教學, 跨校選修, 系科屬性, 遠距教學提供字幕, 男/女/其他學生修課人數, 系統序號 | `extra` | Original names without the export's `_` markers. |
| — | `sourceUrl` | The platform's search page (results have no per-course URL; details open by postback). |

`source.name` is 大學校院課程資源網 or 技職校院課程資源網, so provenance is visible on every snapshot.

## Known gaps (compared with a school's own crawler)

- **No meeting times or rooms** (`schedule` / `scheduleText`), **no capacity**, no English title,
  no department code, no campus.
- The data is a periodic upload: a school's numbers are those of its upload date (see 建立時間), not
  live; schools that have not uploaded a term are missing for that term.
- `sourceUrl` is the search page, not a course page.
- Courses without a 課號 get a synthetic code from department and title, so cross-term grouping is
  weaker for those schools.

## Crawl results

See the table at the end of this file (filled after each full run).
