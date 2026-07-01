import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse } from '@/lib/api-response'
import { requireAuth, handleApiError } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const result = await db.notification.updateMany({
      where: { userId: session.user.id, isRead: false },
      data: { isRead: true },
    })
    return successResponse({ updated: result.count })
  } catch (error) {
    return handleApiError(error, 'Failed to mark all notifications')
  }
}
