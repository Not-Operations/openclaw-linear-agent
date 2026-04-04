import { getValidLinearTokens } from './linear-token.js';

async function main() {
  const result = await getValidLinearTokens();
  console.log(JSON.stringify({
    ok: true,
    source: result.source,
    updatedAt: result.tokens.updatedAt,
    viewer: result.viewer.viewer,
    organization: result.viewer.organization
  }, null, 2));
}

main().catch((error: any) => {
  console.error(JSON.stringify({ ok: false, error: error?.message ?? String(error) }, null, 2));
  process.exit(1);
});
