import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { requireFacultyOrAdmin, assertFacultyOwnsCourse, getFacultyCourseSections, handleApiError } from '@/lib/auth-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await requireFacultyOrAdmin()

    const { courseId } = await params
    const { searchParams } = new URL(request.url)
    const semesterId = searchParams.get('semesterId') || undefined
    const sectionParam = searchParams.get('section') || undefined

    if (!semesterId) {
      return errorResponse('semesterId is required')
    }

    // Faculty may only view statistics for their own courses
    let facultyScope: string[] | null = null
    if (session.user.role === 'FACULTY') {
      await assertFacultyOwnsCourse(session.user.id, courseId, semesterId)
      facultyScope = await getFacultyCourseSections(session.user.id, courseId, semesterId)
    }

    // Resolve the effective section to filter by
    let effectiveSection = sectionParam
    if (session.user.role === 'FACULTY' && facultyScope && facultyScope.length > 0) {
      if (effectiveSection && !facultyScope.includes(effectiveSection)) {
        return errorResponse('Forbidden: You are not assigned to this section', 403)
      }
      if (!effectiveSection && facultyScope.length === 1) {
        effectiveSection = facultyScope[0]
      }
    }

    const course = await db.course.findUnique({ where: { id: courseId } })
    if (!course) {
      return errorResponse('Course not found', 404)
    }

    // Results don't carry section; join through enrollment to filter by section
    const enrollmentFilter = effectiveSection
      ? { enrollment: { section: effectiveSection } }
      : {}

    const results = await db.result.findMany({
      where: { courseId, semesterId, ...enrollmentFilter },
      include: {
        student: {
          include: { user: { select: { name: true } } },
        },
      },
    })

    if (results.length === 0) {
      return successResponse({
        courseId,
        courseName: course.name,
        courseCode: course.code,
        totalStudents: 0,
        averageMarks: 0,
        highestMarks: 0,
        lowestMarks: 0,
        passRate: 0,
        gradeDistribution: {},
        classAverage: 0,
      })
    }

    const marks = results.map((r) => r.totalMarks ?? 0)
    const percentages = results.map((r) => r.percentage ?? 0)

    const totalStudents = results.length
    const sumMarks = marks.reduce((a, b) => a + b, 0)
    const averageMarks = Math.round((sumMarks / totalStudents) * 100) / 100
    const highestMarks = Math.max(...marks)
    const lowestMarks = Math.min(...marks)
    const classAverage = Math.round((percentages.reduce((a, b) => a + b, 0) / totalStudents) * 100) / 100

    const passed = results.filter((r) => r.grade && r.grade !== 'F' && r.grade !== 'I' && r.grade !== 'W').length
    const passRate = Math.round((passed / totalStudents) * 10000) / 100

    // Grade distribution
    const gradeDistribution: Record<string, number> = {}
    for (const r of results) {
      if (r.grade) {
        const g = r.grade
        gradeDistribution[g] = (gradeDistribution[g] || 0) + 1
      }
    }

    return successResponse({
      courseId,
      courseName: course.name,
      courseCode: course.code,
      totalStudents,
      averageMarks,
      highestMarks,
      lowestMarks,
      passRate,
      gradeDistribution,
      classAverage,
    })
  } catch (error) {
    return handleApiError(error, 'Failed to fetch course statistics')
  }
}