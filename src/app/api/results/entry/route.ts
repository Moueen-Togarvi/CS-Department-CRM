import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { requireFacultyOrAdmin, assertFacultyOwnsCourse, resolveSectionScope, handleApiError } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const session = await requireFacultyOrAdmin()

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const semesterId = searchParams.get('semesterId')
    const sectionParam = searchParams.get('section') || undefined

    if (!courseId || !semesterId) {
      return errorResponse('courseId and semesterId are required')
    }

    // Faculty may only access entry data for their own courses
    if (session.user.role === 'FACULTY') {
      await assertFacultyOwnsCourse(session.user.id, courseId, semesterId)
    }

    // Section access: refuses unassigned sections and, when none is requested,
    // narrows to the faculty's own sections instead of the whole course.
    const scope = await resolveSectionScope(session, courseId, semesterId, sectionParam)
    const effectiveSection = scope.section

    const course = await db.course.findUnique({ where: { id: courseId } })
    if (!course) {
      return errorResponse('Course not found', 404)
    }

    const sectionFilter = scope.where

    // Query enrollments for this course + semester + section (any status)
    let enrollments = await db.enrollment.findMany({
      where: { courseId, semesterId, ...sectionFilter },
      include: {
        student: {
          include: { user: { select: { name: true } } },
        },
        result: true,
      },
      orderBy: { student: { studentId: 'asc' } },
    })

    // Fallback: if no enrollments exist for this semester+section,
    // try any enrollment for this course+section (regardless of semester)
    if (enrollments.length === 0) {
      enrollments = await db.enrollment.findMany({
        where: { courseId, ...sectionFilter },
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
    // active students matching the course's semesterOffered + section
    if (enrollments.length === 0) {
      const students = await db.student.findMany({
        where: {
          user: { isActive: true },
          status: 'ACTIVE',
          ...(course.semesterOffered
            ? { currentSemester: course.semesterOffered }
            : {}),
          ...sectionFilter,
        },
        orderBy: { studentId: 'asc' },
      })

      if (students.length > 0) {
        await db.enrollment.createMany({
          data: students.map((s) => ({
            studentId: s.id,
            courseId,
            semesterId,
            section: s.section || effectiveSection || 'A',
            status: 'ENROLLED',
            enrollmentDate: new Date(),
          })),
        })

        enrollments = await db.enrollment.findMany({
          where: { courseId, semesterId, ...sectionFilter },
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
