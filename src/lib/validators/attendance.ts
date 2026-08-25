import { z } from 'zod'
import { cuidSchema } from './request'

export const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as const

export const bulkAttendanceSchema = z.object({
  courseId: cuidSchema,
  semesterId: cuidSchema,
  date: z.coerce.date(),
  records: z
    .array(
      z.object({
        studentId: cuidSchema,
        status: z.enum(ATTENDANCE_STATUSES),
        remarks: z.string().max(500).optional(),
      })
    )
    .min(1, 'records array must not be empty')
    .max(500, 'At most 500 records can be submitted at once'),
})
