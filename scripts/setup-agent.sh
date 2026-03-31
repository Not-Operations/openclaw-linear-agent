#!/usr/bin/env bash
set -euo pipefail

AGENT_ID="${1:-linear-bridge}"
WORKSPACE_DIR="${2:-$(pwd)/agent-workspace}"

mkdir -p "$WORKSPACE_DIR"

openclaw agents add "$AGENT_ID" \
  --workspace "$WORKSPACE_DIR" \
  --non-interactive

echo
printf 'Created agent %s with workspace %s\n' "$AGENT_ID" "$WORKSPACE_DIR"
printf 'Next: customize %s/IDENTITY.md, AGENTS.md, and any bridge-specific instructions.\n' "$WORKSPACE_DIR"
