import { z } from 'zod'
import { cuidSchema } from './request'

/** Component marks: absent means "not entered", not zero. */
const markSchema = z.coerce.number().min(0).max(100).nullish()

export const createResultSchema = z.object({
  enrollmentId: cuidSchema,
  assignmentMarks: markSchema,
  quizMarks: markSchema,
  midtermMarks: markSchema,
  finalMarks: markSchema,
  labMarks: markSchema,
  projectMarks: markSchema,
})

export const bulkResultsSchema = z.object({
  results: z
    .array(createResultSchema)
    .min(1, 'results array must not be empty')
    // Each row costs a write; an unbounded array is a denial-of-service vector.
    .max(500, 'At most 500 results can be submitted at once'),
})

export const publishResultsSchema = z.object({
  courseId: cuidSchema,
  semesterId: cuidSchema,
  section: z.string().max(40).optional(),
})
