import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse } from '@/lib/api-response'
import { requireAuth, handleApiError } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const count = await db.notification.count({
      where: { userId: session.user.id, isRead: false },
    })
    return successResponse({ count })
  } catch (error) {
    return handleApiError(error, 'Failed to fetch unread count')
  }
}
