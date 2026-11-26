# @unicourse/crawler-nccu — 國立政治大學

```
corepack pnpm --filter @unicourse/crawler-nccu crawl -- --term 115-1 [--limit 20] [--out path]
NCCU_SYLLABUS=1 corepack pnpm --filter @unicourse/crawler-nccu crawl -- --term 115-1   # + description / capacity
```

## Source

- System: 國立政治大學 全校課程查詢系統, <https://qrysub.nccu.edu.tw/> (Angular front end).
- Data: the JSON search API the front end calls, `https://es.nccu.edu.tw/course/<lang>/<query>/`, where
  `<lang>` is `zh-TW` or `en` and `<query>` is a URL-encoded string of `:key=value ` tokens, e.g.
  `:sem=1151 :dp1=200 :dp2=1 /`. Unit codes come from `https://qrysub.nccu.edu.tw/assets/api/unit.json`,
  the term list from `assets/api/semesterlist_c.json` (115-1 is semester `1151`).
- Optional detail: the public syllabus page linked in each row (`teaSchmUrl`,
  `https://newdoc.nccu.edu.tw/teaschm/<sem>/schmPrv.jsp-…html`).
- The school also publishes the whole term as `https://newdoc.nccu.edu.tw/teaschm/CoursesList.xlsx`
  (linked from the query page). It has no extra fields beyond the API, so the crawler does not use it,
  but it is a good completeness check: on 2026-11-26 it listed 2930 offerings, the crawler found all of
  them plus 2 certificate-only rows (`554000001`, `557000001`, 外語能力檢定).

## Access check (2026-11-26)

- Login-free: yes. The API needs no cookie or token; only the course-tracking features require login,
  and the crawler never touches them.
- robots.txt: `qrysub.nccu.edu.tw/robots.txt`, `es.nccu.edu.tw/robots.txt` and
  `newdoc.nccu.edu.tw/robots.txt` all return 404 (no restrictions published).
- Terms: no terms-of-use page is linked from the query system. Requests carry the kit's `UniCourseBot`
  User-Agent and a `Referer` of the query page, at the kit's default rate (≤ 2 concurrent, ≥ 400 ms apart).
- No CAPTCHA or rate limiting was encountered; requests were made from a residential connection, so
  behaviour from datacenter IPs is untested.

## Request volume (full term)

The API silently truncates every answer at **500 rows**, so the crawler walks the unit tree:

1. `unit.json` (1 request).
2. One query per level-1 unit (16). A unit that returns 500 rows is split into its level-2 units, and
   those into level-3 departments, until every leaf is below the cap (for 115-1 none needed splitting).
3. Some offerings (e.g. `070xxx` courses of AI中心 / 宗教所 programs) are not reachable through any unit
   in `unit.json`, so the crawler also sweeps by weekday `:week=1..7` (split into `:dsec=1..4`
   time-of-day buckets when a day hits the cap; Tue–Thu do) plus the keyword `未定或彈性` for courses
   without a fixed time. Results are de-duplicated by `subNum`.
4. The same leaf queries against the `en` index for English titles (skipped for leaves whose rows are all
   already known).

115-1: **63 requests (1 + 36 zh-TW + 26 en), ~25 s, 2932 offerings**. With `NCCU_SYLLABUS=1` add one request per offering
(~2900 more, roughly 20 minutes at the default rate).

## Field mapping

| NCCU field (zh-TW API) | snapshot field | notes |
| --- | --- | --- |
| `subNum` | `sourceId`, `courseCode` | 9-digit 科目代號, stable across terms for the same course section and unique within a term. |
| `subNam` | `title` | |
| `subNam` (en API, same `subNum`) | `titleEn` | Omitted if identical to the Chinese title. |
| `teaNam` | `instructors` | Split on `、`. |
| `subGde` | `department` | 開課系級 as published (may include the grade, e.g. `韓文碩一韓文碩二`). |
| `subPoint` | `credits` | `"3.0"` → `3`. |
| `subKind` / `lmtKind` | `requirement`, `requirementText` | `requirementText` is `subKind` (必修/選修/群修) or, when empty, `lmtKind`. Any `lmtKind` (人文通識, 跨領域(人文、社會), …) means `general`; otherwise `requirementFromText(subKind)`; 群修 maps to `other`. |
| `subTime` | `schedule` | `三D56` → `{day: 3, periods: ['D','5','6']}`; `一CD四78` → two meetings. Periods are NCCU labels `A B 1 2 3 4 C D 5 6 7 8 E F G`. `未定或彈性` → no `schedule`. |
| `subClassroom` | `schedule[].location` | Only when there is exactly one meeting: the API gives one room string for all meetings (sometimes several rooms run together, e.g. `大仁200102大仁200401資科電腦室`). |
| `subTime` + `subClassroom` | `scheduleText` | Raw, joined with a space. |
| `langTpe` | `language` | e.g. `中文`, `英文`, `日文`. |
| `teaSchmUrl` | `syllabusUrl`, `sourceUrl` | Per-offering syllabus page. The shared placeholder `…/emptyforqry.htm` (no syllabus) is dropped and `sourceUrl` falls back to the query page. |
| `note` | `notes` | `＠備註:` prefix removed; `無` / `N/A` dropped. |
| syllabus `課程簡介` | `description` | Only with `NCCU_SYLLABUS=1`. |
| syllabus `預收人數` | `capacity` | Only with `NCCU_SYLLABUS=1`. |
| `info` | `extra.info` | 異動資訊 (e.g. `教室異動於2026/09/02;`), prefix removed, `無` dropped. |
| `lmtKind`, `core`, `emiType`, `far`, `gdeType`, `gdeTpe`, `gdeTpeMsg`, `pay`, `smtQty`, `tranTpe`, `subOdr` | `extra.*` | Original API names: 通識類別, 是否核心通識, EMI 課程, 遠距, 開課層級 (學士班/碩士班…), 是否可抵免通識, 收費, 全學年/單學期, 選課方式 (必修灌檔/分派/…), 系所排序碼. `far` dropped when `無資料`. |

## Known gaps

- `capacity` and `description` need the per-offering syllabus page, so they are off by default.
- No `departmentCode`: `subGde` names (e.g. `經濟系`) do not match the `unit.json` names (`經濟學系`)
  reliably, and unit membership is not returned per row.
- No `grade` or `campus` (single campus); `classCode` is not split out of `subNum`.
- `schedule[].location` is missing for multi-meeting offerings (see above); the raw text is in `scheduleText`.
- Instructors are Chinese names only (the `en` API has romanised names; not used).
- The API serves only terms listed in `semesterlist_c.json`; the crawler throws if a term returns nothing.
