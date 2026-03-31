# OpenClaw Linear Agent Bridge

A small Node service that receives Linear agent/webhook events, forwards selected work to an OpenClaw agent via the official CLI, and preserves per-issue conversation continuity.

## What it does

- exposes `GET /health`
- exposes `POST /webhooks/linear`
- verifies Linear webhook signatures
- builds an execution prompt from the Linear event payload
- invokes an OpenClaw agent with `openclaw agent --agent <id> --json`
- persists `{ issueId -> sessionId }` so follow-ups continue the same OpenClaw conversation
- supports Linear OAuth install/callback flows for app-based setups
- writes local debug artifacts to `data/` for development

## Why CLI invocation instead of direct gateway HTTP

This bridge intentionally uses the OpenClaw CLI rather than talking directly to the gateway's OpenAI-compatible HTTP endpoint.

Why:

- the CLI is the safest supported integration surface
- it avoids handling the gateway bearer token inside this bridge
- it keeps the bridge simpler and more portable
- it lets OpenClaw own session semantics and JSON output formatting

## Status

This project is a working bridge prototype, not a polished product. Expect to adapt prompt shaping, event filtering, persistence, and deployment details for your own environment.

## Quick start

```bash
cp .env.example .env
npm install
npm run dev
```

Create or choose an OpenClaw agent, then point the bridge at it via `.env`:

```bash
OPENCLAW_LINEAR_AGENT_ID=project-manager
```

## Recommended setup flow

1. Create a dedicated OpenClaw agent for Linear-triggered work.
2. Configure the `.env` values for your OpenClaw workspace and Linear app/webhook settings.
3. Start the bridge locally.
4. Point a Linear webhook or app callback flow at the bridge.
5. Start with `ALLOW_AUTO_RUN=false` to verify signatures and payload shape safely.
6. Turn on `ALLOW_AUTO_RUN=true` once prompts and filtering look sane.

## Environment variables

See `.env.example` for the full set. The important ones are:

- `LINEAR_BRIDGE_PORT`
- `LINEAR_APP_BASE_URL`
- `LINEAR_REDIRECT_URI`
- `LINEAR_CLIENT_ID`
- `LINEAR_CLIENT_SECRET`
- `LINEAR_WEBHOOK_SECRET`
- `LINEAR_STATE_SECRET`
- `OPENCLAW_BIN`
- `OPENCLAW_LINEAR_AGENT_ID`
- `OPENCLAW_WORKDIR`
- `ALLOW_AUTO_RUN`
- `DATA_DIR`

## Development notes

- `data/` is intentionally local-only and should not be committed. It may contain webhook payloads, session ids, and model outputs.
- `.env` should not be committed.
- `node_modules/` and runtime artifacts should stay untracked.

## Security notes

If you open-source your own deployment of this bridge, do **not** publish:

- `.env` files
- OAuth tokens
- webhook secrets
- runtime payload captures in `data/`
- any logs containing issue bodies, comments, emails, internal URLs, or model responses

## Limitations / TODOs

- outbound comment posting policy may need tightening depending on your loop-prevention strategy
- event deduplication by webhook delivery id is not implemented yet
- prompt shaping is intentionally simple and may need project-specific tuning
- deployment/service-manager setup is left to the operator
