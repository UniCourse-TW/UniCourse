# External reviews

UniCourse keeps a **search index** of public course-review posts on other sites, so a course page can say
"there are 12 posts about this course on PTT" and link to them. It is an index, not a mirror:

- Stored per post: link, title, author handle, date, board, push/like count, an excerpt of **at most 120
  characters** from the start of the body, and the matched school/course/teacher. Nothing else: no full text,
  no images, no comment text.
- Never republished in full, never used for model training (several sources say `ai-train=no`).
- Sites without an explicit allowance get **outbound links only**: search URLs built from their public URL
  patterns. Nothing from those sites is fetched, stored or shown.
- Crawlers identify as `UniCourseBot/0.1 (+https://unicourse.observe.tw)` and make at most one request per
  second per host.

## Policy per source

Checked on 2026-11-27 for every `review`/`forum` entry in `data/course-sites.json` that is still online.
`index` = robots.txt explicitly allows search indexing (`Content-Signal: search=yes`) or the site explicitly
allows this use; `link_only` = no explicit allowance, so we only build outbound links from public URL
patterns (no requests beyond checking the pattern once); `skip` = nothing to do.

| source | robots.txt / Content-Signal | terms | policy | in this branch |
| --- | --- | --- | --- | --- |
| PTT 批踢踢實業坊 (`www.ptt.cc`) | `User-agent: *` `Content-Signal: search=yes,ai-train=no,use=reference` `Allow: /`; AI-training bots are disallowed | the robots.txt preamble defines `search` as "building a search index and providing search results (e.g. returning hyperlinks and short excerpts)", which is exactly this feature | **index** | crawled: NTUcourse, NTHU_Course, NCTU-Teacher, NCHU-Courses |
| NTHUMods (`nthumods.com`) | `Content-Signal: search=yes,ai-train=no,use=reference`, `Allow: /` | none found | **index** (allowed) | not crawled yet: reviews are not on public HTML pages (SPA + login for parts); no data, no link |
| OPT 歐趴糖 (`www.1111opt.com.tw`) | no robots.txt (`/robots.txt` redirects to the 404 page), no Content-Signal | 使用者條款 at `/article/2000` is rendered client-side; nothing grants indexing | **link_only** | search link: `/search-result/` + base64url(encodeURIComponent(JSON `{keyword, type: 0, order: "-modify_time"}`)), the encoding the site's own search box uses; checked once (HTTP 200, page title 【普通物理】課程選課評價加退選) |
| Dcard (`www.dcard.tw`) | `User-agent: *` `Disallow: /emails/activate`, no Content-Signal | unreachable for the bot (Cloudflare 403) | **link_only** | search link `https://www.dcard.tw/search?query=<school short name> <title> <teacher>`; the site's public search URL (403 for bots, works in browsers) |
| 想鑑你 NTU Rating (`rating.myntu.me`) | `User-agent: *` `Disallow:` (empty), no Content-Signal | content needs an NTU account | **link_only** | NTU only: `https://rating.myntu.me/search/0?courseName=…&instructor=…` (route and parameter names from the site's own bundle) |
| NCKU HUB (`nckuhub.com`) | only the Cloudflare Content-Signal *comment preamble*; no `Content-Signal:` line and no rules | none found | **link_only** | no link: NCKU is not in the catalog (CAPTCHA) and the SPA has no stable public search URL |
| TUN 大學網 (`university.1111.com.tw`) | no robots.txt (redirects to `error.asp`) | — | **skip** | same 1111 review data as OPT 歐趴糖; we link OPT instead |
| CCU PLUS (`ccu.plus`) | `Disallow:` (empty), no Content-Signal | none found | **link_only** | no link yet: SPA, no public search URL pattern found |
| Course Search 選課小幫手 (`fcu-coursesearch.com`) | no robots.txt (404) | none found | **link_only** | no link yet: no public search URL pattern found |
| NTPU no21, TAINAN選, 東吳課程評價, 中正選課指北 (HackMD) | allow all, no Content-Signal | — | **skip** | schools not in the catalog, or a single shared document rather than a review index |
| CrossLink, 師大好排課, browser extensions (台大課程評價小幫手, 清大選課助手, NCKU-Evaluator, NCCU tools) | — | — | **skip** | planners/extensions, no public review pages |
| UrSchool, NTU Sweety, NCTU+, 政大課程評價網, ClassIn, cycucoursewiki, KeBiau, NKUST Course Radar, TTUCourse, takming-forum, PTT FJU_class | — | — | **skip** | offline, inactive or outside the catalog (`status` in `data/course-sites.json`) |
| Colorgy | — | — | **skip** | domain now redirects to an unrelated gambling site; never link |

### PTT boards

Found by walking PTT's class tree (`/cls/…`) for every catalog school. Only dedicated course/teacher boards
are indexed:

| board | school | notes |
| --- | --- | --- |
| `NTUcourse` | ntu | `[評價] 113-1 王小明 普通物理`; the template asks whether the post may be reused — when the author answered 否, no excerpt is stored |
| `NTHU_Course` | nthu | `[心得] 課名 老師`; older posts are `Fw:` copies dated by the 2017 board move |
| `NCTU-Teacher` | nycu | `[心得] 113-1 老師 課名`; older posts are `Fw:` copies dated by the 2016 board move |
| `NCHU-Courses` | nchu | `[心得] 系所/節次/課名/老師` |

Not indexed: NCCU, NTNU, CCU and FCU only have general school boards (mixed topics) or department boards;
TNUA has none; `FCUProblems` shares past exams, not reviews; NCKU/NCU/NTUA are not in the catalog.

## Snapshot format `external-reviews` (v1)

One JSON file per board, written by `crawlers/reviews-ptt` to `snapshots/reviews/ptt-<board>.json` (git
ignored). The Zod schema `ExternalReviewSnapshot` in `crawlers/kit/src/external-reviews.ts` is canonical;
`crates/ingest` accepts exactly the same shape (`deny_unknown_fields`). The synthetic
`fixtures/external-reviews/ptt-demo.json` is the demo/e2e example.

| field | type | required | meaning |
| --- | --- | --- | --- |
| `format` | `"external-reviews"` | yes | Distinguishes the file from course snapshots. |
| `version` | `1` | yes | |
| `source` | `"ptt"` | yes | Source id; only `index` sources produce snapshots. |
| `board` | string | yes | Board name, e.g. `NTUcourse`. |
| `boardUrl` | URL | yes | Board entry page. |
| `school` | school slug | no | School of the board (mapping in `crawlers/reviews-ptt/src/boards.ts`); omitted for cross-school boards, whose posts are then never matched. |
| `isDemo` | boolean | yes | `true` only for synthetic data; demo rows never overwrite live rows. |
| `fetchedAt` | UTC instant | yes | When the crawl finished. |
| `posts` | array | yes | May be empty. |

Post (`(source, url)` is the identity; URLs are unique within a file):

| field | type | required | meaning |
| --- | --- | --- | --- |
| `url` | URL | yes | Original post. Live PTT posts must start with `https://www.ptt.cc/`. |
| `title` | string | yes | Post title as listed. |
| `author` | string | no | Public author handle (PTT ID without nickname). |
| `postedAt` | UTC instant | no | From the article header (時間, Asia/Taipei), else from the article id `M.<unix>.A.xxx`. |
| `pushScore` | integer | no | Pushes minus boos: counted on the article page when fetched, else PTT's list value (capped at ±100, 爆/XX). |
| `excerpt` | string ≤ 120 code points | no | Start of the body, whitespace collapsed, without header, `※` lines, links (images are links), signature and comments. |
| `tag` | string | no | Title tag without brackets (`評價`, `心得`, `問題`, …). |
| `term` | `YYY-N` | no | Term parsed from the title (`113-1`, `1131`, `1072`, `(100-1)`). |
| `courseTitle` | string | no | Course title parsed from the title. |
| `teachers` | non-empty string[] | no | Teacher names parsed from the title (`、` `/` `,` separated). |

Strings are trimmed, non-empty and NUL-free, like course snapshots. Only posts dated on or after `--since`
(default 2016-01-01, the catalog starts at 105-1) are kept. Article pages are fetched only for review tags
(`評價 心得 通識 評鑑 課程 分享 推薦`); other posts keep the list fields only and stay searchable.

## Matching (crates/ingest, at import time)

`unicourse-ingest --external-reviews <file | dir> [...]` imports each file in one transaction, upserting on
`(source, url)`, so re-running it is idempotent and refreshes matches against the catalog as it is now (posts
missing from a newer file are kept). For a board with a school, every offering of that school (all terms,
active or not) is loaded and each post is matched:

1. Titles are normalised: fullwidth → halfwidth, lower case, 臺 → 台, Ⅰ–Ⅳ → 一–四, and everything that is not
   a letter or digit (punctuation, brackets, spaces) removed. Names also lose a trailing 老師/教授.
2. **exact**: same normalised title and one of the post's teachers teaches that course.
3. **contains**: one normalised title contains the other (both ≥ 2 characters), same teacher; the closest
   length wins.
4. Steps 2–3 also try the swapped reading of a two-part title (`王小明 微積分` vs `微積分 王小明`).
5. **title**: the post names no teacher and exactly one course at the school has that exact title.
6. Ties: a course offered in the post's term, then the most recently offered course.

Unmatched posts are kept with `course_code`/`match_kind` NULL (`match: null` in the API). When a post's
teacher exists at the school, `instructor` is still set so the instructor page can list it.

## API

- `GET /api/courses/{school}/{courseCode}/external-reviews` → `{ sources: [{source, sourceLabel, count}],
  posts: [...], linkOnly: [{source, label, url}] }`: up to 100 matched posts, newest first, and outbound search
  links (NTU Rating for ntu, OPT 歐趴糖, Dcard) built from the newest offering's title and first teacher.
- `GET /api/instructors/{school}/{name}/external-reviews`: posts whose matched or parsed teacher is `name`, plus
  outbound links for the teacher.

## Running

```
corepack pnpm --filter @unicourse/crawler-reviews-ptt crawl -- --out /abs/path/snapshots/reviews [--board NTUcourse] [--since 2016-01-01] [--no-articles] [--max-articles N]
cargo run -p unicourse-ingest -- --external-reviews snapshots/reviews
```

The crawler caches parsed list pages and articles in `<out>/.cache/` so an interrupted run resumes; the two
newest list pages are always refetched.
