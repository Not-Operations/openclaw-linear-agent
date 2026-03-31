import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { config } from './config.js';

const execFileAsync = promisify(execFile);

export interface OpenClawRunResult {
  text: string;
  raw: unknown;
  sessionId?: string;
  runId?: string;
}

function extractJsonBlob(text: string) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

export async function invokeOpenClaw(params: {
  message: string;
  sessionId?: string;
}): Promise<OpenClawRunResult> {
  const args = [
    'agent',
    '--agent',
    config.OPENCLAW_LINEAR_AGENT_ID,
    '--message',
    params.message,
    '--json',
    '--thinking',
    config.OPENCLAW_THINKING,
    '--timeout',
    String(config.OPENCLAW_TIMEOUT_SECONDS)
  ];

  if (params.sessionId) {
    args.push('--session-id', params.sessionId);
  }

  const { stdout, stderr } = await execFileAsync(config.OPENCLAW_BIN, args, {
    cwd: config.OPENCLAW_WORKDIR,
    timeout: config.OPENCLAW_TIMEOUT_SECONDS * 1000,
    maxBuffer: 5 * 1024 * 1024,
    env: process.env
  });

  const stdoutTrimmed = stdout.trim();
  const stderrTrimmed = stderr.trim();
  const candidate = stdoutTrimmed || extractJsonBlob(stderrTrimmed) || '';

  if (!candidate) {
    throw new Error(`OpenClaw returned no parseable JSON. stdout: ${stdoutTrimmed || '(empty)'} stderr: ${stderrTrimmed || '(empty)'}`);
  }

  let parsed: any;
  try {
    parsed = JSON.parse(candidate) as any;
  } catch {
    throw new Error(`OpenClaw returned non-JSON output. candidate: ${candidate.slice(0, 2000)} stderr: ${stderrTrimmed || '(empty)'}`);
  }

  const payloads = parsed?.result?.payloads ?? parsed?.payloads ?? [];
  const meta = parsed?.result?.meta ?? parsed?.meta ?? {};
  const text = payloads
    .map((p: any) => p?.text)
    .filter((v: unknown) => typeof v === 'string' && v.length > 0)
    .join('\n\n')
    .trim();

  return {
    text,
    raw: parsed,
    runId: parsed?.runId,
    sessionId: meta?.agentMeta?.sessionId
  };
}
