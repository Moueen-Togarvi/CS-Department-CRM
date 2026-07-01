import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { requireAuth, handleApiError } from '@/lib/auth-utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params

    // Ensure the notification belongs to the user
    const notif = await db.notification.findUnique({ where: { id } })
    if (!notif || notif.userId !== session.user.id) {
      return errorResponse('Notification not found', 404)
    }

    const updated = await db.notification.update({
      where: { id },
      data: { isRead: true },
    })
    return successResponse(updated)
  } catch (error) {
    return handleApiError(error, 'Failed to mark notification')
  }
}
