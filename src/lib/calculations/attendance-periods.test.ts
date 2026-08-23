import { describe, expect, it } from 'vitest'
import {
  attendancePercentage,
  bucketLabel,
  bucketStart,
  isGranularity,
} from './attendance-periods'

const utc = (iso: string) => new Date(iso)
const ymd = (d: Date) => d.toISOString().slice(0, 10)

describe('bucketStart — weekly', () => {
  it('snaps every weekday back to its Monday', () => {
    // Mon 3 Feb 2025 through Sun 9 Feb 2025 all belong to the same week.
    for (const day of ['03', '04', '05', '06', '07', '08', '09']) {
      expect(ymd(bucketStart(utc(`2025-02-${day}T12:00:00Z`), 'weekly'))).toBe('2025-02-03')
    }
  })

  // Sunday is day 0, which is the classic off-by-one in Monday-start weeks.
  it('puts Sunday in the week that just ended, not the one starting', () => {
    expect(ymd(bucketStart(utc('2025-02-09T23:59:00Z'), 'weekly'))).toBe('2025-02-03')
    expect(ymd(bucketStart(utc('2025-02-10T00:00:00Z'), 'weekly'))).toBe('2025-02-10')
  })

  it('handles a week spanning a month boundary', () => {
    // Sat 1 Mar 2025 belongs to the week beginning Mon 24 Feb.
    expect(ymd(bucketStart(utc('2025-03-01T09:00:00Z'), 'weekly'))).toBe('2025-02-24')
  })

  it('handles a week spanning a year boundary', () => {
    // Wed 1 Jan 2025 belongs to the week beginning Mon 30 Dec 2024.
    expect(ymd(bucketStart(utc('2025-01-01T09:00:00Z'), 'weekly'))).toBe('2024-12-30')
  })
})

describe('bucketStart — daily and monthly', () => {
  it('strips the time for daily', () => {
    const b = bucketStart(utc('2025-02-05T17:45:12Z'), 'daily')
    expect(ymd(b)).toBe('2025-02-05')
    expect(b.getUTCHours()).toBe(0)
  })

  it('snaps to the first of the month', () => {
    expect(ymd(bucketStart(utc('2025-02-28T23:00:00Z'), 'monthly'))).toBe('2025-02-01')
    expect(ymd(bucketStart(utc('2024-02-29T00:00:00Z'), 'monthly'))).toBe('2024-02-01')
  })

  // Records are stored at 04:00Z; local-time maths would move them a day.
  it('does not drift for early-morning UTC timestamps', () => {
    expect(ymd(bucketStart(utc('2025-02-03T04:00:00Z'), 'daily'))).toBe('2025-02-03')
    expect(ymd(bucketStart(utc('2025-02-03T00:00:00Z'), 'daily'))).toBe('2025-02-03')
  })
})

describe('bucketLabel', () => {
  it('labels each granularity in its own units', () => {
    const start = utc('2025-02-03T00:00:00Z')
    expect(bucketLabel(start, 'daily')).toBe('Mon, Feb 3')
    expect(bucketLabel(start, 'weekly')).toBe('Feb 3 – Feb 9')
    expect(bucketLabel(start, 'monthly')).toBe('February 2025')
  })

  it('spans months in a weekly label', () => {
    expect(bucketLabel(utc('2025-02-24T00:00:00Z'), 'weekly')).toBe('Feb 24 – Mar 2')
  })
})

describe('attendancePercentage', () => {
  it('rounds to a whole percent', () => {
    expect(attendancePercentage({ present: 1, total: 3 })).toBe(33)
    expect(attendancePercentage({ present: 2, total: 3 })).toBe(67)
    expect(attendancePercentage({ present: 23, total: 25 })).toBe(92)
  })

  it('returns 0 instead of NaN when no classes were held', () => {
    expect(attendancePercentage({ present: 0, total: 0 })).toBe(0)
  })

  it('handles the extremes', () => {
    expect(attendancePercentage({ present: 0, total: 10 })).toBe(0)
    expect(attendancePercentage({ present: 10, total: 10 })).toBe(100)
  })
})

describe('isGranularity', () => {
  it('accepts only the three known values', () => {
    expect(isGranularity('daily')).toBe(true)
    expect(isGranularity('weekly')).toBe(true)
    expect(isGranularity('monthly')).toBe(true)
    expect(isGranularity('yearly')).toBe(false)
    expect(isGranularity(null)).toBe(false)
  })
})
