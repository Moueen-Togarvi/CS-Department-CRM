import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse } from '@/lib/api-response'
import { requireAuth, handleApiError, getSelfStudentId } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()

    // Build the same role-based filter as the list endpoint
    const where: any = { isPublished: true }

    if (session.user.role === 'STUDENT') {
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
      where.OR = [
        { targetAudience: 'ALL' },
        { targetAudience: 'FACULTY' },
      ]
    } else {
      // Admin — no publish filter needed; they see everything
      delete where.isPublished
    }

    // Count announcements the user hasn't read yet
    const visibleAnnouncements = await db.announcement.findMany({
      where,
      select: { id: true },
    })

    const visibleIds = visibleAnnouncements.map((a) => a.id)
    if (visibleIds.length === 0) {
      return successResponse({ count: 0 })
    }

    const readIds = await db.announcementRead.findMany({
      where: { userId: session.user.id, announcementId: { in: visibleIds } },
      select: { announcementId: true },
    })
    const readSet = new Set(readIds.map((r) => r.announcementId))
    const unreadCount = visibleIds.filter((id) => !readSet.has(id)).length

    return successResponse({ count: unreadCount })
  } catch (error) {
    return handleApiError(error, 'Failed to fetch unread count')
  }
}
