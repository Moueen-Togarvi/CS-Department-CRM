import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { calculateGPA } from '@/lib/calculations/grade'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params

    const student = await db.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { name: true, email: true } },
        department: { select: { name: true, code: true } },
      },
    })

    if (!student) {
      return errorResponse('Student not found', 404)
    }

    // Get all results grouped by semester
    const results = await db.result.findMany({
      where: { studentId },
      include: {
        course: true,
        semester: true,
      },
      orderBy: [{ semester: { startDate: 'asc' } }, { course: { code: 'asc' } }],
    })

    // Group results by semester
    const semesterMap = new Map<string, {
      semesterId: string
      semesterName: string
      courses: Array<{
        code: string
        name: string
        creditHours: number
        labCreditHours: number
        grade: string | null
        gradePoint: number | null
        totalMarks: number | null
        percentage: number | null
      }>
    }>()

    for (const r of results) {
      const semId = r.semesterId
      if (!semesterMap.has(semId)) {
        semesterMap.set(semId, {
          semesterId: semId,
          semesterName: r.semester.name,
          courses: [],
        })
      }
      semesterMap.get(semId)!.courses.push({
        code: r.course.code,
        name: r.course.name,
        creditHours: r.course.creditHours,
        labCreditHours: r.course.labCreditHours,
        grade: r.grade,
        gradePoint: r.gradePoint,
        totalMarks: r.totalMarks,
        percentage: r.percentage,
      })
    }

    // Calculate per-semester GPA and build response
    const semesters = []
    let allCoursesForCumulative: Array<{ gradePoint: number | null; creditHours: number; labCreditHours: number }> = []

    for (const [, semData] of semesterMap) {
      const semCourses = semData.courses
      const gpaInputs = semCourses.map((c) => ({
        gradePoint: c.gradePoint,
        creditHours: c.creditHours,
        labCreditHours: c.labCreditHours,
      }))
      const gpa = calculateGPA(gpaInputs)

      semesters.push({
        semesterName: semData.semesterName,
        gpa: Math.round(gpa * 100) / 100,
        courses: semCourses,
      })

      allCoursesForCumulative.push(...gpaInputs)
    }

    const cumulativeGPA = Math.round(calculateGPA(allCoursesForCumulative) * 100) / 100

    return successResponse({
      student: {
        name: student.user.name,
        studentId: student.studentId,
        batch: student.batch,
        program: student.program,
        department: student.department?.name,
        currentSemester: student.currentSemester,
      },
      semesters,
      cumulativeGPA,
    })
  } catch (error) {
    console.error('GET /api/results/student/[studentId]/transcript error:', error)
    return errorResponse('Failed to fetch transcript')
  }
}