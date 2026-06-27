import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    console.error('Announcement detail error:', error)
    return errorResponse('Error loading announcement', 500)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      title,
      content,
      type,
      priority,
      targetAudience,
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
    if (priority !== undefined) updateData.priority = Math.min(10, Math.max(1, priority))
    if (targetAudience !== undefined) updateData.targetAudience = targetAudience
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
    console.error('Update announcement error:', error)
    return errorResponse('Error updating announcement', 500)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = await db.announcement.findUnique({ where: { id } })
    if (!existing) {
      return errorResponse('Announcement not found', 404)
    }

    await db.announcement.delete({ where: { id } })
    return successResponse(null, 'Announcement deleted')
  } catch (error) {
    console.error('Delete announcement error:', error)
    return errorResponse('Error deleting announcement', 500)
  }
}