import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { config } from './config.js';
import {
  buildPrompt,
  exchangeCodeForToken,
  fetchViewer,
  getLinearInstallUrl,
  type LinearWebhookEnvelope,
  verifyLinearWebhook,
  verifyOAuthState
} from './linear.js';
import { createActionActivity, createErrorActivity, createResponseActivity, createThoughtActivity } from './linear-client.js';
import { invokeOpenClaw } from './openclaw.js';
import { loadSessions, saveSession } from './store.js';
import { saveLinearTokens } from './linear-token.js';
import { getAuthStatus } from './api/auth-status.js';
import { apiAddComment, apiAssignIssueToMilestone, apiCreateIssue, apiCreateIssueRelation, apiCreateMilestone, apiCreateProject, apiDeleteIssueRelation, apiGetIssue, apiListComments, apiListMilestones, apiListProjectIssues, apiListProjects, apiListTeamStates, apiUpdateComment, apiUpdateIssue, apiUpdateMilestone, apiUpdateProject } from './api/issues.js';
import { apiListTeams, apiListUsers } from './api/lookups.js';
import { commentBodySchema, issueCreateSchema, issueMilestoneLinkSchema, issueRelationSchema, issueUpdateSchema, milestoneCreateSchema, milestoneUpdateSchema, projectCreateSchema, projectIssueListSchema, projectUpdateSchema } from './contracts/validation.js';
import { parseOrThrow, sendError } from './api/http.js';

