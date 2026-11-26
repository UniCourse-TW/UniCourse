# Stage 2: community features and overview (contract)

Goal: bring back the features of the historical UniCourse (realm/Backend repos) on the new Rust + SvelteKit
stack, and turn the home page into an overview rather than a plain search box.

## Historical features to restore (from UniCourse-TW/realm)

| realm feature | new home |
| --- | --- |
| Course search, course page | exists (`/`, `/courses/{id}`) |
| Instructor page (`/course/instructor/{slug}`) | `/instructors/{school}/{name}`: all offerings taught by that name at that school, grouped by term |
| Provider page (`/course/provider/{slug}`) | `/schools/{school}` and `/schools/{school}/departments/{department}` |
| Program page | out of scope until a school publishes program membership (snapshot `extra` keeps 學分學程 text) |
| Ratings (`/api/course/{slug}/rating`, `/me`, `/stats`) | `/api/courses/{school}/{courseCode}/ratings` (+ `/me`, `/stats`) keyed by the cross-term course, not the offering |
| Forum (posts, replies, votes, tags, course-linked) | `/api/posts`, `/api/posts/{id}`, `/api/posts/{id}/replies`, `/api/posts/{id}/vote`; web `/forum`, `/forum/{id}` |
| Auth (register/login/logout/self), invitations, email verify | `/api/auth/register|login|logout|me` with username + password (argon2) and an HttpOnly session cookie; invitations and email verification deferred (no mail service yet) |
| Profile `@username`, settings | `/u/{username}` (public ratings + posts), `/settings` (display name, bio, school) |
| Stats (`/api/stats`) | `/api/stats/overview` |
| Course-pack import | replaced by `crates/ingest` + crawlers |
| i18n zh-TW/en | zh-TW only for now (keep strings in one place for later) |
| Terms / privacy pages | `/terms`, `/privacy` (static) |

## Home page overview

The first thing on the home page is a ranking of courses by **cumulative historical enrollment**:
for each cross-term course `(school, course_code)` sum `enrolled` over every imported term; when a
school never publishes `enrolled`, fall back to summing `capacity` and label it clearly as 名額.
Also show: total offerings / courses / schools / terms indexed, per-school offering counts, and the
latest import time per school. The search form stays at the top.

Rankings API: `GET /api/rankings/courses?school=&limit=` returns
`{ school, schoolName, courseCode, title, titleEn, terms, offerings, enrolledTotal, capacityTotal, latestOfferingId, latestActiveOfferingId, trend, isDemo }[]`
ordered by `enrolledTotal DESC NULLS LAST, capacityTotal DESC NULLS LAST`. `trend` contains up to
ten `{ term, enrolled, capacity }` entries, newest first, including withdrawn offerings. The view is
materialized and refreshed on ingest. `latestActiveOfferingId` is `null` if every offering is withdrawn;
`latestOfferingId` still links to the latest withdrawn offering in that case. Offering IDs are strings.

## Catalog history and trends

- `GET /api/courses` retains its array response. `GET /api/courses/search` accepts the same filters
  plus `offset` (non-negative, default 0) and `sort` (`relevance`, `enrolled`, `title`), and returns
  `{ total, offset, courses: Offering[] }`. Each page contains at most 50 active offerings. `total`
  is the unpaginated count, including when `offset` is beyond the last match. Enrollment sorts descending, unpublished values last; titles sort ascending.
- `GET /api/schools/{school}/departments/{department}?term=` accepts an optional exact term.
  `total` and `offerings` match the filter, while `terms` always lists all available terms, newest
  first. A known department with no matches in the selected term returns 200 with an empty list.
- `GET /api/courses/{id}` serves both active and withdrawn offerings (`active: boolean`); search
  and ordinary listings still exclude withdrawn offerings.
- `GET /api/courses/{school}/{courseCode}` returns
  `{ school, schoolName, courseCode, title, titleEn?, department?, terms, totals, latestActiveOfferingId }`.
  The title and department come from the newest term (prefer an active offering within that term).
  Each term is `{ term, offerings: Offering[], enrolled, capacity }`, newest first. `totals` is
  `{ terms, offerings, enrolledTotal, capacityTotal }`. Both aggregate over active and withdrawn rows.
- Append `/trends` to `/api/schools/{school}`, `/api/schools/{school}/departments/{department}` or
  `/api/instructors/{school}/{name}` for `{ term, offerings, courses, enrolled, capacity }[]`, newest
  first. These count active offerings, with distinct cross-term course codes counted once per term.
  A known school without active offerings returns `[]`; unknown schools or scopes return 404.
- Enrollment and capacity sums are `null` when every contributing value is unpublished; reported
  zero values remain zero.

## API conventions

Errors have a stable `code` and a human-readable `message`. Signed-in users who have not rated a
known course get `200 null` from `GET .../ratings/me`; an unknown course returns `404 not_found`.
Profile ratings include `latestOfferingId`, or `null` if the course has no offering. Forum list
filters accept only `announcement`, `article`, and `question`. Post, reply, and rating timestamps
include fractional seconds so clients can detect edits made within the same second.

## Data additions

- Offering `enrolled` (integer, optional) added to the snapshot contract (kit schema + docs); the Rust
  side needs the column, validation, API field and the ranking aggregates.
- Accounts: `users(id, username unique citext-like lower, display_name, password_hash, school, bio, created_at)`,
  `sessions(id random 32 bytes, user_id, created_at, expires_at)`; cookie `uc_session`, HttpOnly, SameSite=Lax,
  Secure when ORIGIN is https, 30 days.
- Ratings: `ratings(user_id, school, course_code, score 1..5, review text nullable, created_at, updated_at)`,
  unique (user_id, school, course_code).
- Forum: `posts(id, author_id, type announcement|article|question|reply, title nullable for replies,
  content, school nullable, course_code nullable, parent_id nullable, created_at, updated_at, deleted_at)`,
  `post_votes(post_id, user_id, value -1|1)`, `post_tags(post_id, tag)`.

Business rules live in Rust. The web app never talks to PostgreSQL directly.
