# NCHU course crawler

Source: [國立中興大學課程查詢](https://onepiece.nchu.edu.tw/cofsys/plsql/crseqry_home),
[綜合查詢（含微課程）](https://onepiece.nchu.edu.tw/cofsys/plsql/crseqry_all).
The UTF-8 query form and linked syllabi are public without login. The query host returned HTTP 404 for
`robots.txt` on 2026-11-26 (Taipei). No crawler-specific terms, bulk export, or public JSON endpoint
were linked from the inspected query and syllabus pages. The crawler uses the official HTML query,
with the shared `UniCourseBot` user agent, rate limit and retry policy.

## Run

```sh
corepack pnpm --filter @unicourse/crawler-nchu crawl -- --term 115-1 --out ../../snapshots/nchu-115-1.json
```

The term was published. A full crawl makes two sequential list requests, splitting by the form's
`英文/EMI=N` and `英文/EMI=Y` filters. In 115-1 these yielded 3,969 and 584 distinct class records,
with no overlap, for a total of 4,553 classes in 9.4 seconds. The official micro-course listing was
covered by the same partitions. The 20-row smoke path stops after the first partition. Set
`NCHU_FETCH_SYLLABI=1` with `--limit 20` (or smaller)
to additionally fetch `課程簡述`; the full path does not request individual syllabi except for the
`114-1` fallback below.

`114-2`, `114-1`, `113-2`, and `113-1` are available. The parser checks both the selected term
and each returned syllabus link. The broad non-EMI query for `114-1` returns HTTP 404 on both
public catalog views. The crawler partitions it by the official selection-number suffix filter,
subdividing the failing suffix until selection number `4302`. The separate public syllabus confirms
that offering (`3746`) and its term. It supplies the class's core metadata, but does not publish
capacity or enrollment, so those fields remain absent. The full fallback made 43 requests including
the 404 responses. Other failed partitions still abort the crawl.

### History (105-1 … 114-2)

The form's `p_year` selector lists every term back to `0941` (094-1, checked 2026-11-27), and a probe
of `p_year=0941&v_emi=N` returned a normal listing with 916 syllabus links for `v_strm=0941`. The
kit's `--term 094-1` already maps to `0941`, so no different endpoint or term format is needed. The
backfill covers 105-1 … 114-2 (ten academic years). Terms 094-1 … 104-2 are published too, but they
have not been crawled or validated. Each term made 2 list requests in 8–10 s, except 114-1 (43
requests, 33 s, see above). Per-term counts are in
`snapshots/.backfill/validation-10y-nchu.log`.

| Term | Classes | With `enrolled` | | Term | Classes | With `enrolled` |
| --- | ---: | ---: | --- | --- | ---: | ---: |
| 105-1 | 4,154 | 4,154 | | 110-1 | 4,127 | 4,126 |
| 105-2 | 3,915 | 3,913 | | 110-2 | 3,909 | 3,907 |
| 106-1 | 4,225 | 4,225 | | 111-1 | 4,327 | 4,323 |
| 106-2 | 3,976 | 3,974 | | 111-2 | 4,221 | 4,219 |
| 107-1 | 4,173 | 4,171 | | 112-1 | 4,505 | 4,502 |
| 107-2 | 3,993 | 3,990 | | 112-2 | 4,267 | 4,263 |
| 108-1 | 4,131 | 4,131 | | 113-1 | 4,627 | 4,626 |
| 108-2 | 3,940 | 3,937 | | 113-2 | 4,265 | 4,262 |
| 109-1 | 4,170 | 4,168 | | 114-1 | 4,609 | 4,604 |
| 109-2 | 3,898 | 3,895 | | 114-2 | 4,260 | 4,257 |

Quirks across the years:

- The table columns are unchanged since 105-1. Older pages use looser markup: no `<tbody>`, unclosed
  `<tr>`, and `</BR>` line breaks. Cheerio normalizes these
  (`src/samples/list-105-1.html`).
- The `英文/EMI=Y` partition is empty up to 109-1, has 1 class in 109-2, and has 200 or more from
  110-1 on. The partitions still never overlap.
- Older terms use a noon period `M` between periods 4 and 5 (e.g. `234M`). The current legend omits it,
  but the courses' own 備註 define it (`節次M上課時間為12:00-13:00`, `M:中午12:10~13:00`). It is kept as
  the period label `M`. Ranges such as `4-M` are not expanded. Every remaining unstructured schedule in
  the history has time `*`.
- `可加選餘額` is today's value for past terms, i.e. the final balance. A few classes per term publish a
  balance larger than capacity, and two classes in 110-2 and 114-1 publish no capacity. These classes
  have no `enrolled`.
- The `v_strm` and the selected term are checked for every term, so a silent fallback to the current
  term would abort the run.

| Source field | Snapshot field | Mapping notes |
| --- | --- | --- |
| `Syllabus_main` link's `v_class_nbr` | `sourceId` | The official per-term class identifier; repeated rows with the same identifier are deduplicated. Different classes can share a displayed selection number. |
| 選課號碼 | `courseCode`, `extra.選課號碼` | No stable subject code is present in the list or syllabus. Use a term-scoped fallback, e.g. `6906@1151`, and keep the unmodified number separately. `6906` refers to different subjects in 114-2 and 115-1. |
| 科目名稱 | `title`, `titleEn` | Chinese and English lines, when present. |
| 上課教師、實習教師 | `instructors` | Split the listed names, preferring the full roster from the hover text; merge and deduplicate. |
| 開課單位 | `department` | The offering unit, not the enrollment cohort. |
| 選課系所、年級、班別 | `extra.選課系所`, `grade`, `classCode` | From the cohort header. Grade `0` has no target year. |
| 必選別、學分數、開課人數、授課語言 | `requirementText`, `requirement`, `credits`, `capacity`, `language` | Keep published labels; normalize only the requirement enum and numeric fields. |
| 開課人數 − 可加選餘額 | `enrolled` | No direct enrolled count is published in the list. Subtract only when both fields are published as nonnegative integers and the remaining balance does not exceed capacity. Keep the source balance in `extra`. |
| 上課時間、上課教室、實習時間、實習教室 | `scheduleText`, `schedule` | Keep text in display order. Decode weekdays, periods (`1`–`9`, `A`–`D`, noon `M`), and aligned rooms; `*` does not identify a set time or room. |
| 課程大綱、課程簡述 | `sourceUrl`, `syllabusUrl`, `description` | Keep the per-offering link; description is smoke-only opt-in. |
| 備註 | `notes` | Omit clauses containing contact details. |
| 先修科目、全/半年、上課時數、實習時數、實習教師、外系人數、可加選餘額 | `extra` | Original column names and text. |

Cohort codes describe enrollment eligibility, not necessarily the offering department, so the
crawler does not write `departmentCode`. It also omits `campus` because the query has no campus
column. The scheduler must not use the fallback `courseCode` to link subjects across terms.
