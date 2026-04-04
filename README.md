# OpenClaw Linear Agent

OpenClaw Linear Agent is a bridge + CLI for working with Linear through an OpenClaw-managed app installation.

It has two jobs:

1. **Bridge/server**: receives Linear webhooks, owns the Linear OAuth installation, refreshes Linear tokens, and calls Linear GraphQL as the installed app.
2. **CLI**: gives humans and agents a command-line interface for reading and updating Linear resources through the bridge.

This project is designed so the default CLI workflow does **not** need to own raw Linear OAuth refresh tokens locally.

## Current capabilities

### Bridge

- `GET /health`
- `GET /api/v1/auth/status`
- `GET /api/v1/teams`
- `GET /api/v1/users`
- `GET /api/v1/issues/:identifier`
- `POST /api/v1/issues`
- `PATCH /api/v1/issues/:id`
- `GET /api/v1/issues/:id/comments`
- `POST /api/v1/issues/:id/comments`
- `PATCH /api/v1/comments/:id`
- `GET /api/v1/projects`
- `POST /api/v1/projects`
- `PATCH /api/v1/projects/:id`
- `GET /api/v1/projects/:id/milestones`
- `POST /api/v1/projects/:id/milestones`
- `PATCH /api/v1/milestones/:id`
- `POST /api/v1/relations`
- `DELETE /api/v1/relations/:id`
- `PATCH /api/v1/issues/:id/milestone`
- Linear webhook handling via `POST /webhooks/linear`
- Linear OAuth install/callback flow
- canonical token storage + refresh

### CLI

Current command surface:

```bash
linear auth status --json

linear team list --json
linear user list [--query <text>] --json
linear project list --json

linear issue get <identifier> --json
linear issue create --team NOT --project "Operations" --title "..." --assignee-email you@example.com --state "Todo" --due-date 2026-04-30 --json
linear issue update <issue-id> --assignee-email you@example.com --team NOT --state "In Progress" --json
linear issue status list --team NOT --json
linear issue milestone <issue-id|identifier> --milestone-id <id> --json

linear comment list --issue <issue-id> --json
linear comment add --issue <issue-id> --body "..." --json
linear comment update <comment-id> --body "..." --json

linear project create --name "CLI Project Smoke Test" --team NOT --lead-email you@example.com --start-date 2026-04-03 --target-date 2026-04-30 --json
linear project update <project-id|project-name> --target-date 2026-05-05 --json
linear project issues --project-name "Operations" --state "Todo" --team NOT --due-date-to 2026-04-30 --json

linear milestone list --project "Operations" --json
linear milestone create --project "CLI Project Smoke Test" --name "Phase 1" --target-date 2026-04-15 --json
linear milestone update <milestone-id> --target-date 2026-04-18 --json

linear relation add --issue-id NOT-99 --related-issue-id NOT-80 --type related --json
linear relation remove <relation-id> --json
```

## Architecture

### Default auth model

- CLI authenticates to the bridge/OpenClaw runtime
- bridge/OpenClaw authenticates to Linear
- bridge owns Linear OAuth installation and token refresh lifecycle
- CLI does not use the bridge token store as a public contract

### Internal token storage

The current bridge implementation stores rotating Linear app credentials in:

- `~/.openclaw/state/linear-agent-bridge/tokens.json`

This is an internal bridge implementation detail, not a public CLI auth contract.

## Quick start

```bash
npm install
npm run build
npm run check
npm link
```

That installs the local CLI as the `linear` command from this repo.

Start the bridge in development:

```bash
npm run dev
```

Or in production/systemd-managed mode:

```bash
scripts/run-bridge-prod.sh
```

## API authentication model

All privileged bridge routes under `/api/v1/*` require a shared secret header:

```http
x-api-key: <LINEAR_API_SECRET>
```

This shared secret authenticates access to the bridge API. It does **not** identify a specific human caller by itself. Linear comments, issues, projects, and other write actions are still performed using the Linear OAuth identity currently installed in the bridge.

Public/unauthenticated route:

- `GET /health`

Protected routes:

- all `GET/POST/PATCH/DELETE` endpoints under `/api/v1/*`

If `LINEAR_API_SECRET` is missing at runtime, the bridge returns `503` for `/api/v1/*` routes. If the header is missing or wrong, it returns `401`.

## Required configuration

This project assumes you already have OpenClaw installed locally or on a server and that the `openclaw` CLI is available.

### Private bridge env vars

Set these in your private OpenClaw env file:

- `~/.openclaw/.env`

The CLI now auto-loads environment variables in this order:

1. local process environment
2. project-local `.env` if present
3. `~/.openclaw/.env`

That means a person or agent can usually run `linear ...` directly without manually sourcing env first, as long as the required bridge variables live in `~/.openclaw/.env`.

Recommended variables:

