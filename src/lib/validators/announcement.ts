import { z } from 'zod'

// Mirrors the AnnouncementType enum in prisma/schema.prisma.
export const ANNOUNCEMENT_TYPES = ['NOTICE', 'EVENT', 'SEMINAR', 'URGENT', 'GENERAL'] as const

const base = z.object({
  title: z.string().min(1, 'Title is required').max(300),
  content: z.string().min(1, 'Content is required').max(20000),
  type: z.enum(ANNOUNCEMENT_TYPES).default('GENERAL'),
  // Rendered as a sort key and a badge; an arbitrary integer breaks both.
  priority: z.coerce.number().int().min(0).max(3).default(0),
  targetAudience: z.string().max(40).default('ALL'),
  targetCourseId: z.string().nullish(),
  targetSemester: z.coerce.number().int().min(1).max(8).nullish(),
  targetSection: z.string().max(40).nullish(),
  eventDate: z.coerce.date().nullish(),
  eventLocation: z.string().max(200).nullish(),
  isPublished: z.boolean().default(true),
  expiresAt: z.coerce.date().nullish(),
})

export const createAnnouncementSchema = base
export const updateAnnouncementSchema = base.partial()
