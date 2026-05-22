/**
 * Audit logging — every mutation against business entities should be recorded.
 * Use `recordAudit()` after a successful DB write inside server actions.
 *
 * Designed to never throw from the caller's perspective: audit failures are
 * logged and swallowed so they don't break the user-facing flow. Compliance
 * trade-off: we accept a missed log over a failed business operation, but
 * audit infrastructure is itself monitored.
 */
import { headers } from 'next/headers'
import { prisma } from './db'
import { logger } from './logger'
import type { AuditAction, Prisma } from '@prisma/client'

export interface AuditInput {
  action: AuditAction
  entityType: string
  entityId?: string | null
  changes?: Prisma.InputJsonValue
  userId?: string | null
}

async function getRequestMeta() {
  try {
    const h = await headers()
    // Trust x-forwarded-for only behind a known reverse proxy; here we accept
    // the first IP and let operators front the app with a trusted proxy.
    const xff = h.get('x-forwarded-for')
    const ip = xff?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null
    const ua = h.get('user-agent') ?? null
    return { ipAddress: ip, userAgent: ua }
  } catch {
    // headers() throws outside request scope (e.g. during background jobs)
    return { ipAddress: null, userAgent: null }
  }
}

export async function recordAudit(input: AuditInput): Promise<void> {
  const meta = await getRequestMeta()
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        changes: input.changes ?? undefined,
        userId: input.userId ?? null,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    })
  } catch (err) {
    logger.error({ err, input }, 'failed to write audit log')
  }
}

/**
 * Compute a shallow before/after diff suitable for storing in AuditLog.changes.
 * Excludes fields that change every write (timestamps) and any provided keys.
 */
export function diff<T extends Record<string, unknown>>(
  before: T,
  after: T,
  exclude: ReadonlyArray<keyof T> = ['updatedAt' as keyof T, 'createdAt' as keyof T]
): Record<string, { before: unknown; after: unknown }> {
  const excluded = new Set(exclude.map(String))
  const out: Record<string, { before: unknown; after: unknown }> = {}
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  for (const k of keys) {
    if (excluded.has(k)) continue
    const b = (before as Record<string, unknown>)[k]
    const a = (after as Record<string, unknown>)[k]
    if (JSON.stringify(b) !== JSON.stringify(a)) {
      out[k] = { before: b, after: a }
    }
  }
  return out
}
