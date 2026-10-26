import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { parseBody } from '@/lib/validators/request'
import { publishResultsSchema } from '@/lib/validators/result'
import { requireFacultyOrAdmin, assertFacultyOwnsCourse, resolveSectionScope, handleApiError } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    const session = await requireFacultyOrAdmin()

    const parsed = await parseBody(request, publishResultsSchema)
    if (!parsed.ok) return parsed.response
    const { courseId, semesterId, section: sectionParam } = parsed.data

    if (!courseId || !semesterId) {
      return errorResponse('courseId and semesterId are required')
    }

    // Faculty may only publish their own courses
    if (session.user.role === 'FACULTY') {
      await assertFacultyOwnsCourse(session.user.id, courseId, semesterId)
    }

    // Section access: refuses unassigned sections and, when none is requested,
    // narrows to the faculty's own sections instead of the whole course.
    const scope = await resolveSectionScope(session, courseId, semesterId, sectionParam)
    const effectiveSection = scope.section

    const sectionFilter = scope.where

    // Check course and semester exist
    const [course, semester] = await Promise.all([
      db.course.findUnique({ where: { id: courseId } }),
      db.semester.findUnique({ where: { id: semesterId } }),
    ])

    if (!course) return errorResponse('Course not found', 404)
    if (!semester) return errorResponse('Semester not found', 404)

    // Get all enrollments for this course+semester (and section)
    const enrollments = await db.enrollment.findMany({
      where: { courseId, semesterId, ...sectionFilter },
      select: { id: true },
    })

    if (enrollments.length === 0) {
      return errorResponse('No enrollments found for this course and semester')
    }

    const enrollmentIds = enrollments.map((e) => e.id)
    const existingResults = await db.result.findMany({
      where: { enrollmentId: { in: enrollmentIds } },
      select: { enrollmentId: true, assignmentMarks: true, quizMarks: true, midtermMarks: true, finalMarks: true, labMarks: true, projectMarks: true },
    })
    const resultByEnrollment = new Map(existingResults.map((r) => [r.enrollmentId, r]))
    const incomplete = enrollmentIds.filter((id) => {
      const r = resultByEnrollment.get(id)
      return !r || [r.assignmentMarks, r.quizMarks, r.midtermMarks, r.finalMarks, r.labMarks, r.projectMarks].every((m) => m == null)
    })
    if (incomplete.length) return errorResponse(`${incomplete.length} enrollment(s) have no entered marks; complete them before publishing`, 409)

    const updateResult = await db.result.updateMany({ where: { enrollmentId: { in: enrollmentIds } }, data: { isLocked: true } })

    return successResponse({
      updated: updateResult.count,
      created: 0,
      total: enrollmentIds.length,
    }, `Results published for ${course.code} - ${semester.name}`)
  } catch (error) {
    return handleApiError(error, 'Failed to publish results')
  }
}
