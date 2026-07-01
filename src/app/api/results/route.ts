import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api-response'
import { parsePaginationParams, skipTake } from '@/lib/pagination'
import { requireAuth, requireFacultyOrAdmin, assertFacultyOwnsCourse, getStudentForUser, handleApiError } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)
    const { page, limit, sort, order } = parsePaginationParams(searchParams)

    const courseId = searchParams.get('courseId') || undefined
    const studentId = searchParams.get('studentId') || undefined
    const semesterId = searchParams.get('semesterId') || undefined
    const grade = searchParams.get('grade') || undefined

    const where: Record<string, unknown> = {}
    if (courseId) where.courseId = courseId
    if (semesterId) where.semesterId = semesterId
    if (grade) where.grade = grade

    // Role-based scoping
    if (session.user.role === 'STUDENT') {
      const student = await getStudentForUser(session.user.id)
      where.studentId = student?.id ?? '__none__'
    } else if (session.user.role === 'FACULTY') {
      const faculty = await db.faculty.findUnique({ where: { userId: session.user.id } })
      const offerings = faculty
        ? await db.courseOffering.findMany({ where: { facultyId: faculty.id }, select: { courseId: true } })
        : []
      const courseIds = offerings.map((o) => o.courseId)
      where.courseId = courseIds.length
        ? { in: courseIds }
        : (courseId ? courseId : '__none__')
    } else if (studentId) {
      where.studentId = studentId
    }

    const allowedSortFields = [
      'totalMarks', 'percentage', 'gradePoint', 'createdAt', 'updatedAt',
    ]
    const sortField = allowedSortFields.includes(sort) ? sort : 'createdAt'
    const orderBy = { [sortField]: order }

    const [results, total] = await Promise.all([
      db.result.findMany({
        where,
        include: {
          student: {
            include: { user: { select: { name: true } } },
          },
          course: { select: { code: true, name: true } },
        },
        orderBy,
        ...skipTake(page, limit),
      }),
      db.result.count({ where }),
    ])

    const formatted = results.map((r) => ({
      id: r.id,
      enrollmentId: r.enrollmentId,
      studentId: r.studentId,
      studentName: r.student?.user?.name || 'Unknown',
      courseId: r.courseId,
      courseCode: r.course?.code || '',
      courseName: r.course?.name || '',
      semesterId: r.semesterId,
      assignmentMarks: r.assignmentMarks,
      quizMarks: r.quizMarks,
      midtermMarks: r.midtermMarks,
      finalMarks: r.finalMarks,
      labMarks: r.labMarks,
      projectMarks: r.projectMarks,
      totalMarks: r.totalMarks,
      percentage: r.percentage,
      grade: r.grade,
      gradePoint: r.gradePoint,
      isLocked: r.isLocked,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }))

    return paginatedResponse(formatted, total, page, limit)
  } catch (error) {
    return handleApiError(error, 'Failed to fetch results')
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireFacultyOrAdmin()

    const body = await request.json()
    const {
      enrollmentId,
      assignmentMarks,
      quizMarks,
      midtermMarks,
      finalMarks,
      labMarks,
      projectMarks,
    } = body

    if (!enrollmentId) {
      return errorResponse('enrollmentId is required')
    }

    // Check enrollment exists
    const enrollment = await db.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { student: true, course: true, semester: true },
    })

    if (!enrollment) {
      return errorResponse('Enrollment not found', 404)
    }

    // Faculty may only grade their own courses
    if (session.user.role === 'FACULTY') {
      await assertFacultyOwnsCourse(session.user.id, enrollment.courseId, enrollment.semesterId)
    }

    // Check if result is locked
    const existingResult = await db.result.findUnique({
      where: { enrollmentId },
    })

    if (existingResult?.isLocked) {
      return errorResponse('Results are published and cannot be modified', 403)
    }

    // Calculate marks
    const { calculateTotalMarks, calculateGrade } = await import('@/lib/calculations/grade')
    const totalMarks = calculateTotalMarks(
      assignmentMarks, quizMarks, midtermMarks, finalMarks, labMarks, projectMarks
    )
    const percentage = totalMarks / 100 * 100 // totalPossible = 100
    const gradeInfo = calculateGrade(percentage)

    // Upsert result
    const result = await db.result.upsert({
      where: { enrollmentId },
      create: {
        enrollmentId,
        studentId: enrollment.studentId,
        courseId: enrollment.courseId,
        semesterId: enrollment.semesterId,
        assignmentMarks: assignmentMarks ?? null,
        quizMarks: quizMarks ?? null,
        midtermMarks: midtermMarks ?? null,
        finalMarks: finalMarks ?? null,
        labMarks: labMarks ?? null,
        projectMarks: projectMarks ?? null,
        totalMarks,
        percentage: Math.round(percentage * 100) / 100,
        grade: gradeInfo.grade,
        gradePoint: gradeInfo.gradePoint,
      },
      update: {
        assignmentMarks: assignmentMarks ?? null,
        quizMarks: quizMarks ?? null,
        midtermMarks: midtermMarks ?? null,
        finalMarks: finalMarks ?? null,
        labMarks: labMarks ?? null,
        projectMarks: projectMarks ?? null,
        totalMarks,
        percentage: Math.round(percentage * 100) / 100,
        grade: gradeInfo.grade,
        gradePoint: gradeInfo.gradePoint,
      },
    })

    return successResponse(result, 'Result saved successfully')
  } catch (error) {
    return handleApiError(error, 'Failed to save result')
  }
}