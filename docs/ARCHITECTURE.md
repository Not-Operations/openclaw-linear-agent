# OpenClaw Linear Bridge + CLI Architecture

## Goal

Build an open-source project that provides:

1. A **bridge/server** that owns Linear OAuth installation, token refresh, webhook handling, and Linear GraphQL access.
2. A **CLI** that talks to the bridge/server for Linear operations.
3. A shared contract so humans, agents, and automation all use the same safe path.

## Design Principles

- OpenClaw-backed by default
- Linear rotating credentials remain server-side
- CLI stores only bridge/OpenClaw auth/session information
- Non-interactive first
- Human-readable + machine-readable output
- Strong validation, deterministic tests, and explicit errors
- Open-source safe: no hidden dependence on private local token paths inside the client

## Product Shape

### Bridge/server responsibilities

- Receive Linear webhooks
- Support Linear OAuth install/callback
- Store and refresh Linear access/refresh tokens
- Map workspace installation metadata
- Call Linear GraphQL as the app identity
- Expose a stable local/remote API for Linear resource operations
- Preserve per-issue conversation continuity for OpenClaw agent sessions

### CLI responsibilities

- Authenticate to bridge/OpenClaw
- Provide resource-oriented commands (`auth`, `issue`, `comment`, `project`, `team`, `user`)
- Support `--json`, `--stdin`, and `--*-file`
- Never own the primary Linear refresh lifecycle in default mode

## Default Auth Model

### CLI -> Bridge/OpenClaw

The CLI authenticates to the bridge/OpenClaw runtime using a bridge/OpenClaw-issued credential or session.

### Bridge/OpenClaw -> Linear

The bridge owns:
- Linear OAuth client config
- access token
- refresh token
- granted scopes
- workspace identity
- app actor identity
- token refresh lifecycle

## Internal Storage

The current internal canonical token store is:

- `~/.openclaw/state/linear-agent-bridge/tokens.json`

This is an implementation detail of the bridge/server, not a public CLI contract.

## Server API Direction (V1)

Use a narrow JSON API exposed by the bridge. Candidate endpoints:

- `GET /health`
- `GET /api/v1/auth/status`
- `GET /api/v1/issues/:identifier`
- `PATCH /api/v1/issues/:identifier`
- `GET /api/v1/issues/:identifier/comments`
- `POST /api/v1/issues/:identifier/comments`
- `PATCH /api/v1/comments/:id`
- `GET /api/v1/teams`
- `GET /api/v1/teams/:teamKey/statuses`
- `GET /api/v1/users`
- `GET /api/v1/projects`
- `POST /api/v1/projects`
- `PATCH /api/v1/projects/:id`

## Shared Modules

Recommended shared modules:

- `src/linear-token.ts` — token load/probe/refresh/save
- `src/linear-graphql.ts` — normalized GraphQL request layer
- `src/operations/*` — issue/comment/project/team/user operations
- `src/api/*` — HTTP handlers and request validation
- `src/contracts/*` — request/response schemas
- `src/cli/*` — CLI commands and output formatting

## Testing Strategy

### Unit tests

- token probe/refresh decision logic
- atomic token writes
- request validation and response normalization
- CLI flag parsing and JSON output structure

### Integration tests

- bridge health endpoint
- auth status endpoint
- mocked Linear GraphQL interactions
- CLI -> bridge request flow

### Live validation scripts

- `npm run linear:health`
- bridge startup validation
- optional live GraphQL smoke tests behind explicit env gates

## Open Source Safety Requirements

- Do not require client-side access to Linear refresh tokens in default mode
- Do not depend on a private local token path as part of the CLI contract
- Keep bridge secrets and token lifecycle server-side
- Document direct auth mode, if ever added, as a separate non-default path

## V1 Roadmap

1. Stabilize bridge auth + token lifecycle
2. Add shared GraphQL wrapper and operations layer
3. Add bridge JSON API for read/write operations
4. Add CLI that calls bridge API
5. Add unit/integration test suites
6. Add clear open-source setup docs
