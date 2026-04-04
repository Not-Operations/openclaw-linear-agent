import os from 'node:os';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';

loadEnv();
loadEnv({ path: path.join(os.homedir(), '.openclaw/.env'), override: false });

const DEFAULT_BASE_URL = process.env.LINEAR_BRIDGE_BASE_URL || 'http://127.0.0.1:3001';
const API_KEY = process.env.LINEAR_API_SECRET || process.env.LINEAR_BRIDGE_API_KEY;

export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined)
  };

  if (API_KEY && path.startsWith('/api/v1/')) {
    headers['x-api-key'] = API_KEY;
  }

  const res = await fetch(`${DEFAULT_BASE_URL}${path}`, {
    ...init,
    headers
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { ok: false, error: text };
  }

  if (!res.ok) {
    throw new Error(json?.error || `HTTP ${res.status}`);
  }

  return json;
}
