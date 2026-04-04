import { linearGraphQL } from '../linear-graphql.js';

export async function createIssueRelation(input: {
  issueId: string;
  relatedIssueId: string;
  type: 'blocks' | 'related';
}) {
  const data = await linearGraphQL<{ issueRelationCreate: { success: boolean; issueRelation: any } }>(
    `mutation IssueRelationCreate($input: IssueRelationCreateInput!) {
      issueRelationCreate(input: $input) {
        success
        issueRelation {
          id
          type
        }
      }
    }`,
    { input }
  );
  return data.issueRelationCreate;
}

export async function deleteIssueRelation(id: string) {
  const data = await linearGraphQL<{ issueRelationDelete: { success: boolean } }>(
    `mutation IssueRelationDelete($id: String!) {
      issueRelationDelete(id: $id) {
        success
      }
    }`,
    { id }
  );
  return data.issueRelationDelete;
}
