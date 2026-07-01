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

    // Verify the announcement exists and is published
    const announcement = await db.announcement.findUnique({ where: { id } })
    if (!announcement || !announcement.isPublished) {
      return errorResponse('Announcement not found', 404)
    }

    // Upsert read record (idempotent)
    const existing = await db.announcementRead.findUnique({
      where: {
        userId_announcementId: {
          userId: session.user.id,
          announcementId: id,
        },
      },
    })
    if (!existing) {
      await db.announcementRead.create({
        data: {
          userId: session.user.id,
          announcementId: id,
        },
      })
    }

    return successResponse({ ok: true })
  } catch (error) {
    return handleApiError(error, 'Failed to mark announcement as read')
  }
}
