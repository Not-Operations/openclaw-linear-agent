import { getValidLinearTokens, refreshStoredTokens } from './linear-token.js';

async function runGraphQLRequest(query: string, variables: Record<string, unknown>, accessToken: string) {
  const res = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ query, variables })
  });

  const text = await res.text();
  return { res, text };
}

function isAuthFailure(status: number, text: string) {
  if (status === 401) return true;
  return /AUTHENTICATION_ERROR|Authentication required|not authenticated/i.test(text);
}

export async function linearGraphQL<T = any>(query: string, variables: Record<string, unknown> = {}) {
  let { tokens } = await getValidLinearTokens();

  let { res, text } = await runGraphQLRequest(query, variables, tokens.accessToken);

  if (isAuthFailure(res.status, text) && tokens.refreshToken) {
    tokens = await refreshStoredTokens(tokens.refreshToken);
    ({ res, text } = await runGraphQLRequest(query, variables, tokens.accessToken));
  }

  if (!res.ok) {
    throw new Error(`Linear GraphQL HTTP ${res.status}: ${text}`);
  }

  const json = JSON.parse(text);
  if (json.errors?.length) {
    throw new Error(`Linear GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  return json.data as T;
}
