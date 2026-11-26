#!/usr/bin/env bash
set -euo pipefail

output=$(mktemp -d)
trap 'unlink "$output/openapi.json" 2>/dev/null || true; unlink "$output/schema.ts" 2>/dev/null || true; rmdir "$output"' EXIT

cargo run --quiet --locked --package unicourse-api --bin export-openapi > "$output/openapi.json"
corepack pnpm exec openapi-typescript "$output/openapi.json" -o "$output/schema.ts"

if [[ ${1:-} == --check ]]; then
  diff -u openapi.json "$output/openapi.json"
  diff -u packages/api-client/src/schema.ts "$output/schema.ts"
else
  cp "$output/openapi.json" openapi.json
  cp "$output/schema.ts" packages/api-client/src/schema.ts
fi
