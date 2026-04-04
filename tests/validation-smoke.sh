#!/usr/bin/env bash
set -euo pipefail

BASE="http://127.0.0.1:3001"

printf '\n== invalid issue create ==\n'
curl -sS -X POST "$BASE/api/v1/issues" -H 'Content-Type: application/json' --data '{"title":"Missing team"}' | tee /tmp/linear-invalid-issue.json
node - <<'NODE'
const fs = require('fs');
const obj = JSON.parse(fs.readFileSync('/tmp/linear-invalid-issue.json', 'utf8'));
if (obj.ok !== false) process.exit(1);
if (!String(obj.error || '').includes('teamId')) process.exit(2);
console.log('validation issue create check passed');
NODE

printf '\n== invalid comment add ==\n'
curl -sS -X POST "$BASE/api/v1/issues/test/comments" -H 'Content-Type: application/json' --data '{}' | tee /tmp/linear-invalid-comment.json
node - <<'NODE'
const fs = require('fs');
const obj = JSON.parse(fs.readFileSync('/tmp/linear-invalid-comment.json', 'utf8'));
if (obj.ok !== false) process.exit(1);
if (!String(obj.error || '').includes('body')) process.exit(2);
console.log('validation comment check passed');
NODE
