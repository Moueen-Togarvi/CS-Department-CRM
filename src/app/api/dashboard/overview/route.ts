import { db } from '@/lib/db'
import { successResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const now = new Date()

    // Run all count queries in parallel
    const [
      totalStudents,
      totalFaculty,
      totalCourses,
      totalAnnouncements,
      activeSemester,
      currentSemesterEnrollments,
      upcomingEvents,
    ] = await Promise.all([
      db.student.count(),
      db.faculty.count(),
      db.course.count({ where: { isActive: true } }),
      db.announcement.count({ where: { isPublished: true } }),
      db.semester.findFirst({ where: { isCurrent: true } }),
      db.semester.findFirst({
        where: { isCurrent: true },
        select: {
          id: true,
          _count: { select: { enrollments: true } },
        },
      }),
      db.announcement.findMany({
        where: {
          isPublished: true,
          eventDate: { gte: now },
        },
        orderBy: [{ priority: 'desc' }, { eventDate: 'asc' }],
        take: 5,
        select: {
          id: true,
          title: true,
          type: true,
          eventDate: true,
          eventLocation: true,
          content: true,
        },
      }),
    ])

    return successResponse({
      totalStudents,
      totalFaculty,
      totalCourses,
      totalAnnouncements,
      activeSemester: activeSemester
        ? {
            id: activeSemester.id,
            name: activeSemester.name,
          }
        : null,
      currentSemesterStudents: currentSemesterEnrollments?._count.enrollments ?? 0,
      upcomingEvents: upcomingEvents.map((e) => ({
        id: e.id,
        title: e.title,
        type: e.type,
        eventDate: e.eventDate?.toISOString() ?? null,
        eventLocation: e.eventLocation,
      })),
    })
  } catch (error) {
    console.error('Dashboard overview error:', error)
    return successResponse(
      { error: 'Failed to load dashboard data' },
      'Error loading dashboard data',
      500
    )
  }
}
