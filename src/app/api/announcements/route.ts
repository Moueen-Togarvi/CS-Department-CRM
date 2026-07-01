import { db } from '@/lib/db'
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api-response'
import { parsePaginationParams, skipTake } from '@/lib/pagination'
import { NextRequest } from 'next/server'
import { AnnouncementType } from '@prisma/client'
import { requireAuth, requireRole, handleApiError, getSelfStudentId } from '@/lib/auth-utils'
import { notifyRole, notifySemesterSection } from '@/lib/notifications'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)
    const pagination = parsePaginationParams(searchParams)
    const { skip, take } = skipTake(pagination.page!, pagination.limit!)

    const type = searchParams.get('type') as AnnouncementType | null
    const priority = searchParams.get('priority')
    const targetAudience = searchParams.get('targetAudience')

    const where: any = {}

    // Type / priority / audience filters from query params
    if (type) where.type = type
    if (priority) where.priority = parseInt(priority)
    if (targetAudience) where.targetAudience = targetAudience

    // Role-based access control
    if (session.user.role !== 'ADMIN') {
      where.isPublished = true

      if (session.user.role === 'STUDENT') {
        // Students see: ALL, STUDENT-targeted, their semester/section, their courses
        const studentId = await getSelfStudentId(session.user.id)
        const student = studentId
          ? await db.student.findUnique({
              where: { id: studentId },
              select: { currentSemester: true, section: true },
            })
          : null

        where.OR = [
          { targetAudience: 'ALL' },
          { targetAudience: 'STUDENTS' },
        ]
        if (student) {
          where.OR.push({ targetSemester: student.currentSemester })
          if (student.section) {
            where.OR.push({ targetSemester: student.currentSemester, targetSection: student.section })
          }
        }
      } else if (session.user.role === 'FACULTY') {
        // Faculty sees: ALL, FACULTY-targeted
        where.OR = [
          { targetAudience: 'ALL' },
          { targetAudience: 'FACULTY' },
        ]
      }
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
          reads: session.user.role !== 'ADMIN' ? {
            where: { userId: session.user.id },
            select: { id: true },
          } : false,
        },
      }),
      db.announcement.count({ where }),
    ])

    const data = announcements.map((a) => {
      const { reads, ...rest } = a as any
      return {
        ...rest,
        createdByName: a.createdByUser.name,
        isRead: reads && reads.length > 0,
      }
    })

    return paginatedResponse(data, total, pagination.page!, pagination.limit!)
  } catch (error) {
    return handleApiError(error, 'Error loading announcements')
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('ADMIN')
    const body = await request.json()
    const {
      title,
      content,
      type = 'GENERAL',
      priority = 0,
      targetAudience = 'ALL',
      targetCourseId,
      targetSemester,
      targetSection,
      eventDate,
      eventLocation,
      isPublished = true,
      expiresAt,
    } = body

    if (!title || !content) {
      return errorResponse('Title and content are required')
    }

    const announcement = await db.announcement.create({
      data: {
        title,
        content,
        type,
        priority: Math.min(10, Math.max(0, priority)),
        targetAudience,
        targetCourseId: targetCourseId || null,
        targetSemester: targetSemester ? Number(targetSemester) : null,
        targetSection: targetSection || null,
        eventDate: eventDate ? new Date(eventDate) : null,
        eventLocation: eventLocation || null,
        isPublished,
        publishedAt: isPublished ? new Date() : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: session.user.id,
      },
      include: {
        createdByUser: { select: { id: true, name: true } },
      },
    })

    // Trigger notifications based on target audience
    if (isPublished) {
      const notifData = {
        type: 'ANNOUNCEMENT',
        title: `New: ${title}`,
        message: content.slice(0, 120) + (content.length > 120 ? '...' : ''),
        linkUrl: '/announcements',
      }
      if (targetAudience === 'ALL') {
        await notifyRole('STUDENT', notifData)
        await notifyRole('FACULTY', notifData)
      } else if (targetAudience === 'STUDENTS') {
        await notifyRole('STUDENT', notifData)
      } else if (targetAudience === 'FACULTY') {
        await notifyRole('FACULTY', notifData)
      } else if (targetSemester) {
        await notifySemesterSection(targetSemester, targetSection || null, notifData)
      }
    }

    return successResponse(
      { ...announcement, createdByName: announcement.createdByUser.name },
      'Announcement created',
      201
    )
  } catch (error) {
    return handleApiError(error, 'Error creating announcement')
  }
}
