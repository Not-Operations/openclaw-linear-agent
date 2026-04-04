import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';
import { refreshAccessToken } from './linear.js';
import { fetchViewer } from './linear.js';

export interface LinearTokenRecord {
  accessToken: string;
  refreshToken?: string;
  workspaceId?: string;
  appUserId?: string;
  updatedAt: string;
}

const tokenFile = config.TOKEN_STORE_PATH;
const tokenDir = path.dirname(tokenFile);

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
}

export async function loadLinearTokens(): Promise<LinearTokenRecord | null> {
  await ensureDir(tokenDir);
  try {
    const raw = await fs.readFile(tokenFile, 'utf8');
    return JSON.parse(raw) as LinearTokenRecord;
  } catch (error: any) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

export async function saveLinearTokens(record: LinearTokenRecord) {
  await ensureDir(tokenDir);
  const tmp = `${tokenFile}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(record, null, 2) + '\n', { mode: 0o600, encoding: 'utf8' });
  await fs.rename(tmp, tokenFile);
  await fs.chmod(tokenFile, 0o600);
}

export async function refreshStoredTokens(refreshToken: string) {
  const current = await loadLinearTokens();
  const refreshed = await refreshAccessToken(refreshToken);
  const next: LinearTokenRecord = {
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token || refreshToken,
    workspaceId: current?.workspaceId,
    appUserId: current?.appUserId,
    updatedAt: new Date().toISOString()
  };

  await saveLinearTokens(next);
  return next;
}

export async function probeAccessToken(accessToken: string) {
  try {
    const viewer = await fetchViewer(accessToken);
    return { ok: true as const, viewer };
  } catch (error: any) {
    const message = error?.message ?? String(error);
    if (/401|Authentication required|not authenticated|AUTHENTICATION_ERROR/i.test(message)) {
      return { ok: false as const, authFailed: true as const, error: message };
    }
    return { ok: false as const, authFailed: false as const, error: message };
  }
}

export async function getValidLinearTokens() {
  let tokens = await loadLinearTokens();
  if (!tokens?.accessToken) {
    throw new Error(`No stored Linear access token at ${tokenFile}`);
  }

  const firstProbe = await probeAccessToken(tokens.accessToken);
  if (firstProbe.ok) {
    return { tokens, source: 'existing' as const, viewer: firstProbe.viewer };
  }

  if (!firstProbe.authFailed) {
    throw new Error(`Linear token probe failed for non-auth reason: ${firstProbe.error}`);
  }

  if (!tokens.refreshToken) {
    throw new Error(`Linear access token is invalid and no refresh token is available: ${firstProbe.error}`);
  }

  tokens = await refreshStoredTokens(tokens.refreshToken);
  const secondProbe = await probeAccessToken(tokens.accessToken);
  if (!secondProbe.ok) {
    throw new Error(`Linear token refresh did not recover access: ${secondProbe.error}`);
  }

  return { tokens, source: 'refreshed' as const, viewer: secondProbe.viewer };
}

export async function getValidAccessToken() {
  const result = await getValidLinearTokens();
  return {
    accessToken: result.tokens.accessToken,
    source: result.source,
    viewer: result.viewer,
    updatedAt: result.tokens.updatedAt
  };
}
