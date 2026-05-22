/**
 * Minimal in-memory rate limiter for login attempts.
 *
 * For a single-server, single-process office deployment this is sufficient.
 * If the app is ever scaled horizontally, swap the Map for Redis (e.g.
 * @upstash/ratelimit) — call sites won't change.
 */
import { env } from './env'

interface Bucket {
  count: number
  windowStart: number
  lockedUntil: number
}

const buckets = new Map<string, Bucket>()

export interface RateCheck {
  allowed: boolean
  remaining: number
  retryAfterMs: number
}

export function checkLoginRate(key: string): RateCheck {
  const now = Date.now()
  const windowMs = env.LOGIN_WINDOW_MINUTES * 60_000
  const lockoutMs = env.LOGIN_LOCKOUT_MINUTES * 60_000
  const max = env.LOGIN_MAX_ATTEMPTS

  let b = buckets.get(key)
  if (!b) {
    b = { count: 0, windowStart: now, lockedUntil: 0 }
    buckets.set(key, b)
  }

  if (b.lockedUntil > now) {
    return { allowed: false, remaining: 0, retryAfterMs: b.lockedUntil - now }
  }

  if (now - b.windowStart > windowMs) {
    b.count = 0
    b.windowStart = now
  }

  if (b.count >= max) {
    b.lockedUntil = now + lockoutMs
    return { allowed: false, remaining: 0, retryAfterMs: lockoutMs }
  }

  return { allowed: true, remaining: max - b.count, retryAfterMs: 0 }
}

export function recordLoginFailure(key: string): void {
  const now = Date.now()
  const b = buckets.get(key) ?? { count: 0, windowStart: now, lockedUntil: 0 }
  b.count += 1
  buckets.set(key, b)
}

export function recordLoginSuccess(key: string): void {
  buckets.delete(key)
}

// Test helper — never call from app code
export function _resetRateLimiter(): void {
  buckets.clear()
}
