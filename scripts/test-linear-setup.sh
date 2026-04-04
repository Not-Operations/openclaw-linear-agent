#!/usr/bin/env bash
set -euo pipefail

HOME_DIR="${HOME:-$(getent passwd "$(id -u)" | cut -d: -f6)}"
BRIDGE_DIR="${LINEAR_BRIDGE_DIR:-$HOME_DIR/linear-agent-bridge}"
TOKEN_STORE="${LINEAR_TOKEN_STORE_PATH:-$HOME_DIR/.openclaw/state/linear-agent-bridge/tokens.json}"

printf '\n== 1. typecheck ==\n'
cd "$BRIDGE_DIR"
npm run check

printf '\n== 2. bridge token health ==\n'
LINEAR_TOKEN_STORE_PATH="$TOKEN_STORE" npm run --silent linear:health

printf '\n== 3. direct bridge health endpoint ==\n'
curl -fsS http://127.0.0.1:3001/health

printf '\n== 4. CLI auth status ==\n'
LINEAR_BRIDGE_BASE_URL="http://127.0.0.1:3001" node dist/cli/linear.js auth status --json

printf '\nAll Linear bridge + CLI validation checks passed.\n'
