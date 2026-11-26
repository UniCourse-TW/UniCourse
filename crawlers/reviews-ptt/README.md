# @unicourse/crawler-reviews-ptt

Builds the external review search index (`external-reviews` snapshots, see `docs/external-reviews.md`) from
public PTT course boards: NTUcourse (ntu), NTHU_Course (nthu), NCTU-Teacher (nycu), NCHU-Courses (nchu).

- Access: PTT's robots.txt carries `Content-Signal: search=yes,ai-train=no,use=reference` and `Allow: /`.
  One request per second, `UniCourseBot/0.1 (+https://unicourse.observe.tw)`, `over18` cookie.
- Requests: list pages back to `--since` (default 2016-01-01), plus one article page per review post
  (`[評價]`, `[心得]`, `[通識]`, …) for the date, author handle, push tally and a ≤ 120 character excerpt.
  A full first run is roughly 1,500 list pages and several thousand articles; later runs reuse the cache in
  `<out>/.cache/` and only fetch new pages and articles.
- Kept per post: URL, title, author handle, date, board, push score, excerpt, and term/course/teachers parsed
  from the title. No comments, images or full text. NTUcourse authors who answered 否 to the reuse question
  get no excerpt.

```
corepack pnpm --filter @unicourse/crawler-reviews-ptt crawl -- --out /abs/path/snapshots/reviews
cargo run -p unicourse-ingest -- --external-reviews snapshots/reviews
```

Options: `--board <name>` (repeatable), `--since YYYY-MM-DD`, `--no-articles` (list fields only),
`--max-pages N`, `--max-articles N`.

Known gaps: titles that do not follow a board's format are parsed best-effort (ingest also tries the swapped
course/teacher reading); `Fw:` posts copied during board moves carry the move date when their article page is
not fetched.
