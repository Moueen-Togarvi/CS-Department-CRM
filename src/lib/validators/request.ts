import { z } from 'zod'
import { errorResponse } from '@/lib/api-response'

/**
 * Parse and validate a JSON request body.
 *
 * Returns either the typed data or a ready-to-return 400 response, so routes
 * can validate in one line without each inventing its own error shape:
 *
 *   const parsed = await parseBody(request, createTimetableSlotSchema)
 *   if (!parsed.ok) return parsed.response
 *   const { courseId } = parsed.data
 */
export async function parseBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
): Promise<
  { ok: true; data: z.infer<T> } | { ok: false; response: ReturnType<typeof errorResponse> }
> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return { ok: false, response: errorResponse('Request body must be valid JSON', 400) }
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const path = issue?.path.join('.')
    const message = path ? `${path}: ${issue.message}` : (issue?.message ?? 'Invalid input')
    return { ok: false, response: errorResponse(message, 400) }
  }

  return { ok: true, data: parsed.data }
}

/** 24-hour clock, as stored on Timetable.startTime / endTime. */
export const timeOfDaySchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Must be a 24-hour time like "09:30"')

export const cuidSchema = z.string().min(1, 'Required')
