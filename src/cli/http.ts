const DEFAULT_BASE_URL = process.env.LINEAR_BRIDGE_BASE_URL || 'http://127.0.0.1:3001';

export async function apiFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${DEFAULT_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
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
