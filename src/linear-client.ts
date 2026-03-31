import { refreshAccessToken } from './linear.js';
import { loadLinearTokens, saveLinearTokens } from './store.js';

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

async function getValidAccessToken() {
  const tokens = await loadLinearTokens();
  if (!tokens?.accessToken) {
    throw new Error('No stored Linear access token');
  }
  return tokens;
}

async function refreshStoredTokens(refreshToken: string) {
  const current = await loadLinearTokens();
  const refreshed = await refreshAccessToken(refreshToken);
  const next = {
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token || refreshToken,
    workspaceId: current?.workspaceId,
    appUserId: current?.appUserId,
    updatedAt: new Date().toISOString()
  };

  await saveLinearTokens(next);
  return next;
}

async function linearGraphQL<T = any>(query: string, variables: Record<string, unknown>) {
  let tokens = await getValidAccessToken();

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
    if (tokens.refreshToken && isAuthFailure(res.status, text)) {
      tokens = await refreshStoredTokens(tokens.refreshToken);
      const retry = await runGraphQLRequest(query, variables, tokens.accessToken);
      if (!retry.res.ok) {
        throw new Error(`Linear GraphQL HTTP ${retry.res.status}: ${retry.text}`);
      }
      const retryJson = JSON.parse(retry.text);
      if (retryJson.errors?.length) {
        throw new Error(`Linear GraphQL errors: ${JSON.stringify(retryJson.errors)}`);
      }
      return retryJson.data as T;
    }
    throw new Error(`Linear GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  return json.data as T;
}

function agentActivityMutation(input: Record<string, unknown>) {
  return linearGraphQL(
    `mutation AgentActivityCreate($input: AgentActivityCreateInput!) {
      agentActivityCreate(input: $input) {
        success
        agentActivity { id }
      }
    }`,
    { input }
  );
}

export async function createThoughtActivity(agentSessionId: string, body: string, ephemeral = true) {
  return agentActivityMutation({
    agentSessionId,
    ephemeral,
    content: {
      type: 'thought',
      body
    }
  });
}

export async function createActionActivity(agentSessionId: string, body: string, ephemeral = false) {
  return agentActivityMutation({
    agentSessionId,
    ephemeral,
    content: {
      type: 'action',
      action: 'working',
      parameter: body
    }
  });
}

export async function createResponseActivity(agentSessionId: string, body: string) {
  return agentActivityMutation({
    agentSessionId,
    content: {
      type: 'response',
      body
    }
  });
}

export async function createErrorActivity(agentSessionId: string, body: string) {
  return agentActivityMutation({
    agentSessionId,
    content: {
      type: 'error',
      body
    }
  });
}
