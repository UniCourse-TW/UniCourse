# UniCourse 24h plan: data first, then storyboard, then UI climb

## Order of work

1. **Data (highest priority)**
   - National course data: the MOE 大學校院課程資源網 (course-tvc, operated by YunTech) lists courses for
     every institution; turn it into snapshots so the catalog grows beyond the 9 school-specific crawlers.
   - External reviews: a search index of public review posts (PTT course boards first). Store only what a
     search engine shows: link, title, author handle, date, board, push count, a short excerpt (≤ 120 chars),
     and the matched school/course/teacher. Never republish full text, never use it for model training.
     Sites whose robots.txt carries `Content-Signal: search=yes, ai-train=no, use=reference` allow exactly
     this. Sites without an explicit allowance (e.g. OPT 歐趴糖, NCKU HUB, NTU Rating) get outbound links
     only, built from their public URL patterns, no content copied.
2. **Storyboards**: one per page, grounded in the observe.tw family (tag.analysis.tw, youtube.observe.tw,
   site/traffic.observe.tw for dense data tables and filters; puma-academic.observe.tw for visual data) and
   in the historical UniCourse features. Output: `docs/ui-climb/storyboards/*.md`.
3. **Design system pass**: tokens, type scale, layout primitives, table/filter/chart components shared by
   every page, matching the observe.tw family.
4. **UI climb**: per page, iterate implement → screenshot → judge until every page averages ≥ 9.0.

## Pages under climb

| id | route | purpose |
| --- | --- | --- |
| home | `/` | search + historical enrollment ranking + coverage summary |
| search | `/?q=…` | search results with school/term/department filters |
| course | `/courses/{id}` | offering detail, ratings, external reviews, related discussion |
| schools | `/schools` | nationwide coverage/status table |
| school | `/schools/{slug}` | one school: terms, departments, top courses |
| department | `/schools/{slug}/departments/{name}` | department offerings by term |
| instructor | `/instructors/{school}/{name}` | teacher's offerings across terms |
| forum | `/forum` | discussion list with filters |
| thread | `/forum/{id}` | thread, replies, votes |
| auth | `/auth` | sign in / register |
| settings | `/settings` | profile settings |
| profile | `/u/{username}` | public profile |
| landscape | `/landscape.html` → `/landscape` | course-site landscape |
| legal | `/terms`, `/privacy` | static pages |

## Scoring rubric (0–10 each; a page score is the mean of applicable dimensions)

| key | dimension | 10 means |
| --- | --- | --- |
| task | Task completion | the page's main job is obvious and takes the fewest steps |
| hierarchy | Information architecture | summary before detail, clear grouping, nothing competes |
| density | Density and scannability | lots of data stays readable: aligned columns, tabular numbers, sticky headers, filters |
| viz | Data visualization | charts/bars/sparklines where numbers matter, drawn to scale; `null` if the page has no quantitative data |
| family | observe.tw family fit | looks like a sibling of tag/youtube/site/puma-academic while keeping the UniCourse brand |
| type | Typography and spacing | consistent scale, rhythm, CJK-appropriate line height and widths |
| mobile | Phone layout (390 px) | no horizontal page scroll, touch targets ≥ 44 px, nothing clipped |
| theme | Light and dark | both themes designed, contrast holds |
| a11y | Accessibility | semantics, focus states, labels, WCAG AA contrast, keyboard paths |
| states | Empty / loading / error / no-JS states | every state designed and helpful |
| copy | Microcopy (zh-TW) | short, specific, consistent terms, Taiwan usage |
| feel | Interaction and perceived performance | feedback on every action, no layout shift, fast first paint |

### Judges and thresholds

- Judges (from round 9, at the user's request to reduce Fable usage): Claude Opus 5.5, GPT-6.2 Sol and
  GPT-6.2 Astra. Fable judged rounds 4–8.
- A page is judged by **Sol + Opus** until their mean reaches **8.5**; from then on **all three** judge it.
- **Done** when every page's three-judge mean is **≥ 9.0**.
- Judges score from screenshots (`docs/ui-climb/shots/<round>/<page>-<phone|desktop>-<light|dark>.png`)
  plus the live preview, and return the JSON in `docs/ui-climb/judge-schema.json`. Scores and feedback are
  stored in `docs/ui-climb/scores/<round>/<judge>.json`; `scripts/ui-scoreboard.mjs` aggregates them into
  `docs/ui-climb/scoreboard.md`.
