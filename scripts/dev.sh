#!/usr/bin/env bash
set -euo pipefail

cargo build --locked --package unicourse-api
./target/debug/unicourse-api &
api_pid=$!
corepack pnpm --filter @unicourse/web dev --host 127.0.0.1 --port 5173 --strictPort &
web_pid=$!

cleanup() {
  kill "$api_pid" "$web_pid" 2>/dev/null || true
  wait "$api_pid" "$web_pid" 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
wait -n "$api_pid" "$web_pid"
