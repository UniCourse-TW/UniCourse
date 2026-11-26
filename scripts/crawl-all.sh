#!/usr/bin/env bash
# Runs every school crawler for one term; keeps going when one school fails.
# Usage: scripts/crawl-all.sh [--term 115-1] [--limit N]   (env SNAPSHOT_DIR, default ./snapshots)
set -uo pipefail
cd "$(dirname "$0")/.."
out="${SNAPSHOT_DIR:-snapshots}"
for arg in "$@"; do
  # A limited run is a partial list and would deactivate every other offering once imported.
  [[ $arg == --limit* ]] && { echo "crawl-all: --limit is not allowed here; run a single crawler with --out instead" >&2; exit 2; }
done
mkdir -p "$out"
# CRAWL_SKIP lists slugs to leave out. Defaults: ncu = robots.txt disallows; ntua = only a labelled
# extension-education subset is public; ncku = the site demands a CAPTCHA after ~5 departments.
# ncu and ncku come from the national platform instead (crawlers/tvc, `source: "tvc"` in status.json).
skip=" ${CRAWL_SKIP-ncu ntua ncku} "
schools=()
for dir in crawlers/*/; do
  slug=$(basename "$dir")
  # kit is the shared library; tvc (national platform, many schools) has its own job: just crawl-tvc.
  [[ $slug == kit || $slug == tvc ]] && continue
  [[ $skip == *" $slug "* ]] && { echo "== $slug skipped (CRAWL_SKIP)"; continue; }
  [[ -f $dir/src/crawler.ts ]] || continue
  schools+=("$slug")
done
failed=()
for slug in "${schools[@]}"; do
  echo "== $slug $(date -Is)"
  if ! corepack pnpm --silent --filter "@unicourse/crawler-$slug" crawl -- --out "$out/$slug.json" "$@"; then
    failed+=("$slug")
    rm -f "$out/$slug.json"
  fi
done
echo "== done $(date -Is): ${#schools[@]} crawlers, ${#failed[@]} failed${failed:+: ${failed[*]}}"
[[ ${#failed[@]} -eq 0 ]]
