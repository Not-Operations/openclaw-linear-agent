import { addComment, listComments, updateComment } from '../operations/comments.js';
import { createIssue, getIssue, listTeamStates, updateIssue } from '../operations/issues.js';
import { createIssueRelation, deleteIssueRelation } from '../operations/relations.js';
import { createProject, listProjectIssues, listProjects, updateProject } from '../operations/projects.js';
import { createProjectMilestone, listProjectMilestones, updateProjectMilestone } from '../operations/milestones.js';
import { assignIssueToMilestone } from '../operations/issue-milestones.js';

export async function apiGetIssue(identifier: string) {
  return { ok: true, issue: await getIssue(identifier) };
}

export async function apiListComments(issueId: string) {
  return { ok: true, comments: await listComments(issueId) };
}

export async function apiAddComment(issueId: string, body: string) {
  return { ok: true, result: await addComment({ issueId, body }) };
}

export async function apiUpdateComment(id: string, body: string) {
  return { ok: true, result: await updateComment(id, body) };
}

export async function apiCreateIssue(input: {
  teamId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  dueDate?: string;
  projectId?: string;
  stateId?: string;
}) {
  return { ok: true, result: await createIssue(input) };
}

export async function apiUpdateIssue(id: string, input: Record<string, unknown>) {
  return { ok: true, result: await updateIssue(id, input) };
}

export async function apiListTeamStates(teamKey: string) {
  return { ok: true, team: await listTeamStates(teamKey) };
}

export async function apiCreateIssueRelation(input: {
  issueId: string;
  relatedIssueId: string;
  type: 'blocks' | 'related';
}) {
  return { ok: true, result: await createIssueRelation(input) };
}

export async function apiDeleteIssueRelation(id: string) {
  return { ok: true, result: await deleteIssueRelation(id) };
}

export async function apiListProjects() {
  return { ok: true, projects: await listProjects() };
}

export async function apiCreateProject(input: {
  name: string;
  teamIds?: string[];
  leadId?: string;
  startDate?: string;
  targetDate?: string;
  description?: string;
}) {
  return { ok: true, result: await createProject(input) };
}

export async function apiUpdateProject(id: string, input: {
  name?: string;
  leadId?: string;
  startDate?: string;
  targetDate?: string;
  description?: string;
}) {
  return { ok: true, result: await updateProject(id, input) };
}

export async function apiListProjectIssues(input: {
  projectId?: string;
  projectName?: string;
  stateName?: string;
  assigneeId?: string;
  teamKey?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
}) {
  return { ok: true, issues: await listProjectIssues(input) };
}

export async function apiListMilestones(projectId: string) {
  return { ok: true, milestones: await listProjectMilestones(projectId) };
}

export async function apiCreateMilestone(input: {
  projectId: string;
  name: string;
  description?: string;
  targetDate?: string;
}) {
  return { ok: true, result: await createProjectMilestone(input) };
}

export async function apiUpdateMilestone(id: string, input: {
  name?: string;
  description?: string;
  targetDate?: string;
}) {
  return { ok: true, result: await updateProjectMilestone(id, input) };
}

export async function apiAssignIssueToMilestone(issueId: string, projectMilestoneId: string) {
  return { ok: true, result: await assignIssueToMilestone(issueId, projectMilestoneId) };
}
