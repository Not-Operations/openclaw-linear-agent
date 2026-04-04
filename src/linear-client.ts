import { linearGraphQL } from './linear-graphql.js';

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
