# Remaining env vars + user inputs

## Required secrets / config

- `LINEAR_WEBHOOK_SECRET`
- `LINEAR_API_KEY`

## Required user decisions

- Final OpenClaw agent id to use (default scaffold: `linear-bridge`)
- Dedicated agent workspace location
- Which Linear team(s) should trigger the bridge
- Which event types should trigger an agent run
  - issue created?
  - issue updated?
  - comment created?
  - status changed?
- Whether the bridge should ever auto-post comments back to Linear
- If auto-posting is enabled, which actor identity should be used
- Loop prevention rule
  - ignore comments authored by the bridge actor?
  - require a command prefix like `@agent` or `/ai`?
- Expected response style
  - terse triage
  - implementation plan
  - customer-ready explanation
  - ask clarifying questions only

## Strongly recommended

- Confirm webhook public URL / tunnel / reverse proxy
- Confirm local service manager
  - systemd user service?
  - pm2?
  - docker compose?
- Confirm whether bridge data can live in `./data` or should move to a fixed host path
- Confirm whether OpenClaw agent model should remain default `openai-codex/gpt-5.4`

## Optional future enhancements

- Implement GraphQL comment posting to Linear
- Add per-issue event deduplication by webhook delivery id
- Add command parsing from issue comments
- Add richer prompt templates by issue label/state/team
- Add audit logs and redaction for webhook payload snapshots
