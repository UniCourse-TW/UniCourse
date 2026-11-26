# @unicourse/crawler-ncu — 國立中央大學

**Status: blocked by robots.txt — no course data is crawled.** `crawl` fetches only robots.txt and then exits
with an error, so a scheduled run fails loudly instead of producing an empty or partial snapshot.

## Source

- **System:** 國立中央大學課程查詢系統 (New Course Schedule Planning System), login-free:
  - `https://cis.ncu.edu.tw/Course/main/query/byKeywords`, `/byUnion`, `/byDepartment/...`
  - per-流水號 detail page `https://cis.ncu.edu.tw/Course/main/support/courseDetail.html?crs=...`
- Published fields (per the school's pages and timetable PDFs): 流水號, 課號, 班次, 課程名稱 (中/英), 必選修, 學分,
  時間/教室 (`二5 二6`, `一7-9`), 授課教師, 開課系所, 人數上限, 授課語言, 備註. Terms are coded `1151` for 115-1.

## Access check (2026-11-26)

`https://cis.ncu.edu.tw/robots.txt` (Last-Modified 2026-11-06) reads:

```
User-agent: *
Disallow: /
Allow: /SeminarSys/*
Allow: /admissions/*
Allow: /ExamRegister/*
Allow: /ApcourseSys/*
Allow: /EnableSys/*
Allow: /iTeacher/*
Allow: /NsaSys/*
Allow: /ncukids/*
```

`/Course/` is not in the allow list, so every page of the course query system is disallowed for all crawlers.
The project rules (`docs/crawlers.md`: "honour robots.txt") therefore forbid crawling it. A saved copy is in
`src/samples/cis-robots.txt`; `src/parse.test.ts` checks it.

Alternatives looked at, none usable as a complete term list:

- `course.ncu.edu.tw` (課務資訊網, robots.txt allows all): news/regulation pages only, no offering list.
- Department / Language Center timetable PDFs (e.g. lc.ncu.edu.tw): partial, per unit, PDF only.
- `cis.ncu.edu.tw/ApcourseSys` (allowed): 大學先修課程 only, not regular offerings.
- data.gov.tw: no NCU course-offering dataset found.

## Request volume

1 request (robots.txt) per run.

## What the scheduler should do

Disable NCU. To enable it, NCU has to allow `/Course/` for `UniCourseBot` in robots.txt (or publish open data);
contact the 教務處課務組 to ask. Once allowed, `crawl` reports "robots.txt now allows the course query pages"
and the parser (fields above → snapshot fields) still has to be written.

## Field mapping

None yet (no data fetched). The intended mapping: 流水號 → `sourceId`, 課號 → `courseCode`, 班次 → `classCode`,
課程名稱 → `title`/`titleEn`, 必選修 → `requirementText`/`requirement`, 學分 → `credits`, 時間 → `schedule`/`scheduleText`
(day digit + period labels), 教室 → `location`, 授課教師 → `instructors`, 開課系所 → `department`, 人數上限 → `capacity`,
授課語言 → `language`, 備註 → `notes`, detail page → `sourceUrl`.

| Source field | Snapshot field | Status |
| --- | --- | --- |
| Registered count | `enrolled` (unavailable) | No aggregate count in the allowed sources examined; cannot verify the blocked `/Course/` listing. 人數上限 is capacity only. |

## Known gaps

Everything: no offerings are produced. `114-2`, `114-1`, `113-2`, and `113-1` were not backfilled because the source is disallowed and no permitted full catalogs were found.
