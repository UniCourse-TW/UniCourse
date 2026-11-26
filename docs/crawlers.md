# Crawlers

One pnpm package per school under `crawlers/<slug>/`, all built on `@unicourse/crawler-kit`.

```
crawlers/<slug>/
  package.json          # @unicourse/crawler-<slug>; scripts crawl / check / test
  README.md             # source system, access check, request volume, field mapping, known gaps
  src/main.ts           # `await runCrawler(crawler)`
  src/crawler.ts        # `export const crawler = defineCrawler({...})`; fetching only
  src/parse.ts          # pure parsing functions (HTML/JSON -> Offering[]), unit tested
  src/tidy.ts           # optional: idempotent offering-level cleanup (`tidyOffering`), applied by the parser
  src/retidy.ts         # optional: rewrite saved snapshots through tidyOffering (`pnpm … retidy -- <abs paths>`)
  src/parse.test.ts     # node:test against small saved samples
  src/samples/          # trimmed real responses (<200 KB total), no personal data beyond instructor names
```

Run a crawl: `corepack pnpm --filter @unicourse/crawler-<slug> crawl -- --term 115-1 [--limit 20] [--out path]`.
Output defaults to `snapshots/<slug>-<term>.json` relative to the current directory (pnpm runs the script inside the
package, so pass `--out ../../snapshots/<slug>-<term>.json` or use `just crawl`, which writes to the repo-level,
git-ignored `snapshots/`). Every file is validated by the shared Zod schema. `--limit` runs write `*.preview.json`.

`crawlers/tvc` is the exception: one package for the national 大學校院 / 技職校院課程資源網, writing
`snapshots/tvc/<slug>-<term>.json` for every school without its own crawler (`just crawl-tvc --term 115-1`;
see its README). It never writes a school whose `crawlers/status.json` entry has no `source: "tvc"`, so
the dedicated crawler always wins.

Production status per school lives in each package README; `scripts/crawl-all.sh` skips `ncu` (robots.txt),
`ntua` (login-only campus list) and `ncku` (CAPTCHA) by default.
`crawl-all.sh` also skips `tvc`, which runs weekly as its own job. Import with
`cargo run -p unicourse-ingest -- snapshots/*.json snapshots/tvc`.
`crawlers/reviews-ptt` is not a school crawler: it writes `external-reviews` snapshots (PTT course boards) for
`unicourse-ingest --external-reviews`; see `docs/external-reviews.md`.

Rules: public, login-free sources only; honour robots.txt; at most 2 concurrent requests and ≥400 ms spacing
per school (kit defaults); identify as `UniCourseBot`; never set `isDemo: true` on real data; never commit
full snapshots (fixtures stay synthetic).

Data quality (see `docs/data-quality.md`, audit with `python3 -I scripts/audit-snapshots.py <files>`): `extra` keys are
labels students read, so map API field names to the school's UI labels and drop internal codes; decode HTML
entities and markup; omit sentinel limits (9999, a 0 limit on a course with students) instead of publishing them as
`capacity`. Crawlers keep no raw responses, so when a cleanup rule changes, add it to `tidyOffering` and run the
package's `retidy` script over `snapshots/history/<slug>-*.json` instead of re-crawling ten years.
