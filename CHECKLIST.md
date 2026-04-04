# Release / deploy checklist

## Required bridge env vars

Set these in `~/.openclaw/.env` or your private deployment environment:

- `LINEAR_BRIDGE_PORT`
- `LINEAR_APP_BASE_URL`
- `LINEAR_REDIRECT_URI`
- `LINEAR_CLIENT_ID`
- `LINEAR_CLIENT_SECRET`
- `LINEAR_WEBHOOK_SECRET`
- `LINEAR_OAUTH_SCOPES`
- `LINEAR_STATE_SECRET`
- `LINEAR_TOKEN_STORE_PATH`
- `OPENCLAW_LINEAR_AGENT_ID`
- `ALLOW_AUTO_RUN`

## Required operator steps

- Confirm OpenClaw is already installed and the `openclaw` CLI is available locally or on the target server.
- Create a Linear OAuth app and copy the client id/secret.
- Generate `LINEAR_WEBHOOK_SECRET` and `LINEAR_STATE_SECRET` as random secrets.
- Set `LINEAR_APP_BASE_URL` and `LINEAR_REDIRECT_URI` to your real reachable bridge URLs.
- Ensure `LINEAR_TOKEN_STORE_PATH` points at a private writable path.
- Start the bridge and complete `/auth/linear/start`.
- Verify with `npm run linear:health` and `linear auth status --json`.

## Pre-push safety checks

- `npm run build`
- `npm run check`
- `npm run test:auth-status`
- `npm run test:api-smoke`
- `npm run test:validation-smoke`
- `git grep -nE '(LINEAR_CLIENT_SECRET|LINEAR_WEBHOOK_SECRET|LINEAR_STATE_SECRET|access_token|refresh_token|Bearer )' -- .`

## Security notes

- Do not commit `.env` files, token stores, or `data/` captures.
- The bridge binds to localhost by default; do not expose it publicly without additional access controls.
- The token store is private runtime state, not public repo config.
