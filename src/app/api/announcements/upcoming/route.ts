import { db } from '@/lib/db'
import { successResponse } from '@/lib/api-response'
import { requireAuth, handleApiError } from '@/lib/auth-utils'

export async function GET() {
  try {
    await requireAuth()
    const now = new Date()

    const events = await db.announcement.findMany({
      where: {
        type: 'EVENT',
        isPublished: true,
        eventDate: { gte: now },
      },
      orderBy: [{ eventDate: 'asc' }],
      take: 10,
      select: {
        id: true,
        title: true,
        content: true,
        eventDate: true,
        eventLocation: true,
        priority: true,
        targetAudience: true,
      },
    })

    return successResponse(events)
  } catch (error) {
    return handleApiError(error, 'Error loading upcoming events')
  }
}
