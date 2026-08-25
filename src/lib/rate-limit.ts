/**
 * Fixed-window rate limiter for credential endpoints.
 *
 * Deliberately in-memory: this app runs as a single Next process, and the goal
 * is to stop online password guessing, not to survive a distributed attack. On
 * a multi-instance deploy each instance keeps its own counters, which weakens
 * the limit proportionally — move the store to Redis before scaling out.
 */

interface Window {
  count: number
  /** Epoch ms when this window expires and the count resets. */
  resetAt: number
}

const windows = new Map<string, Window>()

/** Stop the map growing without bound on a long-running process. */
function sweep(now: number) {
  if (windows.size < 5000) return
  for (const [key, w] of windows) {
    if (w.resetAt <= now) windows.delete(key)
  }
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  /** Seconds until the window resets — surfaced as Retry-After. */
  retryAfter: number
}

export interface RateLimitOptions {
  /** Attempts permitted per window. */
  limit: number
  /** Window length in milliseconds. */
  windowMs: number
}

/**
 * Count one attempt against `key`. Call this on *every* attempt; call
 * {@link resetRateLimit} on success so a legitimate user isn't penalised for
 * earlier typos.
 */
export function rateLimit(key: string, { limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  sweep(now)

  const existing = windows.get(key)
  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, retryAfter: 0 }
  }

  existing.count++
  const retryAfter = Math.ceil((existing.resetAt - now) / 1000)

  if (existing.count > limit) {
    return { allowed: false, remaining: 0, retryAfter }
  }
  return { allowed: true, remaining: limit - existing.count, retryAfter }
}

/** Clear the counter for a key, e.g. after a successful sign-in. */
export function resetRateLimit(key: string): void {
  windows.delete(key)
}

/** Test seam — not used in application code. */
export function __clearRateLimits(): void {
  windows.clear()
}

/**
 * Five attempts per 15 minutes. Slow enough to make guessing impractical,
 * generous enough that a person mistyping their password isn't locked out.
 */
export const LOGIN_RATE_LIMIT: RateLimitOptions = {
  limit: 5,
  windowMs: 15 * 60 * 1000,
}

/**
 * Build the counter key. Keyed on IP *and* account so that one attacker cannot
 * lock every user out, and one targeted account cannot be hammered from a
 * single address.
 */
export function loginRateLimitKey(ip: string, email: string): string {
  return `login:${ip}:${email.trim().toLowerCase()}`
}

/** Best-effort client IP from proxy headers, falling back to a shared bucket. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return headers.get('x-real-ip') ?? 'unknown'
}
