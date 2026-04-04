import { linearGraphQL } from '../linear-graphql.js';

export async function listComments(issueId: string) {
  const data = await linearGraphQL<{ issue: { comments: { nodes: any[] } } }>(
    `query IssueComments($id: String!) {
      issue(id: $id) {
        comments(orderBy: updatedAt) {
          nodes {
            id
            body
            createdAt
            updatedAt
            user { id name displayName }
          }
        }
      }
    }`,
    { id: issueId }
  );
  return data.issue?.comments?.nodes ?? [];
}

export async function addComment(input: { issueId: string; body: string }) {
  const data = await linearGraphQL<{ commentCreate: { success: boolean; comment: any } }>(
    `mutation CommentCreate($input: CommentCreateInput!) {
      commentCreate(input: $input) {
        success
        comment { id body url }
      }
    }`,
    { input }
  );
  return data.commentCreate;
}

export async function updateComment(id: string, body: string) {
  const data = await linearGraphQL<{ commentUpdate: { success: boolean; comment: any } }>(
    `mutation CommentUpdate($id: String!, $input: CommentUpdateInput!) {
      commentUpdate(id: $id, input: $input) {
        success
        comment { id body url updatedAt }
      }
    }`,
    { id, input: { body } }
  );
  return data.commentUpdate;
}
