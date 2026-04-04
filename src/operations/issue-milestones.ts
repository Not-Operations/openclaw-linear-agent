import { linearGraphQL } from '../linear-graphql.js';

export async function assignIssueToMilestone(issueId: string, projectMilestoneId: string) {
  const data = await linearGraphQL<{ issueUpdate: { success: boolean; issue: any } }>(
    `mutation IssueAssignMilestone($id: String!, $input: IssueUpdateInput!) {
      issueUpdate(id: $id, input: $input) {
        success
        issue {
          id
          identifier
          title
          projectMilestone { id name }
        }
      }
    }`,
    { id: issueId, input: { projectMilestoneId } }
  );
  return data.issueUpdate;
}
