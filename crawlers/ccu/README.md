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

The same department listings support `114-2`, `114-1`, `113-2`, and `113-1` via `yearterm` (e.g. `114_2`).
The crawler checks the selected term and each returned row's 開課學年度, with the explicit empty-table exception above.

| Source field | Snapshot field | Mapping notes |
| --- | --- | --- |
| 課程代碼 | `sourceId`, `courseCode`, `classCode` | For `1101620_01`, use the full code as the term's identity, `1101620` as the catalog code, and `01` as the class. |
| 課程名稱及介紹 | `title`, `syllabusUrl`, `sourceUrl` | Keep the displayed title and link, if provided. |
| 開課單位、系所查詢 `cd` | `department`, `departmentCode` | Use the published unit and its directory code. |
| 授課教師 | `instructors` | Split the names, including team teaching. |
| 學分數、必/選修 | `credits`, `requirementText`, `requirement` | Numeric credits and raw/normalized requirement. |
| 上課時間 | `scheduleText`, `schedule` | Preserve the display text; parse weekdays and numeric or lettered periods. |
| — | `enrolled` (omitted) | The public eCourse2 listing does not publish enrollment, capacity, or remaining seats. |
| 遠距教學、核心能力 | `extra` | Keep the published flag and course-map link. |
| 大綱英文課名、課程概述 | `titleEn`, `description` | Optional syllabus fetch only. |

Room, enrollment capacity, campus, teaching language, grade, and course notes are not published
by this listing. The remote-learning flag is not a teaching language. This snapshot represents
the public eCourse2 catalog; there is no independent completeness check against the authenticated
enrollment portal.
