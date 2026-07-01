import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { requireAuth, requireRole, handleApiError } from '@/lib/auth-utils'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params
    const announcement = await db.announcement.findUnique({
      where: { id },
      include: {
        createdByUser: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    })

    if (!announcement) {
      return errorResponse('Announcement not found', 404)
    }

    return successResponse({
      ...announcement,
      createdByName: announcement.createdByUser.name,
    })
  } catch (error) {
    return handleApiError(error, 'Error loading announcement')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole('ADMIN')
    const { id } = await params
    const body = await request.json()
    const {
      title,
      content,
      type,
      priority,
      targetAudience,
      targetCourseId,
      targetSemester,
      targetSection,
      eventDate,
      eventLocation,
      isPublished,
      expiresAt,
    } = body

    const existing = await db.announcement.findUnique({ where: { id } })
    if (!existing) {
      return errorResponse('Announcement not found', 404)
    }

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    if (type !== undefined) updateData.type = type
    if (priority !== undefined) updateData.priority = Math.min(10, Math.max(0, priority))
    if (targetAudience !== undefined) updateData.targetAudience = targetAudience
    if (targetCourseId !== undefined) updateData.targetCourseId = targetCourseId || null
    if (targetSemester !== undefined) updateData.targetSemester = targetSemester ? Number(targetSemester) : null
    if (targetSection !== undefined) updateData.targetSection = targetSection || null
    if (eventDate !== undefined) updateData.eventDate = eventDate ? new Date(eventDate) : null
    if (eventLocation !== undefined) updateData.eventLocation = eventLocation
    if (isPublished !== undefined) {
      updateData.isPublished = isPublished
      if (isPublished && !existing.publishedAt) {
        updateData.publishedAt = new Date()
      }
    }
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null

    const announcement = await db.announcement.update({
      where: { id },
      data: updateData,
      include: {
        createdByUser: { select: { id: true, name: true } },
      },
    })

    return successResponse({
      ...announcement,
      createdByName: announcement.createdByUser.name,
    })
  } catch (error) {
    return handleApiError(error, 'Error updating announcement')
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole('ADMIN')
    const { id } = await params
    const existing = await db.announcement.findUnique({ where: { id } })
    if (!existing) {
      return errorResponse('Announcement not found', 404)
    }

    await db.announcement.delete({ where: { id } })
    return successResponse(null, 'Announcement deleted')
  } catch (error) {
    return handleApiError(error, 'Error deleting announcement')
  }
}
