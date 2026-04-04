import { linearGraphQL } from '../linear-graphql.js';

export async function listProjects() {
  const data = await linearGraphQL<{ projects: { nodes: any[] } }>(
    `query Projects {
      projects {
        nodes {
          id
          name
          slugId
          url
          state
          progress
          startDate
          targetDate
          lead { id name email }
          teams { nodes { id key name } }
        }
      }
    }`
  );
  return data.projects?.nodes ?? [];
}

export async function createProject(input: {
  name: string;
  teamIds?: string[];
  leadId?: string;
  startDate?: string;
  targetDate?: string;
  description?: string;
}) {
  const data = await linearGraphQL<{ projectCreate: { success: boolean; project: any } }>(
    `mutation ProjectCreate($input: ProjectCreateInput!) {
      projectCreate(input: $input) {
        success
        project {
          id
          name
          slugId
          url
          startDate
          targetDate
        }
      }
    }`,
    { input }
  );
  return data.projectCreate;
}

export async function updateProject(id: string, input: {
  name?: string;
  leadId?: string;
  startDate?: string;
  targetDate?: string;
  description?: string;
}) {
  const data = await linearGraphQL<{ projectUpdate: { success: boolean; project: any } }>(
    `mutation ProjectUpdate($id: String!, $input: ProjectUpdateInput!) {
      projectUpdate(id: $id, input: $input) {
        success
        project {
          id
          name
          slugId
          url
          startDate
          targetDate
        }
      }
    }`,
    { id, input }
  );
  return data.projectUpdate;
}

export async function listProjectIssues(input: {
  projectId?: string;
  projectName?: string;
  stateName?: string;
  assigneeId?: string;
  teamKey?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
}) {
  if (!input.projectId && !input.projectName) {
    throw new Error('projectId or projectName is required');
  }

  const variableDefs: string[] = [];
  const filters: string[] = [];
  const variables: Record<string, unknown> = {};

  if (input.projectId) {
    variableDefs.push('$projectId: ID!');
    filters.push('project: { id: { eq: $projectId } }');
    variables.projectId = input.projectId;
  } else if (input.projectName) {
    variableDefs.push('$projectName: String!');
    filters.push('project: { name: { eq: $projectName } }');
    variables.projectName = input.projectName;
  }

  if (input.stateName) {
    variableDefs.push('$stateName: String!');
    filters.push('state: { name: { eq: $stateName } }');
    variables.stateName = input.stateName;
  }

  if (input.assigneeId) {
    variableDefs.push('$assigneeId: String!');
    filters.push('assignee: { id: { eq: $assigneeId } }');
    variables.assigneeId = input.assigneeId;
  }

  if (input.teamKey) {
    variableDefs.push('$teamKey: String!');
    filters.push('team: { key: { eq: $teamKey } }');
    variables.teamKey = input.teamKey;
  }

  if (input.dueDateFrom) {
    variableDefs.push('$dueDateFrom: TimelessDateOrDuration!');
    filters.push('dueDate: { gte: $dueDateFrom }');
    variables.dueDateFrom = input.dueDateFrom;
  }

  if (input.dueDateTo) {
    variableDefs.push('$dueDateTo: TimelessDateOrDuration!');
    filters.push('dueDate: { lte: $dueDateTo }');
    variables.dueDateTo = input.dueDateTo;
  }

  const query = `query ProjectIssues(${variableDefs.join(', ')}) {
    issues(filter: { and: [${filters.map((f) => `{ ${f} }`).join(', ')}] }) {
      nodes {
        id
        identifier
        title
        dueDate
        url
        priority
        state { id name type }
        assignee { id name email }
        project { id name }
        team { id key name }
      }
    }
  }`;

  const data = await linearGraphQL<{ issues: { nodes: any[] } }>(query, variables);
  return data.issues?.nodes ?? [];
}
