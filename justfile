export DATABASE_URL := env_var_or_default('DATABASE_URL', 'postgres://unicourse:unicourse@127.0.0.1:55432/unicourse')
export API_BIND := env_var_or_default('API_BIND', '127.0.0.1:3001')
export API_ORIGIN := env_var_or_default('API_ORIGIN', 'http://127.0.0.1:3001')

db:
    docker compose up --detach --wait db

seed:
    cargo run --locked --package unicourse-ingest -- fixtures/ntnu-115-1.json fixtures/nycu-115-1.json fixtures/nthu-115-1.json fixtures/nthu-114-2.json
    cargo run --locked --package unicourse-ingest -- --external-reviews fixtures/external-reviews

dev: db seed
    bash scripts/dev.sh

codegen:
    bash scripts/codegen.sh

check: check-deploy
    cargo fmt --all --check
    cargo clippy --locked --workspace --all-targets -- -D warnings
    cargo test --locked --workspace
    bash scripts/codegen.sh --check
    corepack pnpm --filter @unicourse/web check
    just check-crawlers
    corepack pnpm --filter @unicourse/web build
    just test-e2e

test-e2e: seed
    cargo build --locked --package unicourse-api
    corepack pnpm --filter @unicourse/web test

check-crawlers:
    corepack pnpm --filter './crawlers/*' check
    corepack pnpm --filter './crawlers/*' test

check-deploy:
    python3 -I -m unittest discover -s deploy/tests

crawl *ARGS:
    bash scripts/crawl-all.sh {{ARGS}}

# National platform for every school without its own crawler, e.g. `just crawl-tvc --term 115-1,114-2`.
crawl-tvc *ARGS:
    corepack pnpm --silent --filter @unicourse/crawler-tvc crawl -- --out-dir "$PWD/snapshots/tvc" {{ARGS}}
