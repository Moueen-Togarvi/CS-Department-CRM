import { describe, expect, it } from 'vitest'
import { resolveTermForDate } from './semester'

describe('resolveTermForDate', () => {
  it('picks Spring for January through May', () => {
    expect(resolveTermForDate(new Date(2026, 0, 15)).type).toBe('SPRING')
    expect(resolveTermForDate(new Date(2026, 4, 31)).type).toBe('SPRING')
  })

  it('picks Summer for June and July', () => {
    expect(resolveTermForDate(new Date(2026, 5, 1)).type).toBe('SUMMER')
    expect(resolveTermForDate(new Date(2026, 6, 31)).type).toBe('SUMMER')
  })

  it('picks Fall for August through December', () => {
    expect(resolveTermForDate(new Date(2026, 7, 1)).type).toBe('FALL')
    expect(resolveTermForDate(new Date(2026, 11, 31)).type).toBe('FALL')
  })

  it('names the term with its calendar year', () => {
    expect(resolveTermForDate(new Date(2026, 7, 25)).name).toBe('Fall 2026')
    expect(resolveTermForDate(new Date(2027, 1, 1)).name).toBe('Spring 2027')
  })

  it('keeps the start date before the end date', () => {
    for (const month of [0, 5, 7]) {
      const term = resolveTermForDate(new Date(2026, month, 1))
      expect(term.startDate.getTime()).toBeLessThan(term.endDate.getTime())
    }
  })
})
