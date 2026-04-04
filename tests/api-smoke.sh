#!/usr/bin/env bash
set -euo pipefail

BASE="${LINEAR_BRIDGE_BASE_URL:-http://127.0.0.1:3001}"
API_KEY="${LINEAR_API_SECRET:-${LINEAR_BRIDGE_API_KEY:-}}"

api_curl() {
  if [[ -n "$API_KEY" ]]; then
    curl -fsS -H "x-api-key: $API_KEY" "$@"
  else
    curl -fsS "$@"
  fi
}

printf '\n== auth status ==\n'
api_curl "$BASE/api/v1/auth/status"

printf '\n\n== health ==\n'
curl -fsS "$BASE/health"

printf '\n\n== cli auth status ==\n'
LINEAR_BRIDGE_BASE_URL="$BASE" LINEAR_API_SECRET="$API_KEY" LINEAR_BRIDGE_API_KEY="$API_KEY" node dist/cli/linear.js auth status --json

printf '\n'
