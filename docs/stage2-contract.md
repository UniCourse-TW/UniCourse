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
`{ school, schoolName, courseCode, title, titleEn?, terms: number, offerings: number, enrolledTotal: number|null, capacityTotal: number|null, latestOfferingId }`
ordered by `enrolledTotal DESC NULLS LAST, capacityTotal DESC`. Implement with a materialized view or
a plain aggregate query with an index; refresh on ingest if materialized.

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
