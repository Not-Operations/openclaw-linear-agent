import crypto from 'node:crypto';
import { config } from './config.js';

export function verifyLinearWebhook(rawBody: Buffer, signatureHeader: string | undefined, secret: string) {
  if (!signatureHeader || !secret || secret === 'replace_me') return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const provided = signatureHeader.replace(/^sha256=/, '');
  if (expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

export function createOAuthState() {
  const nonce = crypto.randomBytes(16).toString('hex');
  const sig = crypto.createHmac('sha256', config.LINEAR_STATE_SECRET).update(nonce).digest('hex');
  return `${nonce}.${sig}`;
}

export function verifyOAuthState(state: string | undefined) {
  if (!state) return false;
  const [nonce, sig] = state.split('.');
  if (!nonce || !sig) return false;
  const expected = crypto.createHmac('sha256', config.LINEAR_STATE_SECRET).update(nonce).digest('hex');
  if (expected.length !== sig.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

export function getLinearInstallUrl() {
  const url = new URL('https://linear.app/oauth/authorize');
  url.searchParams.set('client_id', config.LINEAR_CLIENT_ID);
  url.searchParams.set('redirect_uri', config.LINEAR_REDIRECT_URI ?? '');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', config.LINEAR_OAUTH_SCOPES);
  url.searchParams.set('actor', 'app');
  url.searchParams.set('state', createOAuthState());
  return url.toString();
}

async function fetchOAuthToken(body: URLSearchParams) {
  const res = await fetch('https://api.linear.app/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!res.ok) {
    throw new Error(`Linear token exchange failed: ${res.status} ${await res.text()}`);
  }

  return (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    scope?: string;
    token_type?: string;
  };
}

export async function exchangeCodeForToken(code: string) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.LINEAR_REDIRECT_URI ?? '',
    client_id: config.LINEAR_CLIENT_ID,
    client_secret: config.LINEAR_CLIENT_SECRET
  });

  return fetchOAuthToken(body);
}

export async function refreshAccessToken(refreshToken: string) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: config.LINEAR_CLIENT_ID,
    client_secret: config.LINEAR_CLIENT_SECRET
  });

  return fetchOAuthToken(body);
}

export async function fetchViewer(accessToken: string) {
  const res = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      query: `query Viewer { viewer { id name } organization { id name } }`
    })
  });

  if (!res.ok) {
    throw new Error(`Linear viewer query failed: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as any;
  if (json.errors?.length) {
    throw new Error(`Linear viewer query errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data as {
    viewer?: { id?: string; name?: string };
    organization?: { id?: string; name?: string };
  };
}

export interface LinearWebhookEnvelope {
  action?: string;
  type?: string;
  createdAt?: string;
  organizationId?: string;
  oauthClientId?: string;
  appUserId?: string;
  webhookTimestamp?: number;
  webhookId?: string;
  promptContext?: string;
  previousComments?: Array<{ id?: string; body?: string; userId?: string; issueId?: string }>;
  guidance?: unknown;
  agentSession?: {
    id?: string;
    issueId?: string;
    url?: string;
    commentId?: string | null;
    sourceCommentId?: string | null;
    status?: string;
    issue?: {
      id?: string;
      identifier?: string;
      title?: string;
      description?: string | null;
      url?: string;
      team?: { id?: string; key?: string; name?: string };
    };
    comment?: { id?: string; body?: string; userId?: string; issueId?: string };
  };
  agentActivity?: {
    id?: string;
    agentSessionId?: string;
    sourceCommentId?: string | null;
    userId?: string;
    ephemeral?: boolean;
    content?: { type?: string; body?: string };
    user?: { id?: string; name?: string; email?: string };
  };
  data?: {
    id?: string;
    identifier?: string;
    title?: string;
    description?: string | null;
    url?: string;
    state?: { name?: string };
    team?: { id?: string; key?: string; name?: string };
    comment?: { body?: string };
  };
  actor?: {
    id?: string;
    name?: string;
    email?: string;
  };
}

export function buildPrompt(event: LinearWebhookEnvelope) {
  const issue = event.data ?? {};
  const parts = [
    'You are handling a Linear event through a local bridge.',
    'Return a concise operator-grade response suitable for posting back to the issue as a comment.',
    'If the event does not need a reply, start your response with NO_ACTION and explain why in one sentence.',
    '',
    `Event type: ${event.type ?? 'unknown'}`,
    `Event action: ${event.action ?? 'unknown'}`,
    `Issue id: ${issue.id ?? 'unknown'}`,
    `Issue identifier: ${issue.identifier ?? 'unknown'}`,
    `Issue title: ${issue.title ?? 'untitled'}`,
    `Issue state: ${issue.state?.name ?? 'unknown'}`,
    `Issue URL: ${issue.url ?? 'unknown'}`,
    `Team: ${issue.team?.name ?? issue.team?.key ?? issue.team?.id ?? 'unknown'}`,
    '',
    'Issue description:',
    issue.description?.trim() || '(empty)',
    ''
  ];

  if (event.actor?.name || event.actor?.email) {
    parts.push(`Actor: ${event.actor.name ?? 'unknown'} <${event.actor.email ?? 'unknown'}>`);
  }

  return parts.join('\n');
}
