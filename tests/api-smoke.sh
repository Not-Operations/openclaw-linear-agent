#!/usr/bin/env bash
set -euo pipefail

BASE="http://127.0.0.1:3001"

printf '\n== auth status ==\n'
curl -fsS "$BASE/api/v1/auth/status"

printf '\n\n== health ==\n'
curl -fsS "$BASE/health"

printf '\n\n== cli auth status ==\n'
LINEAR_BRIDGE_BASE_URL="$BASE" node dist/cli/linear.js auth status --json

printf '\n'
