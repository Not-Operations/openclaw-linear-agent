#!/usr/bin/env bash
set -euo pipefail
/usr/bin/tailscale funnel reset || true
exec /usr/bin/tailscale funnel 3001
