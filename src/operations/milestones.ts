import { linearGraphQL } from '../linear-graphql.js';

export async function listProjectMilestones(projectId: string) {
  const data = await linearGraphQL<{ project: { projectMilestones: { nodes: any[] } } }>(
    `query ProjectMilestones($id: String!) {
      project(id: $id) {
        projectMilestones {
          nodes {
            id
            name
            description
            targetDate
            sortOrder
          }
        }
      }
    }`,
    { id: projectId }
  );
  return data.project?.projectMilestones?.nodes ?? [];
}

export async function createProjectMilestone(input: {
  projectId: string;
  name: string;
  description?: string;
  targetDate?: string;
}) {
  const data = await linearGraphQL<{ projectMilestoneCreate: { success: boolean; projectMilestone: any } }>(
    `mutation ProjectMilestoneCreate($input: ProjectMilestoneCreateInput!) {
      projectMilestoneCreate(input: $input) {
        success
        projectMilestone {
          id
          name
          description
          targetDate
        }
      }
    }`,
    { input }
  );
  return data.projectMilestoneCreate;
}

export async function updateProjectMilestone(id: string, input: {
  name?: string;
  description?: string;
  targetDate?: string;
}) {
  const data = await linearGraphQL<{ projectMilestoneUpdate: { success: boolean; projectMilestone: any } }>(
    `mutation ProjectMilestoneUpdate($id: String!, $input: ProjectMilestoneUpdateInput!) {
      projectMilestoneUpdate(id: $id, input: $input) {
        success
        projectMilestone {
          id
          name
          description
          targetDate
        }
      }
    }`,
    { id, input }
  );
  return data.projectMilestoneUpdate;
}
