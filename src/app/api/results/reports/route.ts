import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const semesterId = searchParams.get('semesterId') || undefined

    if (!semesterId) {
      return errorResponse('semesterId is required')
    }

    const semester = await db.semester.findUnique({ where: { id: semesterId } })
    if (!semester) {
      return errorResponse('Semester not found', 404)
    }

    // Get all results for the semester
    const results = await db.result.findMany({
      where: { semesterId },
      include: {
        course: { select: { id: true, code: true, name: true, creditHours: true } },
        student: { include: { user: { select: { name: true } } } },
      },
    })

    // Overall grade distribution
    const gradeDistribution: Record<string, number> = {}
    let totalPercentage = 0
    let totalGradePoints = 0
    let gradedCount = 0

    for (const r of results) {
      if (r.grade) {
        gradeDistribution[r.grade] = (gradeDistribution[r.grade] || 0) + 1
      }
      if (r.percentage !== null && r.percentage !== undefined) {
        totalPercentage += r.percentage
        gradedCount++
      }
      if (r.gradePoint !== null && r.gradePoint !== undefined) {
        totalGradePoints += r.gradePoint
      }
    }

    const averagePercentage = gradedCount > 0
      ? Math.round((totalPercentage / gradedCount) * 100) / 100
      : 0
    const averageGPA = gradedCount > 0
      ? Math.round((totalGradePoints / gradedCount) * 100) / 100
      : 0
    const passCount = results.filter(
      (r) => r.grade && r.grade !== 'F' && r.grade !== 'I' && r.grade !== 'W'
    ).length
    const passRate = results.length > 0
      ? Math.round((passCount / results.length) * 10000) / 100
      : 0

    // Course-wise statistics
    const courseMap = new Map<string, {
      courseId: string
      courseCode: string
      courseName: string
      results: typeof results
    }>()

    for (const r of results) {
      if (!courseMap.has(r.courseId)) {
        courseMap.set(r.courseId, {
          courseId: r.courseId,
          courseCode: r.course.code,
          courseName: r.course.name,
          results: [],
        })
      }
      courseMap.get(r.courseId)!.results.push(r)
    }

    const courseStats = []
    for (const [, data] of courseMap) {
      const courseResults = data.results
      const courseTotal = courseResults.length
      const courseMarks = courseResults.map((r) => r.totalMarks ?? 0)
      const coursePercentages = courseResults.map((r) => r.percentage ?? 0)
      const coursePassed = courseResults.filter(
        (r) => r.grade && r.grade !== 'F' && r.grade !== 'I' && r.grade !== 'W'
      ).length

      // Top performer in this course
      const sortedByMarks = [...courseResults].sort((a, b) => (b.totalMarks ?? 0) - (a.totalMarks ?? 0))
      const topPerformer = sortedByMarks[0]
        ? { name: sortedByMarks[0].student?.user?.name || 'Unknown', marks: sortedByMarks[0].totalMarks ?? 0 }
        : null

      courseStats.push({
        courseId: data.courseId,
        courseCode: data.courseCode,
        courseName: data.courseName,
        totalStudents: courseTotal,
        average: courseTotal > 0
          ? Math.round((courseMarks.reduce((a, b) => a + b, 0) / courseTotal) * 100) / 100
          : 0,
        classAverage: courseTotal > 0
          ? Math.round((coursePercentages.reduce((a, b) => a + b, 0) / courseTotal) * 100) / 100
          : 0,
        passRate: courseTotal > 0
          ? Math.round((coursePassed / courseTotal) * 10000) / 100
          : 0,
        failCount: courseTotal - coursePassed,
        topPerformer,
      })
    }

    // Top performers across all courses
    const studentMarksMap = new Map<string, { name: string; totalMarks: number; count: number }>()
    for (const r of results) {
      const key = r.studentId
      if (!studentMarksMap.has(key)) {
        studentMarksMap.set(key, {
          name: r.student?.user?.name || 'Unknown',
          totalMarks: 0,
          count: 0,
        })
      }
      const entry = studentMarksMap.get(key)!
      entry.totalMarks += r.totalMarks ?? 0
      entry.count += 1
    }

    const topPerformers = Array.from(studentMarksMap.entries())
      .map(([id, data]) => ({
        studentId: id,
        name: data.name,
        averageMarks: data.count > 0 ? Math.round((data.totalMarks / data.count) * 100) / 100 : 0,
        totalCourses: data.count,
      }))
      .sort((a, b) => b.averageMarks - a.averageMarks)
      .slice(0, 10)

    return successResponse({
      semester: {
        id: semester.id,
        name: semester.name,
      },
      summary: {
        totalResults: results.length,
        totalCourses: courseMap.size,
        averagePercentage,
        averageGPA,
        passRate,
      },
      gradeDistribution,
      courseStats,
      topPerformers,
    })
  } catch (error) {
    console.error('GET /api/results/reports error:', error)
    return errorResponse('Failed to fetch reports')
  }
}