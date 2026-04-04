export interface IssueUpdatePayload {
  title?: string;
  description?: string;
  assigneeId?: string | null;
  dueDate?: string | null;
  stateId?: string;
}

export interface IssueCreatePayload {
  teamId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  dueDate?: string;
  projectId?: string;
  stateId?: string;
}
