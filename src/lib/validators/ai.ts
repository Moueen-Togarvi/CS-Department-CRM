import { z } from 'zod'

/** Entity kinds the AI prompts know how to describe. */
export const AI_ENTITY_TYPES = ['student', 'faculty', 'course'] as const

/** Free text is sent to an LLM, so the length cap is also a cost control. */
export const smartEntrySchema = z.object({
  text: z.string().min(1, 'text is required').max(5000),
  entityType: z.enum(AI_ENTITY_TYPES),
})

export const parseCsvSchema = z.object({
  csvText: z.string().min(1, 'csvText is required').max(200_000),
  entityType: z.enum(AI_ENTITY_TYPES),
})
