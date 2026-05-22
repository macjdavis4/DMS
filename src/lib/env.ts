/**
 * Centralised, validated access to environment variables.
 *
 * Importing process.env directly anywhere else is discouraged — go through
 * this module so a missing or malformed value fails loudly at startup
 * rather than silently at runtime.
 */
import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),

  NEXTAUTH_URL: z.string().url().default('http://localhost:3000'),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 chars (use `openssl rand -base64 48`)'),
  AUTH_TRUSTED_HOSTS: z.string().optional(),

  STORAGE_ROOT: z.string().default('./storage'),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(15 * 1024 * 1024),

  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),

  BACKUP_DIR: z.string().default('./backups'),
  BACKUP_RETENTION_DAYS: z.coerce.number().int().positive().default(30),

  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOGIN_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
  LOGIN_LOCKOUT_MINUTES: z.coerce.number().int().positive().default(15),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
})

function parse() {
  const result = schema.safeParse(process.env)
  if (!result.success) {
    const flat = result.error.flatten().fieldErrors
    const lines = Object.entries(flat).map(([k, v]) => `  - ${k}: ${(v ?? []).join('; ')}`)
    throw new Error(
      `Invalid environment configuration:\n${lines.join('\n')}\n\n` +
        `See .env.example for the full list of required variables.`
    )
  }
  return result.data
}

// Evaluate eagerly so misconfiguration crashes on boot, not on first request.
export const env = parse()
export type Env = typeof env
