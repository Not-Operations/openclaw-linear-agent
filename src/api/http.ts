import type { ZodSchema } from 'zod';
import { ZodError } from 'zod';
import { formatZodError } from '../contracts/validation.js';

export function parseOrThrow<T>(schema: ZodSchema<T>, input: unknown): T {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof ZodError) {
      const details = formatZodError(error);
      const message = details.map((d) => `${d.path || 'root'}: ${d.message}`).join('; ');
      const out = new Error(message || 'Invalid request');
      (out as any).statusCode = 400;
      (out as any).details = details;
      throw out;
    }
    throw error;
  }
}

export function sendError(res: any, error: any) {
  const status = error?.statusCode || 500;
  res.status(status).json({
    ok: false,
    error: error?.message ?? String(error),
    details: error?.details
  });
}
