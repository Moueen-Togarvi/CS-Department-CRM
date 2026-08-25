import { z } from 'zod'

export const classRoomAssignmentSchema = z.object({
  semester: z.coerce.number().int().min(1).max(8),
  section: z.string().min(1, 'Section is required').max(40),
  room: z.string().max(120).nullish(),
  roomId: z.string().nullish(),
  floor: z.coerce.number().int().nullish(),
})
