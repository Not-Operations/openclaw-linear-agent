#!/usr/bin/env node

import fs from 'node:fs';
import { apiFetch } from './http.js';
import { printOutput } from './format.js';
import { resolveIssueId, resolveProjectId, resolveStateId, resolveTeamId, resolveUserId } from './resolve.js';

function hasFlag(args: string[], flag: string) {
  return args.includes(flag);
}

function getFlagValue(args: string[], flag: string) {
  const i = args.indexOf(flag);
  if (i === -1) return undefined;
  return args[i + 1];
}

function readBody(args: string[]) {
  const stdin = hasFlag(args, '--stdin');
  const bodyFile = getFlagValue(args, '--body-file');
  const body = getFlagValue(args, '--body');

  if (bodyFile) return fs.readFileSync(bodyFile, 'utf8');
  if (body) return body;
  if (stdin) return fs.readFileSync(0, 'utf8');
  return undefined;
}

async function main() {
  const [, , resource, command, ...args] = process.argv;
  const json = hasFlag(args, '--json');

  if (resource === 'auth' && command === 'status') {
    return printOutput(await apiFetch('/api/v1/auth/status'), json);
  }

  if (resource === 'issue' && command === 'get') {
    const identifier = args[0];
    return printOutput(await apiFetch(`/api/v1/issues/${encodeURIComponent(identifier)}`), json);
  }

  if (resource === 'issue' && command === 'create') {
    const teamInput = getFlagValue(args, '--team-id') || getFlagValue(args, '--team');
    const teamId = await resolveTeamId(teamInput);
    const projectId = await resolveProjectId(getFlagValue(args, '--project-id') || getFlagValue(args, '--project'));
    const assigneeId = await resolveUserId(getFlagValue(args, '--assignee-id') || getFlagValue(args, '--assignee') || getFlagValue(args, '--assignee-email'));
    const stateLookupTeam = getFlagValue(args, '--team') || teamInput;
    const stateId = await resolveStateId(stateLookupTeam, getFlagValue(args, '--state-id') || getFlagValue(args, '--state'));
    const payload = {
      teamId,
      title: getFlagValue(args, '--title'),
      description: readBody(args) || getFlagValue(args, '--description'),
      assigneeId,
      dueDate: getFlagValue(args, '--due-date'),
      projectId,
      stateId
    };
    const result = await apiFetch('/api/v1/issues', { method: 'POST', body: JSON.stringify(payload) });
    const newIssueId = result?.result?.issue?.id;
    const blocksIssueId = getFlagValue(args, '--blocks-issue-id');
    const blockedByIssueId = getFlagValue(args, '--blocked-by-issue-id');
    const relatedIssueId = getFlagValue(args, '--related-issue-id');

    if (newIssueId && blocksIssueId) {
      await apiFetch('/api/v1/relations', {
        method: 'POST',
        body: JSON.stringify({ issueId: newIssueId, relatedIssueId: blocksIssueId, type: 'blocks' })
      });
    }

    if (newIssueId && blockedByIssueId) {
      await apiFetch('/api/v1/relations', {
        method: 'POST',
        body: JSON.stringify({ issueId: blockedByIssueId, relatedIssueId: newIssueId, type: 'blocks' })
      });
    }

    if (newIssueId && relatedIssueId) {
      await apiFetch('/api/v1/relations', {
        method: 'POST',
        body: JSON.stringify({ issueId: newIssueId, relatedIssueId, type: 'related' })
      });
    }

    return printOutput(result, json);
  }

  if (resource === 'issue' && command === 'update') {
    const id = args[0];
    const assigneeId = await resolveUserId(getFlagValue(args, '--assignee-id') || getFlagValue(args, '--assignee') || getFlagValue(args, '--assignee-email'));
    const stateId = await resolveStateId(getFlagValue(args, '--team') || undefined, getFlagValue(args, '--state-id') || getFlagValue(args, '--state'));
    const payload = {
      title: getFlagValue(args, '--title'),
      description: readBody(args) || getFlagValue(args, '--description'),
      assigneeId,
      dueDate: getFlagValue(args, '--due-date'),
      stateId
    };
    return printOutput(await apiFetch(`/api/v1/issues/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) }), json);
  }

  if (resource === 'issue' && command === 'status' && args[0] === 'list') {
    const teamKey = getFlagValue(args, '--team');
    if (!teamKey) throw new Error('Missing --team');
    return printOutput(await apiFetch(`/api/v1/teams/${encodeURIComponent(teamKey)}/states`), json);
  }

  if (resource === 'comment' && command === 'list') {
    const issueId = getFlagValue(args, '--issue');
    if (!issueId) throw new Error('Missing --issue');
    return printOutput(await apiFetch(`/api/v1/issues/${encodeURIComponent(issueId)}/comments`), json);
  }

  if (resource === 'comment' && command === 'add') {
    const issueId = getFlagValue(args, '--issue');
    if (!issueId) throw new Error('Missing --issue');
    const body = readBody(args);
    return printOutput(await apiFetch(`/api/v1/issues/${encodeURIComponent(issueId)}/comments`, { method: 'POST', body: JSON.stringify({ body }) }), json);
  }

  if (resource === 'comment' && command === 'update') {
    const id = args[0];
    const body = readBody(args);
    return printOutput(await apiFetch(`/api/v1/comments/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ body }) }), json);
  }

  if (resource === 'relation' && command === 'add') {
    const payload = {
      issueId: await resolveIssueId(getFlagValue(args, '--issue-id')),
      relatedIssueId: await resolveIssueId(getFlagValue(args, '--related-issue-id')),
      type: getFlagValue(args, '--type') || 'related'
    };
    return printOutput(await apiFetch('/api/v1/relations', { method: 'POST', body: JSON.stringify(payload) }), json);
  }

  if (resource === 'team' && command === 'list') {
    return printOutput(await apiFetch('/api/v1/teams'), json);
  }

  if (resource === 'user' && command === 'list') {
    const query = getFlagValue(args, '--query');
    const suffix = query ? `?query=${encodeURIComponent(query)}` : '';
    return printOutput(await apiFetch(`/api/v1/users${suffix}`), json);
  }

  if (resource === 'project' && command === 'list') {
    return printOutput(await apiFetch('/api/v1/projects'), json);
  }

  if (resource === 'project' && command === 'create') {
    const teamInput = getFlagValue(args, '--team-id') || getFlagValue(args, '--team');
    const teamId = await resolveTeamId(teamInput);
    const leadId = await resolveUserId(getFlagValue(args, '--lead-id') || getFlagValue(args, '--lead') || getFlagValue(args, '--lead-email'));
    const payload = {
      name: getFlagValue(args, '--name'),
      teamIds: teamId ? [teamId] : undefined,
      leadId,
      startDate: getFlagValue(args, '--start-date'),
      targetDate: getFlagValue(args, '--target-date'),
      description: readBody(args) || getFlagValue(args, '--description')
    };
    return printOutput(await apiFetch('/api/v1/projects', { method: 'POST', body: JSON.stringify(payload) }), json);
  }

  if (resource === 'project' && command === 'update') {
    const id = await resolveProjectId(args[0]);
    const leadId = await resolveUserId(getFlagValue(args, '--lead-id') || getFlagValue(args, '--lead') || getFlagValue(args, '--lead-email'));
    const payload = {
      name: getFlagValue(args, '--name'),
      leadId,
      startDate: getFlagValue(args, '--start-date'),
      targetDate: getFlagValue(args, '--target-date'),
      description: readBody(args) || getFlagValue(args, '--description')
    };
    return printOutput(await apiFetch(`/api/v1/projects/${encodeURIComponent(id!)}`, { method: 'PATCH', body: JSON.stringify(payload) }), json);
  }

  if (resource === 'project' && command === 'issues') {
    const projectId = getFlagValue(args, '--project-id');
    const projectName = getFlagValue(args, '--project-name');
    const stateName = getFlagValue(args, '--state');
    const assigneeId = getFlagValue(args, '--assignee-id');
    const teamKey = getFlagValue(args, '--team');
    const dueDateFrom = getFlagValue(args, '--due-date-from');
    const dueDateTo = getFlagValue(args, '--due-date-to');
    const qs = new URLSearchParams();
    if (projectId) qs.set('projectId', projectId);
    if (projectName) qs.set('projectName', projectName);
    if (stateName) qs.set('stateName', stateName);
    if (assigneeId) qs.set('assigneeId', assigneeId);
    if (teamKey) qs.set('teamKey', teamKey);
    if (dueDateFrom) qs.set('dueDateFrom', dueDateFrom);
    if (dueDateTo) qs.set('dueDateTo', dueDateTo);
    return printOutput(await apiFetch(`/api/v1/projects?${qs.toString()}`), json);
  }

  if (resource === 'milestone' && command === 'list') {
    const projectId = await resolveProjectId(getFlagValue(args, '--project-id') || getFlagValue(args, '--project'));
    return printOutput(await apiFetch(`/api/v1/projects/${encodeURIComponent(projectId!)}/milestones`), json);
  }

  if (resource === 'milestone' && command === 'create') {
    const projectId = await resolveProjectId(getFlagValue(args, '--project-id') || getFlagValue(args, '--project'));
    const payload = {
      name: getFlagValue(args, '--name'),
      description: readBody(args) || getFlagValue(args, '--description'),
      targetDate: getFlagValue(args, '--target-date')
    };
    return printOutput(await apiFetch(`/api/v1/projects/${encodeURIComponent(projectId!)}/milestones`, { method: 'POST', body: JSON.stringify(payload) }), json);
  }

  if (resource === 'milestone' && command === 'update') {
    const id = args[0];
    const payload = {
      name: getFlagValue(args, '--name'),
      description: readBody(args) || getFlagValue(args, '--description'),
      targetDate: getFlagValue(args, '--target-date')
    };
    return printOutput(await apiFetch(`/api/v1/milestones/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) }), json);
  }

  if (resource === 'issue' && command === 'milestone') {
    const issueId = await resolveIssueId(args[0]);
    const milestoneId = getFlagValue(args, '--milestone-id');
    return printOutput(await apiFetch(`/api/v1/issues/${encodeURIComponent(issueId!)}/milestone`, { method: 'PATCH', body: JSON.stringify({ projectMilestoneId: milestoneId }) }), json);
  }

  if (resource === 'relation' && command === 'remove') {
    const id = args[0];
    return printOutput(await apiFetch(`/api/v1/relations/${encodeURIComponent(id)}`, { method: 'DELETE' }), json);
  }

  console.log(`Usage:
  linear auth status [--json]
  linear issue get <identifier> [--json]
  linear issue create --team-id <id>|--team <key|name> --title <title> [--description <text>|--body-file <file>|--stdin] [--assignee-id <id>|--assignee <name>|--assignee-email <email>] [--due-date YYYY-MM-DD] [--project-id <id>|--project <name>] [--state-id <id>|--state <name>] [--blocks-issue-id <id>] [--blocked-by-issue-id <id>] [--related-issue-id <id>] [--json]
  linear issue update <id> [--title <title>] [--description <text>|--body-file <file>|--stdin] [--assignee-id <id>|--assignee <name>|--assignee-email <email>] [--due-date YYYY-MM-DD] [--team <TEAMKEY>] [--state-id <id>|--state <name>] [--json]
  linear issue status list --team <TEAMKEY> [--json]
  linear issue milestone <issue-id|identifier> --milestone-id <id> [--json]
  linear comment list --issue <issueId> [--json]
  linear comment add --issue <issueId> [--body <text>|--body-file <file>|--stdin] [--json]
  linear comment update <commentId> [--body <text>|--body-file <file>|--stdin] [--json]
  linear team list [--json]
  linear user list [--query <text>] [--json]
  linear project list [--json]
  linear project create --name <name> [--team <key|name>|--team-id <id>] [--lead <name>|--lead-email <email>|--lead-id <id>] [--start-date YYYY-MM-DD] [--target-date YYYY-MM-DD] [--description <text>|--body-file <file>|--stdin] [--json]
  linear project update <project-id|project-name> [--name <name>] [--lead <name>|--lead-email <email>|--lead-id <id>] [--start-date YYYY-MM-DD] [--target-date YYYY-MM-DD] [--description <text>|--body-file <file>|--stdin] [--json]
  linear project issues [--project-id <id>|--project-name <name>] [--state <stateName>] [--assignee-id <id>] [--team <TEAMKEY>] [--due-date-from YYYY-MM-DD] [--due-date-to YYYY-MM-DD] [--json]
  linear milestone list --project <project-name>|--project-id <id> [--json]
  linear milestone create --project <project-name>|--project-id <id> --name <name> [--description <text>|--body-file <file>|--stdin] [--target-date YYYY-MM-DD] [--json]
  linear milestone update <milestone-id> [--name <name>] [--description <text>|--body-file <file>|--stdin] [--target-date YYYY-MM-DD] [--json]
  linear relation add --issue-id <id|identifier> --related-issue-id <id|identifier> [--type blocks|related] [--json]
  linear relation remove <relationId> [--json]`);
  process.exit(1);
}

main().catch((error: any) => {
  console.error(error?.message ?? String(error));
  process.exit(1);
});
