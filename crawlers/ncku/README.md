# @unicourse/crawler-ncku — 國立成功大學

```
corepack pnpm --filter @unicourse/crawler-ncku crawl -- --term 115-1 [--limit 20] [--out path]
```

**Status (2026-11-27): a full-term crawl is not possible within the site's limits.** The system shows a
CAPTCHA after about five department queries per IP (see "Access check"), and a term has 220
departments. The crawler stops at the first CAPTCHA page and writes nothing, so only smoke runs that
fit in the first department(s) (`--limit 20`) succeed. No 115-1 snapshot was produced.

Environment knobs (all optional): `NCKU_MAX_WAITS` (CAPTCHA pauses allowed in total, default **0** =
abort at the first one), `NCKU_COOLDOWN_MS` (length of each pause, default 600000),
`NCKU_DEPT_GAP_MS` (pause between departments, default 5000). Only raise `NCKU_MAX_WAITS` with NCKU's
permission (教務處課務組, <https://reg-acad.ncku.edu.tw/s/cou-contact>): a full term would then take
roughly 44 × (5 departments + ≥ 10 min pause) ≈ 8 hours.

## Source

- System: 國立成功大學課程資訊及選課系統, 全部課程 (all departments) view:
  <https://course.ncku.edu.tw/index.php?c=qry_all>. Server-rendered HTML, UTF-8.
- Flow (what the page's own jQuery does):
  1. `GET index.php?c=qry_all` — sets `PHPSESSID` / `COURSE_WEB` cookies; the page lists every
     department as `<li class="btn_dept" data-dept="E7">(E7)建築系 ARCH</li>` (220 for 115-1) and
     embeds a `crypt` token for the AJAX call.
  2. `POST index.php?c=qry_all&m=result_init` with `dept_no=<code>&crypt=<token>` (plus
     `X-Requested-With` and `Referer`) → `{"err":"","id":"…"}`.
  3. `GET index.php?c=qry_all&m=result&i=<id>` → that department's full course table.
- The list only shows the **current** term (115-1 on 2026-11-26); the crawler reads the term from the
  syllabus / Moodle links in the table and throws if it does not match `--term`. Past terms live in a
  separate 歷年課程查詢 system (`course-query.acad.ncku.edu.tw`), not used here.
- Per-offering syllabus pages (`class-qry.acad.ncku.edu.tw/syllabus/syllabus.php?…`) answer
  **403 Forbidden** to the crawler's User-Agent, so no detail pages are fetched; their URLs are kept as
  `syllabusUrl` / `sourceUrl`.

## Access check (2026-11-26)

- Login-free: yes (the 全部課程 view needs no account).
- robots.txt: `course.ncku.edu.tw/robots.txt` is 404. The pages carry
  `<meta name="robots" content="noindex,nofollow">` (a search-engine indexing directive; the crawler
  does not publish these pages, it extracts course data). `class-qry.acad.ncku.edu.tw/robots.txt`
  disallows only `/syllabus/uploads`, `/download`, `/ext4.2`, `/log`, `/test`.
- Terms: no terms-of-use page linked from the query system.
- **CAPTCHA / rate limit**: after about **five department result pages** from one IP, the site returns
  "請輸入驗證碼繼續！" instead of results. Measured 2026-11-26/27: it happened at the 6th department with
  3 s and with 15 s between departments, and immediately for a brand-new session from the same IP.
  It cleared after ~7 minutes without requests, but stayed for over an hour while the same session
  re-tried once every 2 minutes. The crawler does not solve it and does not rotate sessions, cookies,
  User-Agents or IPs; by default it aborts (see "Status").
- Open data: NCKU's open-data portal (<https://data.ncku.edu.tw/dataset/8d6462ee513f1c1a601506265cc9f674>,
  成功大學各學期課程, CSV, 政府資料開放授權條款) only covers 105-1 to 107-2 (last updated 2019), so it cannot
  supply 115-1. Its robots.txt disallows `/api/` and asks for `Crawl-Delay: 10`.
- Obfuscation: the enrollment column (`已選課人數/餘額`) is salted with decoy digits inside
  `<span class="Q…">` elements hidden by an inline stylesheet and with HTML comments; the parser drops
  comments and every class the page's own CSS marks `display:none` (exactly what a browser shows).

## Request volume (full term)

1 entry page + 2 requests × 220 departments = **441 requests** (~140 MB of HTML; the largest
department page, 通識中心 A9, is ~1 MB). Without the CAPTCHA limit that is ~7 minutes at the default
pacing; with it, see "Status".

## Field mapping

The result table has 10 columns; one offering can span several `<tr>` rows.

| NCKU column | snapshot field | notes |
| --- | --- | --- |
| 系號-序號 (`E7-006`) | `sourceId`, `departmentCode` | 選課序號, unique per term; the part before `-` is the 系號. |
| 課程碼-分班碼 (`E712010`, `A219300-1`) | `courseCode`, `classCode` | 課程碼 is stable across terms; 分班碼 only when present. |
| 屬性碼 (`[ARCH1051]`) | `extra.屬性碼` | |
| 系所名稱 (`建築系 ARCH`) | `department` | Trailing English abbreviation removed (`建築系`). |
| 年級 / 班別 / 組別 | `grade`, `extra.班別`, `extra.組別` | |
| 類別 (講義/實習/研討/…) | `extra.類別` | |
| 科目名稱 | `title` | No English title is published in this list. |
| 科目名稱 link (課程地圖) | `extra.課程地圖` | `course-map.ncku.edu.tw` page of the course. |
| labels (`英語授課`, `國考考試課程`, …) | `language`, `extra.標籤` | `language` is set to `英語` only when the `英語授課` label is present; otherwise omitted (not assumed). |
| 備註 | `notes` | |
| 限選條件 | `extra.限選條件` | |
| 學分 / 選必修 | `credits`, `requirement`, `requirementText` | `requirementFromText`. |
| 教師姓名 (`*` = 主負責老師) | `instructors` | One per `<br>`, `*` stripped; instructors of continuation rows are appended. |
| 已選課人數/餘額 | `extra.已選課人數`, `extra.餘額` | Numbers when numeric, else raw text (`額滿`, `請參考備註`). Capacity (人數上限) is not published. |
| 時間/教室 (`[2]6 建築系館 5111`) | `schedule`, `scheduleText` | `[day]from~to room`; periods expanded in NCKU order `0 1 2 3 4 N 5 6 7 8 9 A B C D E`. `scheduleText` keeps the raw lines joined by `; `. A cell showing only a "上課時間" button (flexible time, loaded on click) gives no schedule and `extra.彈性上課時間: true`. |
| 課綱 link | `syllabusUrl`, `sourceUrl` | `class-qry.acad.ncku.edu.tw/syllabus/syllabus.php?syear=0115&sem=1&co_no=…&class_code=…`; `sourceUrl` falls back to the entry page. |

Row grouping: a row with a 系號-序號 starts an offering. Following rows with the same 課程碼 and no
title are further components (實習, 研討, …): their time lines are appended to `scheduleText`
(prefixed with 類別 and 組別), and to `schedule` only when they have no 組別 letter (lettered groups
A/B are alternative lab sections, not extra meetings). Rows with a title but no 序號 are other
departments' offerings listed for this department's students (e.g. 大學國文 placeholders) and are
skipped; the owning department's list has them.

## Known gaps

- No `titleEn`, `description`, `capacity`, `campus` (syllabus pages are 403 to the crawler; the
  list has no English titles or limits).
- Flexible-time courses have no schedule (the time is only shown via a per-course click).
- **No complete term crawl** (CAPTCHA limit, see "Status"). The parser and the flow are complete and
  tested; what is missing is permission or an official bulk source (e.g. an updated 各學期課程 open-data
  CSV).
