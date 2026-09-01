import { NextRequest } from 'next/server'
import { parseBody } from '@/lib/validators/request'
import { dayOffSchema } from '@/lib/validators/timetable'
import { db } from '@/lib/db'
import { successResponse } from '@/lib/api-response'
import { requireAdmin, handleApiError } from '@/lib/auth-utils'

/** Marks one weekday as having no classes for a semester/section combination. */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const parsed = await parseBody(request, dayOffSchema)
    if (!parsed.ok) return parsed.response
    const { semesterId, section, day } = parsed.data

    await db.timetableDayOff.upsert({
      where: { semesterId_section_day: { semesterId, section, day } },
      create: { semesterId, section, day },
      update: {},
    })

    return successResponse({ semesterId, section, day }, 'Day marked as off')
  } catch (error) {
    return handleApiError(error, 'Failed to mark day off')
  }
}

/** Clears a day-off mark, restoring the weekday to normal for that semester/section. */
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin()
    const parsed = await parseBody(request, dayOffSchema)
    if (!parsed.ok) return parsed.response
    const { semesterId, section, day } = parsed.data

    await db.timetableDayOff.deleteMany({ where: { semesterId, section, day } })

    return successResponse({ semesterId, section, day }, 'Day off cleared')
  } catch (error) {
    return handleApiError(error, 'Failed to clear day off')
  }
}