const app = express();
app.use('/webhooks/linear', express.raw({ type: '*/*', limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));

async function writeDebugFile(name: string, data: unknown) {
  await fs.mkdir(config.DATA_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const outFile = path.join(config.DATA_DIR, `${stamp}-${safeName}.json`);
  await fs.writeFile(outFile, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function classifyWorkNeed(event: LinearWebhookEnvelope) {
  const issueText = [
    event.agentSession?.issue?.title,
    event.agentSession?.issue?.description,
    event.agentActivity?.content?.body,
    event.promptContext
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase();

  const workSignals = [
    'research',
    'compile',
    'look up',
    'find ',
    'browse',
    'fetch',
    'document',
    'compare',
    'analyze',
    'sheet',
    'spreadsheet',
    'webpage',
    'podcast',
    'requirements'
  ];

  return workSignals.some((signal) => issueText.includes(signal));
}

function buildExecutionPrompt(event: LinearWebhookEnvelope) {
  const followupBody = event.agentActivity?.content?.body?.trim();
  const base = event.promptContext || buildPrompt(event);
  const workRequired = classifyWorkNeed(event);
  const lowerBase = base.toLowerCase();
  const hasProvidedSpreadsheet = lowerBase.includes('docs.google.com/spreadsheets') || lowerBase.includes('spreadsheet link') || lowerBase.includes('<sheet');
  const hasProvidedDocOrFile = hasProvidedSpreadsheet || lowerBase.includes('docs.google.com/document') || lowerBase.includes('drive.google.com/file') || lowerBase.includes('here is the file') || lowerBase.includes('here is the document') || lowerBase.includes('here is the link to open');

  const instructions = workRequired
    ? [
        'This request requires meaningful work, not just acknowledgment.',
        'Do not use the final answer merely to say you will do the task.',
        'If the task is feasible with current tools/context, perform substantial work first, then return concrete findings or a clearly bounded partial result.',
        'If blocked, state the specific blocker plainly.',
        'For research tasks, prefer actual findings over intent statements.',
        ...(hasProvidedDocOrFile
          ? [
              'A file/document/link was explicitly provided by the user. You must open and use the provided source first before falling back to generic web search.',
              'If a Google Sheet is provided, prioritize opening the sheet and extracting candidate rows/items from it before doing outside research.',
              'Only use broad web search after you have checked the provided source and only if the provided source is insufficient.'
            ]
          : [])
      ]
    : [
        'Provide a concise, useful answer based on the issue context and request.'
      ];

  if (event.action === 'prompted') {
    return [
      ...instructions,
      '',
      base,
      '',
      '<follow-up-request>',
      followupBody || '(missing follow-up body)',
      '</follow-up-request>'
    ].join('\n');
  }

  return [
    ...instructions,
    '',
    base
  ].join('\n');
}

app.get('/health', async (_req, res) => {
  res.json({ ok: true, service: 'linear-agent-bridge' });
});

app.use('/api/v1', authorizeApi);

function authorizeApi(req: express.Request, res: express.Response, next: express.NextFunction) {
  const configuredSecret = config.LINEAR_API_SECRET?.trim();
  if (!configuredSecret) {
    res.status(503).json({ ok: false, error: 'api secret not configured' });
    return;
  }

  const providedSecret = req.header('x-api-key')?.trim();
  if (!providedSecret) {
    res.status(401).json({ ok: false, error: 'missing api key' });
    return;
  }

  const expected = Buffer.from(configuredSecret);
  const received = Buffer.from(providedSecret);
  const isMatch = expected.length === received.length && timingSafeEqual(expected, received);

  if (!isMatch) {
    res.status(401).json({ ok: false, error: 'invalid api key' });
    return;
  }

  next();
}

app.get('/api/v1/auth/status', async (_req, res) => {
  const status = await getAuthStatus();
  res.status(status.ok ? 200 : 503).json(status);
});

app.get('/api/v1/teams', async (_req, res) => {
  try {
    res.json(await apiListTeams());
  } catch (error: any) {
    sendError(res, error);
  }
});

app.get('/api/v1/users', async (req, res) => {
  try {
    const query = typeof req.query.query === 'string' ? req.query.query : undefined;
    res.json(await apiListUsers(query));
  } catch (error: any) {
    sendError(res, error);
  }
});

app.get('/api/v1/issues/:identifier', async (req, res) => {
  try {
    res.json(await apiGetIssue(req.params.identifier));
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error?.message ?? String(error) });
  }
});

app.post('/api/v1/issues', async (req, res) => {
  try {
    const body = parseOrThrow(issueCreateSchema, req.body);
    res.json(await apiCreateIssue(body));
  } catch (error: any) {
    sendError(res, error);
  }
});

app.patch('/api/v1/issues/:id', async (req, res) => {
  try {
    const body = parseOrThrow(issueUpdateSchema, req.body);
    res.json(await apiUpdateIssue(req.params.id, body));
  } catch (error: any) {
    sendError(res, error);
  }
});

app.get('/api/v1/issues/:id/comments', async (req, res) => {
  try {
    res.json(await apiListComments(req.params.id));
  } catch (error: any) {
    sendError(res, error);
  }
});

app.post('/api/v1/issues/:id/comments', async (req, res) => {
  try {
    const body = parseOrThrow(commentBodySchema, req.body);
    res.json(await apiAddComment(req.params.id, body.body));
  } catch (error: any) {
    sendError(res, error);
  }
});

app.patch('/api/v1/comments/:id', async (req, res) => {
  try {
    const body = parseOrThrow(commentBodySchema, req.body);
    res.json(await apiUpdateComment(req.params.id, body.body));
  } catch (error: any) {
    sendError(res, error);
  }
});

app.get('/api/v1/teams/:teamKey/states', async (req, res) => {
  try {
    res.json(await apiListTeamStates(req.params.teamKey));
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error?.message ?? String(error) });
  }
});

app.post('/api/v1/relations', async (req, res) => {
  try {
    const body = parseOrThrow(issueRelationSchema, req.body);
    res.json(await apiCreateIssueRelation(body));
  } catch (error: any) {
    sendError(res, error);
  }
});

app.delete('/api/v1/relations/:id', async (req, res) => {
  try {
    res.json(await apiDeleteIssueRelation(req.params.id));
  } catch (error: any) {
    sendError(res, error);
  }
});

app.get('/api/v1/projects', async (req, res) => {
  try {
    if (req.query.projectId || req.query.projectName || req.query.stateName) {
      const query = parseOrThrow(projectIssueListSchema, {
        projectId: typeof req.query.projectId === 'string' ? req.query.projectId : undefined,
        projectName: typeof req.query.projectName === 'string' ? req.query.projectName : undefined,
        stateName: typeof req.query.stateName === 'string' ? req.query.stateName : undefined,
        assigneeId: typeof req.query.assigneeId === 'string' ? req.query.assigneeId : undefined,
        teamKey: typeof req.query.teamKey === 'string' ? req.query.teamKey : undefined,
        dueDateFrom: typeof req.query.dueDateFrom === 'string' ? req.query.dueDateFrom : undefined,
        dueDateTo: typeof req.query.dueDateTo === 'string' ? req.query.dueDateTo : undefined
      });
      res.json(await apiListProjectIssues(query));
      return;
    }
    res.json(await apiListProjects());
  } catch (error: any) {
    sendError(res, error);
  }
});

app.post('/api/v1/projects', async (req, res) => {
  try {
    const body = parseOrThrow(projectCreateSchema, req.body);
    res.json(await apiCreateProject(body));
  } catch (error: any) {
    sendError(res, error);
  }
});

app.patch('/api/v1/projects/:id', async (req, res) => {
  try {
    const body = parseOrThrow(projectUpdateSchema, req.body);
    res.json(await apiUpdateProject(req.params.id, body));
  } catch (error: any) {
    sendError(res, error);
  }
});

app.get('/api/v1/projects/:id/milestones', async (req, res) => {
  try {
    res.json(await apiListMilestones(req.params.id));
  } catch (error: any) {
    sendError(res, error);
  }
});

app.post('/api/v1/projects/:id/milestones', async (req, res) => {
  try {
    const body = parseOrThrow(milestoneCreateSchema, req.body);
    res.json(await apiCreateMilestone({ ...body, projectId: req.params.id }));
  } catch (error: any) {
    sendError(res, error);
  }
});

app.patch('/api/v1/milestones/:id', async (req, res) => {
  try {
    const body = parseOrThrow(milestoneUpdateSchema, req.body);
    res.json(await apiUpdateMilestone(req.params.id, body));
  } catch (error: any) {
    sendError(res, error);
  }
});

app.patch('/api/v1/issues/:id/milestone', async (req, res) => {
  try {
    const body = parseOrThrow(issueMilestoneLinkSchema, req.body);
    res.json(await apiAssignIssueToMilestone(req.params.id, body.projectMilestoneId));
  } catch (error: any) {
    sendError(res, error);
  }
});

app.get('/auth/linear/start', async (_req, res) => {
  res.redirect(getLinearInstallUrl());
});

app.get('/auth/linear/callback', async (req, res) => {
  try {
    const code = typeof req.query.code === 'string' ? req.query.code : undefined;
    const state = typeof req.query.state === 'string' ? req.query.state : undefined;
    const error = typeof req.query.error === 'string' ? req.query.error : undefined;

    if (error) {
      await writeDebugFile('oauth-error', { query: req.query, error });
      return res.status(400).json({ ok: false, error });
    }

    if (!verifyOAuthState(state)) {
      await writeDebugFile('oauth-invalid-state', { query: req.query });
      return res.status(400).json({ ok: false, error: 'invalid state' });
    }

    if (!code) {
      await writeDebugFile('oauth-missing-code', { query: req.query });
      return res.status(400).json({ ok: false, error: 'missing code' });
    }

    const token = await exchangeCodeForToken(code);
    const viewer = await fetchViewer(token.access_token);

    await saveLinearTokens({
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      workspaceId: viewer.organization?.id,
      appUserId: viewer.viewer?.id,
      updatedAt: new Date().toISOString()
    });

    await writeDebugFile('oauth-success', {
      viewer: viewer.viewer,
      organization: viewer.organization,
      hasAccessToken: !!token.access_token,
      hasRefreshToken: !!token.refresh_token
    });

    return res.json({
      ok: true,
      installed: true,
      viewer: viewer.viewer,
      organization: viewer.organization
    });
  } catch (error: any) {
    await writeDebugFile('oauth-exception', { error: error?.message ?? String(error) });
    return res.status(500).json({ ok: false, error: error?.message ?? String(error) });
  }
});

app.post('/webhooks/linear', async (req, res) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}));
  const signature = req.header('linear-signature') ?? req.header('x-linear-signature') ?? undefined;

  let parsed: any = null;
  try {
    parsed = JSON.parse(rawBody.toString('utf8'));
  } catch {
    parsed = { parseError: true, rawText: rawBody.toString('utf8').slice(0, 4000) };
  }

  await writeDebugFile('webhook-received', {
    headers: {
      'content-type': req.header('content-type'),
      'user-agent': req.header('user-agent'),
      'linear-signature': req.header('linear-signature') ?? null,
      'x-linear-signature': req.header('x-linear-signature') ?? null
    },
    body: parsed
  });

  const signatureOk = verifyLinearWebhook(rawBody, signature, config.LINEAR_WEBHOOK_SECRET);

  if (!signatureOk) {
    await writeDebugFile('webhook-invalid-signature', {
      signatureHeaderPresent: !!signature,
      body: parsed
    });
    return res.status(401).json({ ok: false, error: 'invalid webhook signature' });
  }

  if (!config.ALLOW_AUTO_RUN) {
    await writeDebugFile('webhook-accepted-no-run', {
      reason: 'ALLOW_AUTO_RUN=false',
      body: parsed
    });
    return res.status(202).json({ ok: true, skipped: true, reason: 'ALLOW_AUTO_RUN=false' });
  }

  const event = parsed as LinearWebhookEnvelope;
  const issueId = event.agentSession?.issueId ?? event.agentSession?.issue?.id ?? event.data?.id;
  const agentSessionId = event.agentSession?.id;

  if (!issueId || !agentSessionId) {
    await writeDebugFile('webhook-missing-ids', { body: parsed });
    return res.status(400).json({ ok: false, error: 'missing issue id or agentSession id' });
  }

  void (async () => {
    try {
      const workRequired = classifyWorkNeed(event);
      await createThoughtActivity(agentSessionId, 'Anne Li is reading the issue context and thinking.', true);

      if (workRequired) {
        await createActionActivity(agentSessionId, 'Anne Li is doing the requested work now and will return with concrete results, not just an acknowledgment.');
      }

      const prompt = buildExecutionPrompt(event);
      const sessions = await loadSessions();
      const prior = sessions[issueId];
      const result = await invokeOpenClaw({
        message: prompt,
        sessionId: prior?.sessionId
      });

      if (result.sessionId) {
        await saveSession({
          issueId,
          issueIdentifier: event.agentSession?.issue?.identifier ?? event.data?.identifier,
          sessionId: result.sessionId,
          updatedAt: new Date().toISOString()
        });
      }

      const responseBody = result.text?.trim() || 'I reviewed the context but do not yet have a useful response.';
      await createResponseActivity(agentSessionId, responseBody);

      await writeDebugFile(`openclaw-result-${issueId}`, {
        event,
        classifiedAsWork: workRequired,
        openclaw: {
          runId: result.runId,
          sessionId: result.sessionId,
          text: result.text
        }
      });
    } catch (error: any) {
      console.error('async webhook processing failed', error);
      try {
        if (agentSessionId) {
          await createErrorActivity(agentSessionId, `Anne Li hit an error: ${error?.message ?? String(error)}`);
        }
      } catch (postErr: any) {
        console.error('failed to post Linear error activity', postErr);
      }
      await writeDebugFile('webhook-processing-error', { error: error?.message ?? String(error), body: parsed });
    }
  })();

  return res.status(200).json({ ok: true, accepted: true });
});

app.listen(config.PORT, '127.0.0.1', () => {
  console.log(`linear-agent-bridge listening on 127.0.0.1:${config.PORT}`);
});
