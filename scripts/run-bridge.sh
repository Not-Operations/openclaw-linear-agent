#!/usr/bin/env bash
set -euo pipefail
export PATH="/home/kenny/.npm-global/bin:$PATH"
cd /home/kenny/linear-agent-bridge
set -a
source /home/kenny/.config/openclaw-env
set +a
exec npm run dev
