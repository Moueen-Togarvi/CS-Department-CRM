import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  __clearRateLimits,
  clientIp,
  LOGIN_RATE_LIMIT,
  loginRateLimitKey,
  rateLimit,
  resetRateLimit,
} from './rate-limit'

const opts = { limit: 3, windowMs: 1000 }

beforeEach(() => {
  __clearRateLimits()
  vi.useRealTimers()
})

describe('rateLimit', () => {
  it('allows attempts up to the limit and blocks the next one', () => {
    expect(rateLimit('k', opts).allowed).toBe(true)
    expect(rateLimit('k', opts).allowed).toBe(true)
    expect(rateLimit('k', opts).allowed).toBe(true)
    expect(rateLimit('k', opts).allowed).toBe(false)
  })

  it('counts down the remaining allowance', () => {
    expect(rateLimit('k', opts).remaining).toBe(2)
    expect(rateLimit('k', opts).remaining).toBe(1)
    expect(rateLimit('k', opts).remaining).toBe(0)
  })

  it('keeps separate counters per key', () => {
    for (let i = 0; i < 3; i++) rateLimit('a', opts)
    expect(rateLimit('a', opts).allowed).toBe(false)
    expect(rateLimit('b', opts).allowed).toBe(true)
  })

  it('reports how long until the window resets', () => {
    for (let i = 0; i < 4; i++) rateLimit('k', opts)
    expect(rateLimit('k', opts).retryAfter).toBeGreaterThan(0)
  })

  it('lets attempts through again once the window expires', () => {
    vi.useFakeTimers()
    for (let i = 0; i < 3; i++) rateLimit('k', opts)
    expect(rateLimit('k', opts).allowed).toBe(false)

    vi.advanceTimersByTime(1001)
    expect(rateLimit('k', opts).allowed).toBe(true)
  })

  // A blocked attacker must not be able to extend their own lockout past the
  // window, nor shorten it by hammering.
  it('does not extend the window when blocked attempts keep arriving', () => {
    vi.useFakeTimers()
    for (let i = 0; i < 5; i++) rateLimit('k', opts)
    vi.advanceTimersByTime(600)
    for (let i = 0; i < 5; i++) rateLimit('k', opts)
    vi.advanceTimersByTime(500)
    expect(rateLimit('k', opts).allowed).toBe(true)
  })
})

describe('resetRateLimit', () => {
  it('clears the counter so a successful sign-in wipes earlier typos', () => {
    rateLimit('k', opts)
    rateLimit('k', opts)
    resetRateLimit('k')
    expect(rateLimit('k', opts).remaining).toBe(2)
  })
})

describe('loginRateLimitKey', () => {
  it('is keyed on both address and account', () => {
    expect(loginRateLimitKey('1.1.1.1', 'a@b.c')).not.toBe(loginRateLimitKey('2.2.2.2', 'a@b.c'))
    expect(loginRateLimitKey('1.1.1.1', 'a@b.c')).not.toBe(loginRateLimitKey('1.1.1.1', 'x@y.z'))
  })

  it('normalises the email so casing cannot bypass the limit', () => {
    expect(loginRateLimitKey('1.1.1.1', ' A@B.C ')).toBe(loginRateLimitKey('1.1.1.1', 'a@b.c'))
  })
})

describe('clientIp', () => {
  it('takes the first hop from x-forwarded-for', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' }))).toBe('203.0.113.5')
  })

  it('falls back to x-real-ip, then a shared bucket', () => {
    expect(clientIp(new Headers({ 'x-real-ip': '198.51.100.7' }))).toBe('198.51.100.7')
    expect(clientIp(new Headers())).toBe('unknown')
  })
})

describe('LOGIN_RATE_LIMIT', () => {
  it('is strict enough to matter and loose enough for a real user', () => {
    expect(LOGIN_RATE_LIMIT.limit).toBeLessThanOrEqual(10)
    expect(LOGIN_RATE_LIMIT.windowMs).toBeGreaterThanOrEqual(5 * 60 * 1000)
  })
})
