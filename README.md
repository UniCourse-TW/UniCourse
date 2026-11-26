# UniCourse

跨校大學課程搜尋。新版放在原 UniCourse repo；[舊 roadmap](docs/roadmap.md) 和 issues 保留。規劃中的正式網址是 `unicourse.observe.tw`。

## 開發

需要 Rustup（版本見 `rust-toolchain.toml`）、Node（版本見 `.node-version`）、Corepack、`just` 和 Docker Compose。Rust 的原生依賴需要 C toolchain，例如 Debian/Ubuntu 的 `build-essential`。

```sh
corepack pnpm install --frozen-lockfile
just dev
```

瀏覽 `http://127.0.0.1:5173`。`just dev` 會啟動本機 PostgreSQL、匯入三個合成校別資料集，再啟動 API 和網頁。介面會標示示範課程，不是師大、陽明交大或清大實際開課資料。不要對正式 DB 跑 `just seed` 或 `just test-e2e`。

```sh
corepack pnpm --filter @unicourse/web exec playwright install chromium
just db
just check
```

## 架構與匯入

- `crates/catalog`：PostgreSQL migrations 和查課查詢。跨學期課程以「學校 + 校方課號」區分；開課以「學校 + 學期 + 校方開課 ID」區分。搜尋比對中英文課名、開課單位、教師（`pg_trgm` 索引）和課號字首，可依學校、學期、開課單位篩選。
- `crates/ingest`：獨立程序，讀取已正規化的 JSON snapshot，每份 snapshot 是一校、一學期的完整清單。重跑不新增重複課程；被移出快照的班次會從搜尋下架。某份失敗不會回滾其他學校的成功匯入。參數可以是檔案或目錄（匯入目錄內所有 `*.json`，依檔名排序）。
- `crates/api`：Axum HTTP API，完整規格見 `openapi.json`（`just codegen` 從 Rust 重新產生 OpenAPI 和 TS 型別）。
  - 查課：`/api/schools`、`/api/schools/{school}`（學期與開課單位）、`/api/schools/{school}/departments/{department}`、`/api/instructors/{school}/{name}`、`/api/terms`（新到舊）、`/api/departments?school=`、`/api/courses`（`q`、`school`、`term`、`department`）和 `/api/courses/{id}`。
  - 總覽：`/api/rankings/courses?school=&limit=`（跨學期課程依歷年累計 `enrolled` 排序，沒有修課人數的學校改用 `capacity` 名額）和 `/api/stats/overview`。排名是 materialized view `course_rankings`，每次匯入成功後由 ingest 重新整理。
  - 社群：`/api/auth/register|login|logout|me`（帳號密碼、argon2id、HttpOnly cookie `uc_session`，session 存在 PostgreSQL；同一帳號每分鐘最多 10 次登入失敗）、`/api/users/{username}`、`/api/courses/{school}/{courseCode}/ratings`（`/stats`、`/me`）、`/api/posts`（回覆、投票、軟刪除）。公告需要 `users.is_admin`，目前只能用 SQL 設定。
  - 環境變數：`DATABASE_URL`、`API_BIND`，以及 `COOKIE_SECURE=1`（HTTPS 正式環境替 cookie 加上 `Secure`；本機預設關閉）。API 啟動時會自動跑 migrations。
- `apps/web`：SvelteKit SSR；不直接查 PostgreSQL 或校方網站。搜尋頁預設最新學期。

Snapshot 格式見 [`docs/snapshot-format.md`](docs/snapshot-format.md)（v2；v1 檔案仍有效，新欄位都是選填），爬蟲寫法見 [`docs/crawlers.md`](docs/crawlers.md)。[`fixtures/nthu-115-1.json`](fixtures/nthu-115-1.json) 是含全部 v2 欄位的合成範例。`isDemo: true` 只能用在本機示範資料，且示範資料不能覆蓋已匯入的正式資料。

匯入爬蟲輸出（預設寫到 git 忽略的 `snapshots/`）：

```sh
just db
cargo run --locked --package unicourse-ingest -- snapshots/
```

標誌沿用 `UniCourse-TW/Public-Assets` 的 `UniCourse_icon.128x128.png`。
