import { z } from 'zod'
import { cuidSchema, timeOfDaySchema } from './request'

export const DAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const

export const SLOT_TYPES = ['THEORY', 'LAB', 'PROJECT'] as const

const baseTimetableSlot = z.object({
  courseId: cuidSchema,
  facultyId: cuidSchema,
  semesterId: cuidSchema,
  roomId: cuidSchema,
  section: z.string().min(1).max(40).default('A'),
  // Sunday is a valid enum value in the schema but not a teaching day here.
  day: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']),
  startTime: timeOfDaySchema,
  endTime: timeOfDaySchema,
  slotType: z.enum(SLOT_TYPES).default('THEORY'),
})

/** A slot must end after it starts, or conflict detection silently misbehaves. */
const endsAfterItStarts = (data: { startTime: string; endTime: string }) =>
  data.endTime > data.startTime

export const createTimetableSlotSchema = baseTimetableSlot.refine(endsAfterItStarts, {
  message: 'endTime must be later than startTime',
  path: ['endTime'],
})

export const updateTimetableSlotSchema = baseTimetableSlot
  .partial()
  .refine(
    (data) => !(data.startTime && data.endTime) || endsAfterItStarts(data as { startTime: string; endTime: string }),
    { message: 'endTime must be later than startTime', path: ['endTime'] }
  )
