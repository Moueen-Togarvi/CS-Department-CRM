import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse } from '@/lib/api-response'
import { requireAuth, handleApiError } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)
    const onlyUnread = searchParams.get('unread') === 'true'

    const notifications = await db.notification.findMany({
      where: { userId: session.user.id, ...(onlyUnread ? { isRead: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return successResponse(notifications)
  } catch (error) {
    return handleApiError(error, 'Failed to fetch notifications')
  }
}
