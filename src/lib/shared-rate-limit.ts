import { createHash } from 'node:crypto'
import { db } from '@/lib/db'
import type { RateLimitOptions, RateLimitResult } from '@/lib/rate-limit'

let cleanupCounter = 0

function storageKey(key: string) {
  return createHash('sha256').update(key).digest('hex')
}

export async function sharedRateLimit(key: string, { limit, windowMs }: RateLimitOptions): Promise<RateLimitResult> {
  const hashedKey = storageKey(key)
  const rows = await db.$queryRaw<Array<{ count: number; resetAt: Date }>>`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
    VALUES (${hashedKey}, 1, NOW() + (${windowMs} * INTERVAL '1 millisecond'))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimitBucket"."resetAt" <= NOW() THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= NOW() THEN NOW() + (${windowMs} * INTERVAL '1 millisecond') ELSE "RateLimitBucket"."resetAt" END
    RETURNING "count", "resetAt"
  `
  const bucket = rows[0]
  cleanupCounter = (cleanupCounter + 1) % 128
  if (cleanupCounter === 0) {
    void db.rateLimitBucket.deleteMany({ where: { resetAt: { lte: new Date() } } }).catch(() => undefined)
  }
  const retryAfter = Math.max(0, Math.ceil((bucket.resetAt.getTime() - Date.now()) / 1000))
  return { allowed: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count), retryAfter }
}

export async function resetSharedRateLimit(key: string) {
  await db.rateLimitBucket.deleteMany({ where: { key: storageKey(key) } })
}
