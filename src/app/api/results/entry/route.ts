import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const semesterId = searchParams.get('semesterId')

    if (!courseId || !semesterId) {
      return errorResponse('courseId and semesterId are required')
    }

    const enrollments = await db.enrollment.findMany({
      where: { courseId, semesterId, status: 'ENROLLED' },
      include: {
        student: {
          include: { user: { select: { name: true } } },
        },
        result: true,
      },
      orderBy: { student: { studentId: 'asc' } },
    })

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
    console.error('GET /api/results/entry error:', error)
    return errorResponse('Failed to fetch entry data')
  }
}