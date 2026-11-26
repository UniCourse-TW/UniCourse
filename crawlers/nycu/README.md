# NYCU crawler

## Source and access

The [NYCU public timetable](https://timetable.nycu.edu.tw/) lists courses by term and department. The timetable's own JavaScript calls `get_acysem`, `get_type`, `get_category`, `get_college`, `get_dep`, and `get_cos_list` by form POST. The UI requires a department or a special filter: a term-only query returned no results. The crawler traverses undergraduate, graduate, common, and program department menus and requests each distinct department query once. It deduplicates by `cos_id`, preferring a primary (`1`, 主開) row to a secondary (`2`, 輔開) copy.

Access checked November 27, 2026 (Taipei): all timetable requests are login-free. `/robots.txt` returned HTTP 404; no timetable-specific terms or privacy page was linked from the query or syllabus interface. The crawler uses the kit's `UniCourseBot` User-Agent, serial requests with at least 400 ms between starts, and built-in backoff on transient failures.

Full-term request volume is one term check, the department discovery calls, and one course-list request per distinct department query; the crawler logs these totals before retries. A smoke run stops once it has enough unique rows. The default crawl constructs published syllabus links without visiting individual courses.

The public term menu lists `114-2`, `114-1`, `113-2`, and `113-1`. The crawler passes the requested term to menu discovery and to each course query, and checks `acy` and `sem` on the returned rows.

The November 27 full run for **115-1** made **424** requests, including **342** department queries, in **211 seconds**. It consolidated 8,214 returned rows into **3,649 offerings** with no snapshot validation failures. The separate NYCozU sitemap disagreed with the live timetable; sampled NYCozU-only IDs did not resolve in the official timetable's exact-ID query, so the crawler does not merge that index into the snapshot.

```sh
corepack pnpm --filter @unicourse/crawler-nycu crawl -- --term 115-1 --out "$PWD/snapshots/nycu-115-1.json"
```

To preview course descriptions in a separate, limited output, set `UNICOURSE_NYCU_FETCH_DESCRIPTIONS=1` and pass `--limit` from 1 to 20. This adds at most one public `getCrsOutlineDescription` request per selected offering with an HTML syllabus. It does not download attachments or read the contact field. Do not import smoke outputs.

## Fields

| NYCU field | Snapshot field | Mapping |
| --- | --- | --- |
| `cos_id`, `cos_code` | `sourceId`, `courseCode` | Per-term course number and permanent course number, respectively. Distinct sections can share the latter. |
| `cos_cname`, `cos_ename`, `teacher` | `title`, `titleEn`, `instructors` | Trim names and split staff on the roster's `、` separator. |
| `dep_cname`, `dep_id` | `department`, `departmentCode` | Use the department from the primary course row when available; a query department UUID is not substituted for the row code. |
| `cos_type`, `cos_credit`, `num_limit` | `requirementText`, `requirement`, `credits`, `capacity` | Map select labels with the shared helper; accept leading-dot credits such as `.30` and `.00`. Limits above 999 are the timetable's unlimited sentinel and are omitted. |
| `reg_num` 修課人數 | `enrolled` | Use the public registered count, including zero. The timetable hides it during add/drop; omit blank or negative placeholders such as `-999`. |
| `cos_time` | `scheduleText`, `schedule`, `campus` | Retain the raw line; parse weekday codes with compact periods and rooms; map the campus suffix when exactly one recognized campus is present. |
| `language.授課語言代碼`, `memo` | `language`, `notes`, `grade` | Keep the published language code and remarks; redact email addresses. Populate grade only from an explicit `主開…年級` label. |
| `crsoutline_type`, `acy`, `sem`, `cos_id` | `syllabusUrl`, `sourceUrl` | Use the timetable's `crsoutline` or `crsoutlinefile` link when present; otherwise point to the timetable. |
| `crs_outline` | `description` | Only in explicitly limited description runs; render the outline as plain text. |
| Remaining course columns, `URL`, nested `costype` and `brief` | `extra` | Keep original names. Serialize nonempty taxonomy metadata as JSON strings. Exclude teacher profile links (`TURL`). |

## Known gaps

- The list response has no separate class code or grade column. The six-digit course number already distinguishes offerings. `brief` is the timetable's category label summary, not a course description.
- Unknown time formats and multi-campus offerings retain the original text even where a normalized time or a single campus cannot be supplied.
- The scheduler should avoid overlapping runs on the same school; a broad crawl traverses hundreds of queries. No direct requests were blocked from the development environment; cloud egress was not tested separately.
