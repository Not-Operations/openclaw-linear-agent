#!/usr/bin/env bash
set -euo pipefail

HOME_DIR="${HOME:-$(getent passwd "$(id -u)" | cut -d: -f6)}"
BRIDGE_DIR="${LINEAR_BRIDGE_DIR:-$HOME_DIR/linear-agent-bridge}"
GLOBAL_ENV="${OPENCLAW_ENV_FILE:-$HOME_DIR/.openclaw/.env}"
export PATH="$HOME_DIR/.npm-global/bin:$PATH"

cd "$BRIDGE_DIR"
if [[ -f "$GLOBAL_ENV" ]]; then
  set -a
  source "$GLOBAL_ENV"
  set +a
fi
exec npm start
