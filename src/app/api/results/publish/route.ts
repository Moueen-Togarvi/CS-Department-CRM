import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { requireFacultyOrAdmin, assertFacultyOwnsCourse, handleApiError } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    const session = await requireFacultyOrAdmin()

    const body = await request.json()
    const { courseId, semesterId } = body

    if (!courseId || !semesterId) {
      return errorResponse('courseId and semesterId are required')
    }

    // Faculty may only publish their own courses
    if (session.user.role === 'FACULTY') {
      await assertFacultyOwnsCourse(session.user.id, courseId, semesterId)
    }

    // Check course and semester exist
    const [course, semester] = await Promise.all([
      db.course.findUnique({ where: { id: courseId } }),
      db.semester.findUnique({ where: { id: semesterId } }),
    ])

    if (!course) return errorResponse('Course not found', 404)
    if (!semester) return errorResponse('Semester not found', 404)

    // Get all enrollments for this course+semester
    const enrollments = await db.enrollment.findMany({
      where: { courseId, semesterId },
      select: { id: true },
    })

    if (enrollments.length === 0) {
      return errorResponse('No enrollments found for this course and semester')
    }

    // Lock all results
    const enrollmentIds = enrollments.map((e) => e.id)
    const updateResult = await db.result.updateMany({
      where: { enrollmentId: { in: enrollmentIds } },
      data: { isLocked: true },
    })

    // Also create results for enrollments that don't have one yet (with 0 marks)
    const existingResults = await db.result.findMany({
      where: { enrollmentId: { in: enrollmentIds } },
      select: { enrollmentId: true },
    })
    const existingIds = new Set(existingResults.map((r) => r.enrollmentId))
    const missingIds = enrollmentIds.filter((id) => !existingIds.has(id))

    if (missingIds.length > 0) {
      // Create locked results with null marks for missing enrollments
      const missingEnrollments = await db.enrollment.findMany({
        where: { id: { in: missingIds } },
        select: { id: true, studentId: true, courseId: true, semesterId: true },
      })

      await db.result.createMany({
        data: missingEnrollments.map((e) => ({
          enrollmentId: e.id,
          studentId: e.studentId,
          courseId: e.courseId,
          semesterId: e.semesterId,
          totalMarks: 0,
          percentage: 0,
          grade: 'F' as const,
          gradePoint: 0,
          isLocked: true,
        })),
      })
    }

    return successResponse({
      updated: updateResult.count,
      created: missingIds.length,
      total: enrollmentIds.length,
    }, `Results published for ${course.code} - ${semester.name}`)
  } catch (error) {
    return handleApiError(error, 'Failed to publish results')
  }
}