# Linear CLI PRD (OpenClaw-backed default)

## Summary

The `linear` CLI is the operator and agent client for the OpenClaw Linear bridge.

Default mode:
- CLI talks to the bridge/OpenClaw runtime
- bridge talks to Linear
- bridge owns Linear OAuth and token refresh

## Command tree (V1)

- `linear auth login`
- `linear auth status`
- `linear issue get`
- `linear issue update`
- `linear issue status list`
- `linear comment list`
- `linear comment add`
- `linear comment update`
- `linear project list`
- `linear project create`
- `linear project update`
- `linear user list`
- `linear team list`

## V1 constraints

- non-interactive first
- `--json` everywhere practical
- `--stdin` and `--*-file` support for large text input
- default auth model is bridge/OpenClaw-backed
- direct Linear mode is out of scope for V1

## V1 validations

- every command has `--help`
- every mutation returns IDs + summary + URL when available
- CLI does not read internal Linear token files in default mode
- auth failures give actionable recovery instructions
