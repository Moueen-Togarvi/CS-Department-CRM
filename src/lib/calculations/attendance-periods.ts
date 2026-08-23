/**
 * Period bucketing for attendance reporting.
 *
 * Extracted from the dashboard route so it can be tested directly — the
 * week-start maths and the UTC handling are easy to get subtly wrong and the
 * numbers feed straight into what staff see.
 */

export type Granularity = 'daily' | 'weekly' | 'monthly'

export const GRANULARITIES: Granularity[] = ['daily', 'weekly', 'monthly']

export function isGranularity(value: string | null): value is Granularity {
  return value !== null && (GRANULARITIES as string[]).includes(value)
}

// Everything is computed in UTC so results never shift with the server's timezone.
const dayFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const weekdayFmt = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})
const monthFmt = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

/** Start of the period containing `date`. Weeks start on Monday. */
export function bucketStart(date: Date, granularity: Granularity): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  if (granularity === 'monthly') {
    d.setUTCDate(1)
    return d
  }
  if (granularity === 'weekly') {
    const day = d.getUTCDay() // 0 = Sunday
    d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1)) // back to Monday
  }
  return d
}

/** Human label for a period, e.g. "Mon, Feb 3" or "Feb 3 – Feb 9". */
export function bucketLabel(start: Date, granularity: Granularity): string {
  if (granularity === 'monthly') return monthFmt.format(start)
  if (granularity === 'daily') return weekdayFmt.format(start)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 6)
  return `${dayFmt.format(start)} – ${dayFmt.format(end)}`
}

export interface AttendanceCounts {
  present: number
  total: number
}

/** Whole-number attendance rate. A period with no classes reads as 0, not NaN. */
export function attendancePercentage({ present, total }: AttendanceCounts): number {
  return total > 0 ? Math.round((present / total) * 100) : 0
}
