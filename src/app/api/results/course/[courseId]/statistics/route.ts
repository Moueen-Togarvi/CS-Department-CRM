import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params
    const { searchParams } = new URL(request.url)
    const semesterId = searchParams.get('semesterId') || undefined

    if (!semesterId) {
      return errorResponse('semesterId is required')
    }

    const course = await db.course.findUnique({ where: { id: courseId } })
    if (!course) {
      return errorResponse('Course not found', 404)
    }

    const results = await db.result.findMany({
      where: { courseId, semesterId },
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
    console.error('GET /api/results/course/[courseId]/statistics error:', error)
    return errorResponse('Failed to fetch course statistics')
  }
}