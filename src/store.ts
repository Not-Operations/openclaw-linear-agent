import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';

export interface IssueSessionRecord {
  issueId: string;
  issueIdentifier?: string;
  sessionId: string;
  updatedAt: string;
}

export interface LinearTokenRecord {
  accessToken: string;
  refreshToken?: string;
  workspaceId?: string;
  appUserId?: string;
  updatedAt: string;
}

const sessionFile = path.join(config.DATA_DIR, 'issue-sessions.json');
const tokenFile = config.TOKEN_STORE_PATH;

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
}

export async function loadSessions(): Promise<Record<string, IssueSessionRecord>> {
  await ensureDir(config.DATA_DIR);
  try {
    const raw = await fs.readFile(sessionFile, 'utf8');
    return JSON.parse(raw);
  } catch (error: any) {
    if (error?.code === 'ENOENT') return {};
    throw error;
  }
}

export async function saveSession(record: IssueSessionRecord) {
  const current = await loadSessions();
  current[record.issueId] = record;
  await fs.writeFile(sessionFile, JSON.stringify(current, null, 2) + '\n', 'utf8');
}

export async function loadLinearTokens(): Promise<LinearTokenRecord | null> {
  await ensureDir(path.dirname(tokenFile));
  try {
    const raw = await fs.readFile(tokenFile, 'utf8');
    return JSON.parse(raw);
  } catch (error: any) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

export async function saveLinearTokens(record: LinearTokenRecord) {
  await ensureDir(path.dirname(tokenFile));
  await fs.writeFile(tokenFile, JSON.stringify(record, null, 2) + '\n', { mode: 0o600, encoding: 'utf8' });
}
