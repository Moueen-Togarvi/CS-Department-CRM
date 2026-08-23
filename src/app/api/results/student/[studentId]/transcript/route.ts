import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { calculateGPA } from '@/lib/calculations/grade'
import { requireAuth, assertCanViewStudent, handleApiError } from '@/lib/auth-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const session = await requireAuth()
    const { studentId } = await params

    // Students may only view their own transcript
    await assertCanViewStudent(session, studentId)

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
      orderBy: [{ course: { semesterOffered: 'asc' } }, { course: { code: 'asc' } }],
    })

    // Group by the course's programme semester (1-8). Academic terms like
    // "Spring 2025" aren't used anywhere in this system.
    const semesterMap = new Map<number, {
      semesterNumber: number
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
      // 0 buckets any course with no semester set, and sorts before Semester 1.
      const semNumber = r.course.semesterOffered ?? 0
      if (!semesterMap.has(semNumber)) {
        semesterMap.set(semNumber, {
          semesterNumber: semNumber,
          semesterName: semNumber > 0 ? `Semester ${semNumber}` : 'Unassigned',
          courses: [],
        })
      }
      semesterMap.get(semNumber)!.courses.push({
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
    const semesters: Array<{
      semesterName: string
      gpa: number
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
    }> = []
    let allCoursesForCumulative: Array<{ gradePoint: number | null; creditHours: number; labCreditHours: number }> = []

    const orderedSemesters = [...semesterMap.values()].sort(
      (a, b) => a.semesterNumber - b.semesterNumber
    )

    for (const semData of orderedSemesters) {
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
    return handleApiError(error, 'Failed to fetch transcript')
  }
}