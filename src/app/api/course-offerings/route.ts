import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api-response'
import { requireAuth, requireAdmin, handleApiError } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)

    const semesterId = searchParams.get('semesterId') || undefined
    const facultyIdParam = searchParams.get('facultyId') || undefined
    const courseId = searchParams.get('courseId') || undefined
    const section = searchParams.get('section') || undefined

    const where: Record<string, unknown> = { isActive: true }
    if (semesterId) where.semesterId = semesterId
    if (courseId) where.courseId = courseId
    if (section) where.section = section

    // Non-admin faculty only see their own offerings
    if (session.user.role === 'FACULTY') {
      const faculty = await db.faculty.findUnique({ where: { userId: session.user.id } })
      where.facultyId = faculty?.id ?? '__none__'
    } else if (facultyIdParam) {
      where.facultyId = facultyIdParam
    }

    const offerings = await db.courseOffering.findMany({
      where,
      include: {
        course: {
          select: { id: true, code: true, name: true, creditHours: true, courseType: true, semesterOffered: true },
        },
        faculty: {
          select: { id: true, facultyId: true, designation: true, user: { select: { name: true } }, maxCoursesPerSemester: true },
        },
        semester: { select: { id: true, name: true, isCurrent: true } },
      },
      orderBy: [{ semesterId: 'desc' }, { course: { code: 'asc' } }],
    })

    // Enrich with student count per offering (via enrollments)
    const enriched = await Promise.all(
      offerings.map(async (o) => {
        const studentCount = await db.enrollment.count({
          where: { courseId: o.courseId, semesterId: o.semesterId, section: o.section, status: 'ENROLLED' },
        })
        return {
          id: o.id,
          courseId: o.courseId,
          facultyId: o.facultyId,
          semesterId: o.semesterId,
          section: o.section,
          slotType: o.slotType,
          isActive: o.isActive,
          course: o.course,
          faculty: o.faculty ? { ...o.faculty, name: o.faculty.user.name } : null,
          semester: o.semester,
          studentCount,
        }
      })
    )

    return paginatedResponse(enriched, enriched.length, 1, enriched.length)
  } catch (error) {
    return handleApiError(error, 'Failed to fetch course offerings')
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const { courseId, facultyId, semesterId, section, slotType } = body

    if (!courseId || !facultyId || !semesterId) {
      return errorResponse('courseId, facultyId and semesterId are required', 400)
    }

    const [course, faculty, semester] = await Promise.all([
      db.course.findUnique({ where: { id: courseId } }),
      db.faculty.findUnique({ where: { id: facultyId } }),
      db.semester.findUnique({ where: { id: semesterId } }),
    ])

    if (!course) return errorResponse('Course not found', 404)
    if (!faculty) return errorResponse('Faculty not found', 404)
    if (!semester) return errorResponse('Semester not found', 404)

    // Enforce faculty load limit
    const existingCount = await db.courseOffering.count({
      where: { facultyId, semesterId, isActive: true },
    })
    if (existingCount >= faculty.maxCoursesPerSemester) {
      return errorResponse(
        `Faculty already has ${existingCount} assignments (max: ${faculty.maxCoursesPerSemester})`,
        409
      )
    }

    const offering = await db.courseOffering.create({
      data: {
        courseId,
        facultyId,
        semesterId,
        section: section || 'A',
        slotType: slotType || 'THEORY',
      },
      include: {
        course: { select: { id: true, code: true, name: true } },
        faculty: { select: { id: true, facultyId: true, user: { select: { name: true } } } },
        semester: { select: { id: true, name: true } },
      },
    })

    return successResponse(offering, 'Course assigned successfully', 201)
  } catch (error) {
    return handleApiError(error, 'Failed to assign course')
  }
}
