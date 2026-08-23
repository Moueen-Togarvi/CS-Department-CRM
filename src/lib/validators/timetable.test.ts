import { describe, expect, it } from 'vitest'
import { createTimetableSlotSchema, updateTimetableSlotSchema } from './timetable'

const valid = {
  courseId: 'c1',
  facultyId: 'f1',
  semesterId: 's1',
  roomId: 'r1',
  day: 'MONDAY',
  startTime: '09:00',
  endTime: '10:30',
}

describe('createTimetableSlotSchema', () => {
  it('accepts a well-formed slot and applies defaults', () => {
    const parsed = createTimetableSlotSchema.parse(valid)
    expect(parsed.section).toBe('A')
    expect(parsed.slotType).toBe('THEORY')
  })

  // These strings feed the overlap maths; a bad one made conflict detection
  // silently wrong rather than rejecting the request.
  it('rejects malformed times', () => {
    for (const bad of ['9:00', '25:00', '09:60', 'morning', '', '09-00']) {
      expect(createTimetableSlotSchema.safeParse({ ...valid, startTime: bad }).success).toBe(false)
    }
  })

  it('rejects a slot that ends before it starts', () => {
    const r = createTimetableSlotSchema.safeParse({ ...valid, startTime: '11:00', endTime: '10:00' })
    expect(r.success).toBe(false)
  })

  it('rejects a zero-length slot', () => {
    expect(
      createTimetableSlotSchema.safeParse({ ...valid, startTime: '10:00', endTime: '10:00' }).success
    ).toBe(false)
  })

  it('rejects Sunday and unknown days', () => {
    expect(createTimetableSlotSchema.safeParse({ ...valid, day: 'SUNDAY' }).success).toBe(false)
    expect(createTimetableSlotSchema.safeParse({ ...valid, day: 'FUNDAY' }).success).toBe(false)
  })

  it('requires every foreign key', () => {
    for (const key of ['courseId', 'facultyId', 'semesterId', 'roomId']) {
      const body = { ...valid, [key]: '' }
      expect(createTimetableSlotSchema.safeParse(body).success).toBe(false)
    }
  })
})

describe('updateTimetableSlotSchema', () => {
  it('allows a partial update', () => {
    expect(updateTimetableSlotSchema.safeParse({ roomId: 'r2' }).success).toBe(true)
  })

  it('still checks ordering when both times are present', () => {
    expect(
      updateTimetableSlotSchema.safeParse({ startTime: '11:00', endTime: '10:00' }).success
    ).toBe(false)
  })

  it('does not trip the ordering check when only one time changes', () => {
    expect(updateTimetableSlotSchema.safeParse({ startTime: '11:00' }).success).toBe(true)
  })
})
