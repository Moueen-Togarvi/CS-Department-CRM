import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'

export async function GET() {
  try {
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
    console.error('Upcoming events error:', error)
    return errorResponse('Error loading upcoming events', 500)
  }
}