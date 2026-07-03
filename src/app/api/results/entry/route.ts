import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { requireFacultyOrAdmin, assertFacultyOwnsCourse, handleApiError } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const session = await requireFacultyOrAdmin()

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const semesterId = searchParams.get('semesterId')

    if (!courseId || !semesterId) {
      return errorResponse('courseId and semesterId are required')
    }

    // Faculty may only access entry data for their own courses
    if (session.user.role === 'FACULTY') {
      await assertFacultyOwnsCourse(session.user.id, courseId, semesterId)
    }

    const course = await db.course.findUnique({ where: { id: courseId } })
    if (!course) {
      return errorResponse('Course not found', 404)
    }

    // Query enrollments for this course + semester (any status)
    let enrollments = await db.enrollment.findMany({
      where: { courseId, semesterId },
      include: {
        student: {
          include: { user: { select: { name: true } } },
        },
        result: true,
      },
      orderBy: { student: { studentId: 'asc' } },
    })

    // Fallback: if no enrollments exist for this semester,
    // try any enrollment for this course (regardless of semester)
    if (enrollments.length === 0) {
      enrollments = await db.enrollment.findMany({
        where: { courseId },
        include: {
          student: {
            include: { user: { select: { name: true } } },
          },
          result: true,
        },
        orderBy: { student: { studentId: 'asc' } },
      })
    }

    // Fallback: if STILL no enrollments, auto-create them for all
    // active students matching the course's semesterOffered
    if (enrollments.length === 0) {
      const students = await db.student.findMany({
        where: {
          user: { isActive: true },
          status: 'ACTIVE',
          ...(course.semesterOffered
            ? { currentSemester: course.semesterOffered }
            : {}),
        },
        orderBy: { studentId: 'asc' },
      })

      if (students.length > 0) {
        await db.enrollment.createMany({
          data: students.map((s) => ({
            studentId: s.id,
            courseId,
            semesterId,
            section: s.section || 'A',
            status: 'ENROLLED',
            enrollmentDate: new Date(),
          })),
        })

        enrollments = await db.enrollment.findMany({
          where: { courseId, semesterId },
          include: {
            student: {
              include: { user: { select: { name: true } } },
            },
            result: true,
          },
          orderBy: { student: { studentId: 'asc' } },
        })
      }
    }

    // Check if results are published for this course+semester
    const anyLocked = await db.result.findFirst({
      where: { courseId, semesterId, isLocked: true },
    })

    const data = enrollments.map((e, index) => ({
      index: index + 1,
      enrollmentId: e.id,
      studentId: e.studentId,
      studentName: e.student?.user?.name || 'Unknown',
      studentCode: e.student?.studentId || '',
      section: e.section,
      result: e.result
        ? {
            id: e.result.id,
            assignmentMarks: e.result.assignmentMarks,
            quizMarks: e.result.quizMarks,
            midtermMarks: e.result.midtermMarks,
            finalMarks: e.result.finalMarks,
            labMarks: e.result.labMarks,
            projectMarks: e.result.projectMarks,
            totalMarks: e.result.totalMarks,
            percentage: e.result.percentage,
            grade: e.result.grade,
            gradePoint: e.result.gradePoint,
            isLocked: e.result.isLocked,
          }
        : null,
    }))

    return successResponse({
      enrollments: data,
      isPublished: !!anyLocked,
    })
  } catch (error) {
    return handleApiError(error, 'Failed to fetch entry data')
  }
}
