import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { parseBody } from '@/lib/validators/request'
import { createOfferingSchema } from '@/lib/validators/offering'
import { requireAdmin, requireAuth, handleApiError } from '@/lib/auth-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id: courseId } = await params

    const offerings = await db.courseOffering.findMany({
      where: { courseId },
      include: {
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
      orderBy: [{ semester: { isCurrent: 'desc' } }, { section: 'asc' }],
    })

    return successResponse(offerings)
  } catch (error) {
    return handleApiError(error, 'Failed to fetch offerings')
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id: courseId } = await params
    const parsed = await parseBody(request, createOfferingSchema)
    if (!parsed.ok) return parsed.response
    const { facultyId, section, semesterId, slotType } = parsed.data

    const course = await db.course.findUnique({ where: { id: courseId } })
    if (!course) {
      return errorResponse('Course not found', 404)
    }

    let finalSemesterId = semesterId
    if (!finalSemesterId) {
      const currentSem = await db.semester.findFirst({ where: { isCurrent: true } })
      if (!currentSem) {
        return errorResponse('No active semester found. Please set a current semester first.', 400)
      }
      finalSemesterId = currentSem.id
    }

    const existing = await db.courseOffering.findUnique({
      where: {
        courseId_semesterId_section_slotType: {
          courseId,
          semesterId: finalSemesterId,
          section,
          slotType: slotType || 'THEORY',
        },
      },
    })

    if (existing) {
      return errorResponse('This section and slot type already has an assignment for this semester', 409)
    }

    // Workload cap. Counts DISTINCT courses in the semester, not offerings —
    // teaching three sections of one course is one course, and a theory + lab
    // pair is one course too.
    const faculty = await db.faculty.findUnique({
      where: { id: facultyId },
      select: { maxCoursesPerSemester: true, user: { select: { name: true } } },
    })
    if (!faculty) {
      return errorResponse('Faculty not found', 404)
    }

    const semesterOfferings = await db.courseOffering.findMany({
      where: { facultyId, semesterId: finalSemesterId, isActive: true },
      select: { courseId: true },
    })
    const distinctCourses = new Set(semesterOfferings.map((o) => o.courseId))

    if (!distinctCourses.has(courseId) && distinctCourses.size >= faculty.maxCoursesPerSemester) {
      return errorResponse(
        `${faculty.user.name} already teaches ${distinctCourses.size} course(s) this semester, ` +
          `which is their limit of ${faculty.maxCoursesPerSemester}. ` +
          'Raise their "max courses per semester" to assign more.',
        409
      )
    }

    const offering = await db.courseOffering.create({
      data: {
        courseId,
        facultyId,
        semesterId: finalSemesterId,
        section,
        slotType: slotType || 'THEORY',
        isActive: true,
      },
      include: {
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
    })

    return successResponse(offering, 'Faculty assigned successfully', 201)
  } catch (error) {
    return handleApiError(error, 'Failed to assign faculty')
  }
}
