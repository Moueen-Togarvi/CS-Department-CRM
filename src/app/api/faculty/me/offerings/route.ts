import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse } from '@/lib/api-response'
import { requireFacultyOrAdmin, handleApiError, getFacultyForUser } from '@/lib/auth-utils'

/**
 * Returns the logged-in faculty's course offerings (for a semester, default current).
 * Each offering includes course, student count, and timetable slots.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireFacultyOrAdmin()
    const { searchParams } = new URL(request.url)

    const faculty = await getFacultyForUser(session.user.id)
    if (!faculty) {
      return successResponse({ offerings: [], semester: null })
    }

    let semesterId = searchParams.get('semesterId') || undefined
    let semester = semesterId
      ? await db.semester.findUnique({ where: { id: semesterId } })
      : await db.semester.findFirst({ where: { isCurrent: true } })

    if (!semester) {
      semester = await db.semester.findFirst({ orderBy: { startDate: 'desc' } })
      semesterId = semester?.id
    }
    semesterId = semesterId || semester?.id

    if (!semesterId) {
      return successResponse({ offerings: [], semester: null })
    }

    const offerings = await db.courseOffering.findMany({
      where: { facultyId: faculty.id, semesterId, isActive: true },
      include: {
        course: {
          select: { id: true, code: true, name: true, creditHours: true, courseType: true, semesterOffered: true },
        },
        semester: { select: { id: true, name: true, isCurrent: true } },
      },
      orderBy: { course: { code: 'asc' } },
    })

    const courseIds = [...new Set(offerings.map((offering) => offering.courseId))]
    const sections = [...new Set(offerings.map((offering) => offering.section))]
    const [enrollmentCounts, timetables, pendingResultCounts] = await Promise.all([
      db.enrollment.groupBy({
        by: ['courseId', 'semesterId', 'section'],
        where: { courseId: { in: courseIds }, semesterId, section: { in: sections }, status: 'ENROLLED' },
        _count: true,
      }),
      db.timetable.findMany({
        where: { courseId: { in: courseIds }, semesterId, facultyId: faculty.id, section: { in: sections } },
        include: { room: { select: { id: true, name: true, building: true } } },
        orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
      }),
      db.result.groupBy({
        by: ['courseId', 'semesterId'],
        where: { courseId: { in: courseIds }, semesterId, isLocked: false },
        _count: true,
      }),
    ])

    const enrollmentCountByOffering = new Map(
      enrollmentCounts.map((row) => [`${row.courseId}:${row.semesterId}:${row.section}`, row._count])
    )
    const pendingResultsByCourse = new Map(
      pendingResultCounts.map((row) => [`${row.courseId}:${row.semesterId}`, row._count])
    )
    const timetablesByOffering = new Map<string, typeof timetables>()
    for (const timetable of timetables) {
      const key = `${timetable.courseId}:${timetable.semesterId}:${timetable.section}`
      const slots = timetablesByOffering.get(key)
      if (slots) slots.push(timetable)
      else timetablesByOffering.set(key, [timetable])
    }

    const enriched = offerings.map((o) => {
      const key = `${o.courseId}:${o.semesterId}:${o.section}`
      const slots = timetablesByOffering.get(key) ?? []
      return {
        id: o.id,
        courseId: o.courseId,
        semesterId: o.semesterId,
        section: o.section,
        slotType: o.slotType,
        course: o.course,
        semester: o.semester,
        studentCount: enrollmentCountByOffering.get(key) ?? 0,
        timetables: slots.map((t) => ({
          id: t.id,
          day: t.day,
          startTime: t.startTime,
          endTime: t.endTime,
          slotType: t.slotType,
          room: t.room,
        })),
        pendingResults: pendingResultsByCourse.get(`${o.courseId}:${o.semesterId}`) ?? 0,
      }
    })

    return successResponse({
      offerings: enriched,
      semester: semester ? { id: semester.id, name: semester.name } : null,
      faculty: { id: faculty.id, name: session.user.name, designation: faculty.designation },
    })
  } catch (error) {
    return handleApiError(error, 'Failed to fetch faculty offerings')
  }
}
