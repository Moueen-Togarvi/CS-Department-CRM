import { db } from '@/lib/db'
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api-response'
import { parsePaginationParams, skipTake } from '@/lib/pagination'
import { NextRequest } from 'next/server'
import { AnnouncementType } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pagination = parsePaginationParams(searchParams)
    const { skip, take } = skipTake(pagination.page!, pagination.limit!)

    const type = searchParams.get('type') as AnnouncementType | null
    const priority = searchParams.get('priority')
    const targetAudience = searchParams.get('targetAudience')
    const isPublished = searchParams.get('isPublished')

    const where: any = {}
    if (type) where.type = type
    if (priority) where.priority = parseInt(priority)
    if (targetAudience) where.targetAudience = targetAudience
    if (isPublished !== null && isPublished !== undefined && isPublished !== '') {
      where.isPublished = isPublished === 'true'
    }

    const [announcements, total] = await Promise.all([
      db.announcement.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip,
        take,
        include: {
          createdByUser: {
            select: { id: true, name: true },
          },
        },
      }),
      db.announcement.count({ where }),
    ])

    const data = announcements.map((a) => ({
      ...a,
      createdByName: a.createdByUser.name,
    }))

    return paginatedResponse(data, total, pagination.page!, pagination.limit!)
  } catch (error) {
    console.error('Announcements list error:', error)
    return errorResponse('Error loading announcements', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title,
      content,
      type = 'GENERAL',
      priority = 0,
      targetAudience = 'ALL',
      eventDate,
      eventLocation,
      isPublished = true,
      expiresAt,
    } = body

    if (!title || !content) {
      return errorResponse('Title and content are required')
    }

    // Get the first admin user as default creator
    const adminUser = await db.user.findFirst({ where: { role: 'ADMIN' } })
    const createdBy = adminUser?.id || 'system'

    const announcement = await db.announcement.create({
      data: {
        title,
        content,
        type,
        priority: Math.min(10, Math.max(1, priority)),
        targetAudience,
        eventDate: eventDate ? new Date(eventDate) : null,
        eventLocation: eventLocation || null,
        isPublished,
        publishedAt: isPublished ? new Date() : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy,
      },
      include: {
        createdByUser: { select: { id: true, name: true } },
      },
    })

    return successResponse(
      { ...announcement, createdByName: announcement.createdByUser.name },
      'Announcement created',
      201
    )
  } catch (error) {
    console.error('Create announcement error:', error)
    return errorResponse('Error creating announcement', 500)
  }
}