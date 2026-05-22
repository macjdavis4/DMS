import { describe, it, expect, beforeEach } from 'vitest'

describe('rate limiter', () => {
  beforeEach(async () => {
    const { _resetRateLimiter } = await import('@/lib/rate-limit')
    _resetRateLimiter()
  })

  it('allows up to LOGIN_MAX_ATTEMPTS then locks out', async () => {
    process.env.LOGIN_MAX_ATTEMPTS = '3'
    process.env.LOGIN_WINDOW_MINUTES = '15'
    process.env.LOGIN_LOCKOUT_MINUTES = '15'
    // re-import to pick up env (the module reads env at construction)
    const { checkLoginRate, recordLoginFailure, _resetRateLimiter } = await import('@/lib/rate-limit')
    _resetRateLimiter()

    const key = 'user@example.com'
    for (let i = 0; i < 3; i++) {
      expect(checkLoginRate(key).allowed).toBe(true)
      recordLoginFailure(key)
    }
    const blocked = checkLoginRate(key)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterMs).toBeGreaterThan(0)
  })
})
