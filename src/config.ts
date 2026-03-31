import 'dotenv/config';
import path from 'node:path';
import { z } from 'zod';

const boolish = z
  .string()
  .optional()
  .transform((value) => value === 'true');

const schema = z.object({
  LOG_LEVEL: z.string().default('info'),
  LINEAR_BRIDGE_PORT: z.coerce.number().default(3001),
  LINEAR_APP_BASE_URL: z.string().url().optional(),
  LINEAR_REDIRECT_URI: z.string().url().optional(),
  LINEAR_CLIENT_ID: z.string().default('replace_me'),
  LINEAR_CLIENT_SECRET: z.string().default('replace_me'),
  LINEAR_WEBHOOK_SECRET: z.string().default('replace_me'),
  LINEAR_OAUTH_SCOPES: z.string().default('read,write,app:mentionable,app:assignable'),
  LINEAR_STATE_SECRET: z.string().default('replace_me'),
  LINEAR_TOKEN_STORE_PATH: z.string().default('/home/kenny/.config/linear-agent/tokens.json'),
  OPENCLAW_BIN: z.string().default('openclaw'),
  OPENCLAW_LINEAR_AGENT_ID: z.string().default('project-manager'),
  OPENCLAW_WORKDIR: z.string().default('/home/kenny/.openclaw/workspace'),
  OPENCLAW_TIMEOUT_SECONDS: z.coerce.number().default(180),
  OPENCLAW_THINKING: z.enum(['off', 'minimal', 'low', 'medium', 'high', 'xhigh']).default('low'),
  POST_TO_LINEAR: boolish.default(false),
  ALLOW_AUTO_RUN: boolish.default(false),
  DATA_DIR: z.string().default('./data')
});

export const config = (() => {
  const parsed = schema.parse(process.env);
  return {
    ...parsed,
    PORT: parsed.LINEAR_BRIDGE_PORT,
    DATA_DIR: path.resolve(parsed.DATA_DIR),
    TOKEN_STORE_PATH: path.resolve(parsed.LINEAR_TOKEN_STORE_PATH)
  };
})();
