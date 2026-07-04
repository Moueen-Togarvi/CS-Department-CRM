import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse } from '@/lib/api-response'
import { handleApiError, requireAdmin } from '@/lib/auth-utils'

/**
 * Admin-only: returns all course assignments (CourseOfferings) filtered by
 * semesterOffered (1-8), plus the full list of active courses and faculty.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)

    const semesterOffered = searchParams.get('semesterOffered')
      ? parseInt(searchParams.get('semesterOffered')!, 10)
      : undefined

    const courseWhere: Record<string, unknown> = { isActive: true }
    if (semesterOffered && semesterOffered >= 1 && semesterOffered <= 8) {
      courseWhere.semesterOffered = semesterOffered
    }

    const [courses, faculty] = await Promise.all([
      db.course.findMany({
        where: courseWhere,
        select: {
          id: true,
          code: true,
          name: true,
          courseType: true,
          semesterOffered: true,
          creditHours: true,
        },
        orderBy: { code: 'asc' },
      }),
      db.faculty.findMany({
        where: { user: { isActive: true } },
        select: {
          id: true,
          facultyId: true,
          designation: true,
          user: { select: { name: true } },
        },
        orderBy: { user: { name: 'asc' } },
      }),
    ])

    const courseIds = courses.map((c) => c.id)

    const offerings = courseIds.length > 0
      ? await db.courseOffering.findMany({
          where: { courseId: { in: courseIds } },
          include: {
            course: {
              select: { id: true, code: true, name: true, courseType: true, semesterOffered: true, creditHours: true },
            },
            faculty: {
              select: {
                id: true,
                facultyId: true,
                designation: true,
                user: { select: { name: true } },
              },
            },
            semester: {
              select: { id: true, name: true, isCurrent: true },
            },
          },
          orderBy: [{ course: { code: 'asc' } }, { section: 'asc' }, { slotType: 'asc' }],
        })
      : []

    return successResponse({
      assignments: offerings.map((a) => ({
        id: a.id,
        courseId: a.courseId,
        facultyId: a.facultyId,
        section: a.section,
        slotType: a.slotType,
        isActive: a.isActive,
        course: a.course,
        faculty: a.faculty,
        semester: a.semester ? { id: a.semester.id, name: a.semester.name, isCurrent: a.semester.isCurrent } : null,
      })),
      courses,
      faculty,
      semesterOffered: semesterOffered ?? null,
    })
  } catch (error) {
    return handleApiError(error, 'Failed to fetch course assignments')
  }
}
