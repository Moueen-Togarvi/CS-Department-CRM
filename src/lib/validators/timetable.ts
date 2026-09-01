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

/** Renames a whole timetable column, moving every slot that starts at oldStartTime to newStartTime. */
export const shiftTimeColumnSchema = z
  .object({
    semesterId: cuidSchema,
    oldStartTime: timeOfDaySchema,
    newStartTime: timeOfDaySchema,
    section: z.string().min(1).max(40).optional(),
    academicSemester: z.string().optional(),
    facultyId: cuidSchema.optional(),
    roomId: cuidSchema.optional(),
    shift: z.string().optional(),
  })
  .refine((data) => data.newStartTime !== data.oldStartTime, {
    message: 'newStartTime must differ from oldStartTime',
    path: ['newStartTime'],
  })

/** Marks or clears a weekday as having no classes for one semester/section. */
export const dayOffSchema = z.object({
  semesterId: cuidSchema,
  section: z.string().min(1).max(40),
  day: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']),
})

/** Deletes every slot starting at a given time, scoped like shiftTimeColumnSchema. */
export const removeTimeColumnSchema = z.object({
  semesterId: cuidSchema,
  startTime: timeOfDaySchema,
  section: z.string().min(1).max(40).optional(),
  academicSemester: z.string().optional(),
  facultyId: cuidSchema.optional(),
  roomId: cuidSchema.optional(),
  shift: z.string().optional(),
})
