import { z } from 'zod'
import { cuidSchema } from './request'

export const SLOT_TYPES = ['THEORY', 'LAB', 'PROJECT'] as const

export const createOfferingSchema = z.object({
  facultyId: cuidSchema,
  section: z.string().min(1, 'Section is required').max(40),
  semesterId: z.string().optional(),
  slotType: z.enum(SLOT_TYPES).default('THEORY'),
})
