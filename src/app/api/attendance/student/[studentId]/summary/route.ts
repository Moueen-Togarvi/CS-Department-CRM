import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId: studentParamId } = await params
    const { searchParams } = new URL(request.url)
    const semesterId = searchParams.get('semesterId') || undefined

    // Find the student
    const student = await db.student.findUnique({
      where: { id: studentParamId },
      select: { id: true, studentId: true, user: { select: { name: true } } },
    })

    if (!student) {
      return errorResponse('Student not found', 404)
    }

    // Get attendance records
    const where: any = { studentId: studentParamId }
    if (semesterId) where.semesterId = semesterId

    const records = await db.attendance.findMany({
      where,
      select: {
        courseId: true,
        status: true,
        course: {
          select: { id: true, code: true, name: true },
        },
      },
    })

    // Group by course
    const courseAttendance: Record<string, { course: any; present: number; total: number }> = {}
    for (const r of records) {
      if (!courseAttendance[r.courseId]) {
        courseAttendance[r.courseId] = {
          course: r.course,
          present: 0,
          total: 0,
        }
      }
      courseAttendance[r.courseId].total++
      if (r.status === 'PRESENT' || r.status === 'LATE') {
        courseAttendance[r.courseId].present++
      }
    }

    const summary = Object.values(courseAttendance).map((c) => {
      const percentage = c.total > 0 ? Math.round((c.present / c.total) * 1000) / 10 : 0
      return {
        courseId: c.course.id,
        courseName: c.course.name,
        courseCode: c.course.code,
        present: c.present,
        total: c.total,
        percentage,
      }
    })

    return successResponse(summary)
  } catch (error) {
    console.error('GET /api/attendance/student/[studentId]/summary error:', error)
    return errorResponse('Failed to fetch student attendance summary', 500)
  }
}