```bash
LINEAR_BRIDGE_PORT=3001

LINEAR_APP_BASE_URL=https://your-bridge.example.com
LINEAR_REDIRECT_URI=https://your-bridge.example.com/auth/linear/callback
LINEAR_CLIENT_ID=...
LINEAR_CLIENT_SECRET=...
LINEAR_WEBHOOK_SECRET=generate-a-random-secret
LINEAR_OAUTH_SCOPES=read,write,app:mentionable,app:assignable
LINEAR_STATE_SECRET=generate-a-random-secret
LINEAR_API_SECRET=generate-a-long-random-secret
LINEAR_TOKEN_STORE_PATH=$HOME/.openclaw/state/linear-agent-bridge/tokens.json

OPENCLAW_LINEAR_AGENT_ID=project-manager
ALLOW_AUTO_RUN=false
```

You may also need these in environments where the bridge talks to OpenClaw through an authenticated gateway:

```bash
OPENCLAW_GATEWAY_URL=...
OPENCLAW_GATEWAY_TOKEN=...
```

### Where each value comes from

- `LINEAR_CLIENT_ID` / `LINEAR_CLIENT_SECRET`: from your Linear OAuth app.
- `LINEAR_APP_BASE_URL`: the public base URL where Linear can reach your bridge.
- `LINEAR_REDIRECT_URI`: the exact callback URL registered in the Linear OAuth app.
- `LINEAR_WEBHOOK_SECRET`: a random secret you generate and also configure in Linear webhook settings.
- `LINEAR_STATE_SECRET`: a random secret you generate for OAuth state validation.
- `LINEAR_API_SECRET`: a long random shared secret required by all `/api/v1/*` bridge clients via the `x-api-key` header.
- `LINEAR_TOKEN_STORE_PATH`: private writable path for rotating Linear OAuth credentials.
- `OPENCLAW_LINEAR_AGENT_ID`: the OpenClaw agent that should handle Linear-triggered work.
- `ALLOW_AUTO_RUN`: use `false` during setup, then turn on when verified.

### What stays private at runtime

Do **not** put rotating Linear access or refresh tokens in `.env`.
Those are written by the bridge to the private token store at:

- `LINEAR_TOKEN_STORE_PATH`

## Validation and checks

Build + typecheck:

```bash
npm run build
npm run check
```

Token/Linear auth health:

```bash
npm run linear:health
```

Bridge + CLI smoke tests:

```bash
npm run test:smoke
LINEAR_API_SECRET=your-shared-secret npm run test:api-smoke
npm run test:auth-status
npm run test:validation-smoke
```

Example direct API call:

```bash
curl -H "x-api-key: $LINEAR_API_SECRET" http://127.0.0.1:3001/api/v1/auth/status
```

Example CLI usage after `npm link`:

```bash
linear auth status --json
linear project list --json
linear comment add --issue NOT-432 --body "hello from the linked CLI" --json
```

Because the CLI auto-loads `~/.openclaw/.env`, you do not need a duplicate repo `.env` just to use the command in a standard OpenClaw setup.

The main smoke path no longer depends on MCP tooling. The bridge and CLI validate independently.

## Security and privacy

This project is meant to be publishable as open source, so deployment hygiene matters.

### Do not commit or publish

- `.env` files
- OAuth tokens
- refresh tokens
- webhook secrets
- `data/` captures
- logs containing issue bodies, comments, internal URLs, emails, or model output

### Recommended checks before pushing code

Run:

```bash
git status --short
npm run build
npm run check
npm run test:auth-status
LINEAR_API_SECRET=your-shared-secret npm run test:api-smoke
npm run test:validation-smoke
```

Review diffs for accidental secrets:

```bash
git diff -- . ':(exclude)package-lock.json'
```

If you have ever stored secrets locally in tracked files, also grep for common leak patterns before publishing:

```bash
git grep -nE '(LINEAR_CLIENT_SECRET|LINEAR_WEBHOOK_SECRET|LINEAR_STATE_SECRET|access_token|refresh_token|Bearer )' -- .
```

### Current privacy posture

- bridge secrets live in env, not committed config
- rotating Linear credentials live in a private state path
- CLI defaults to bridge-backed auth rather than local Linear token ownership
- validation rejects malformed requests early before they become confusing downstream errors

## Known limitations

- milestone assignment currently relies on Linear enforcing project compatibility; preflight project-match checks could be improved
- milestone resolution is by id today, not milestone name
- some mutation routes would benefit from additional contract tests and mocked GraphQL tests
- direct standalone CLI auth to Linear is not the default mode and is not implemented as the primary path

## Repo direction

This project is moving from “bridge prototype” toward a real open-source bridge + CLI product.

See:

- `docs/ARCHITECTURE.md`
- `docs/CLI-PRD.md`
