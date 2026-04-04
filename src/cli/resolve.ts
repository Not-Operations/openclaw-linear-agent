import { apiFetch } from './http.js';

export async function resolveTeamId(teamOrId?: string) {
  if (!teamOrId) return undefined;
  if (teamOrId.includes('-') && teamOrId.length > 20) return teamOrId;
  const data = await apiFetch('/api/v1/teams');
  const lower = teamOrId.toLowerCase();
  const team = data.teams?.find((t: any) => t.id === teamOrId || t.key?.toLowerCase() === lower || t.name?.toLowerCase() === lower);
  if (!team) throw new Error(`Could not resolve team: ${teamOrId}`);
  return team.id;
}

export async function resolveProjectId(projectOrId?: string) {
  if (!projectOrId) return undefined;
  if (projectOrId.includes('-') && projectOrId.length > 20) return projectOrId;
  const data = await apiFetch('/api/v1/projects');
  const lower = projectOrId.toLowerCase();
  const project = data.projects?.find((p: any) => p.id === projectOrId || p.name?.toLowerCase() === lower);
  if (!project) throw new Error(`Could not resolve project: ${projectOrId}`);
  return project.id;
}

export async function resolveIssueId(issueIdOrIdentifier?: string) {
  if (!issueIdOrIdentifier) return undefined;
  if (issueIdOrIdentifier.includes('-') && issueIdOrIdentifier.length > 20) return issueIdOrIdentifier;
  const data = await apiFetch(`/api/v1/issues/${encodeURIComponent(issueIdOrIdentifier)}`);
  const id = data.issue?.id;
  if (!id) throw new Error(`Could not resolve issue: ${issueIdOrIdentifier}`);
  return id;
}

export async function resolveUserId(userOrId?: string) {
  if (!userOrId) return undefined;
  if (userOrId.includes('-') && userOrId.length > 20) return userOrId;
  const data = await apiFetch(`/api/v1/users?query=${encodeURIComponent(userOrId)}`);
  const lower = userOrId.toLowerCase();
  const user = data.users?.find((u: any) => u.id === userOrId || u.email?.toLowerCase() === lower || u.name?.toLowerCase() === lower || u.displayName?.toLowerCase() === lower) || data.users?.[0];
  if (!user) throw new Error(`Could not resolve user: ${userOrId}`);
  return user.id;
}

export async function resolveStateId(teamKey: string | undefined, stateNameOrId?: string) {
  if (!stateNameOrId) return undefined;
  if (stateNameOrId.includes('-') && stateNameOrId.length > 20) return stateNameOrId;
  if (!teamKey) throw new Error('A team is required to resolve state by name');
  const data = await apiFetch(`/api/v1/teams/${encodeURIComponent(teamKey)}/states`);
  const lower = stateNameOrId.toLowerCase();
  const state = data.team?.states?.nodes?.find((s: any) => s.id === stateNameOrId || s.name?.toLowerCase() === lower);
  if (!state) throw new Error(`Could not resolve state: ${stateNameOrId}`);
  return state.id;
}
