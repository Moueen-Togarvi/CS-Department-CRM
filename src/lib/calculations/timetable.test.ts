import { describe, expect, it } from 'vitest'
import { getCompatibleSections, timeOverlaps } from './timetable'

describe('timeOverlaps', () => {
  it('detects a genuine clash', () => {
    expect(timeOverlaps('09:00', '10:30', '10:00', '11:00')).toBe(true)
    expect(timeOverlaps('09:00', '10:30', '09:00', '10:30')).toBe(true)
  })

  // Back-to-back classes are not a clash; this is the boundary that matters.
  it('treats touching slots as free', () => {
    expect(timeOverlaps('09:00', '10:00', '10:00', '11:00')).toBe(false)
    expect(timeOverlaps('10:00', '11:00', '09:00', '10:00')).toBe(false)
  })

  it('handles fully separate slots', () => {
    expect(timeOverlaps('09:00', '10:00', '14:00', '15:00')).toBe(false)
  })

  it('detects containment either way round', () => {
    expect(timeOverlaps('09:00', '12:00', '10:00', '11:00')).toBe(true)
    expect(timeOverlaps('10:00', '11:00', '09:00', '12:00')).toBe(true)
  })
})

describe('getCompatibleSections', () => {
  it('expands a shift-scoped section to its bare letter', () => {
    const r = getCompatibleSections('Morning A', null)
    expect(r).toContain('Morning A')
    expect(r).toContain('Morning')
    expect(r).toContain('A')
  })

  it('expands a bare letter using the session as the shift', () => {
    const r = getCompatibleSections('A', 'morning')
    expect(r).toContain('Morning A')
    expect(r).toContain('Morning')
  })

  it('expands a shift name to both its sections', () => {
    const r = getCompatibleSections('Evening', null)
    expect(r).toEqual(expect.arrayContaining(['Evening A', 'Evening B', 'A', 'B']))
  })

  it('returns nothing when the student has no section', () => {
    expect(getCompatibleSections(null, 'morning')).toEqual([])
  })

  it('never emits duplicates or blanks', () => {
    const r = getCompatibleSections('Morning A', 'morning')
    expect(new Set(r).size).toBe(r.length)
    expect(r).not.toContain('')
  })
})
