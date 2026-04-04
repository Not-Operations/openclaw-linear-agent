import { linearGraphQL } from '../linear-graphql.js';

export async function getIssue(identifier: string) {
  const data = await linearGraphQL<{ issue: any }>(
    `query IssueById($id: String!) {
      issue(id: $id) {
        id
        identifier
        title
        description
        dueDate
        url
        state { id name type }
        assignee { id name email }
        team { id key name }
        project { id name }
        labels { nodes { id name } }
        comments(orderBy: updatedAt) {
          nodes {
            id
            body
            createdAt
            updatedAt
            user { id name displayName }
          }
        }
        relations {
          nodes {
            id
            type
            relatedIssue { id identifier title }
          }
        }
      }
    }`,
    { id: identifier }
  );
  return data.issue;
}

export async function createIssue(input: {
  teamId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  dueDate?: string;
  projectId?: string;
  stateId?: string;
}) {
  const data = await linearGraphQL<{ issueCreate: { success: boolean; issue: any } }>(
    `mutation IssueCreate($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue { id identifier title url }
      }
    }`,
    { input }
  );
  return data.issueCreate;
}

export async function updateIssue(id: string, input: Record<string, unknown>) {
  const data = await linearGraphQL<{ issueUpdate: { success: boolean; issue: any } }>(
    `mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) {
      issueUpdate(id: $id, input: $input) {
        success
        issue {
          id
          identifier
          title
          description
          dueDate
          url
          state { id name type }
          assignee { id name email }
        }
      }
    }`,
    { id, input }
  );
  return data.issueUpdate;
}

export async function listTeamStates(teamKey: string) {
  const data = await linearGraphQL<{ teams: { nodes: any[] } }>(
    `query TeamStates($key: String!) {
      teams(filter: { key: { eq: $key } }) {
        nodes {
          id
          key
          name
          states {
            nodes {
              id
              name
              type
              position
            }
          }
        }
      }
    }`,
    { key: teamKey }
  );
  return data.teams.nodes?.[0] ?? null;
}
