import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params
    const { searchParams } = new URL(request.url)
    const semesterId = searchParams.get('semesterId') || undefined

    // Get all students enrolled in this course for the semester
    const enrollments = await db.enrollment.findMany({
      where: {
        courseId,
        ...(semesterId ? { semesterId } : {}),
        status: 'ENROLLED',
      },
      select: {
        studentId: true,
        student: {
          select: {
            id: true,
            studentId: true,
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { student: { user: { name: 'asc' } } },
    })

    if (!enrollments.length) {
      return successResponse([])
    }

    // Get attendance for all these students
    const studentIds = enrollments.map((e) => e.studentId)
    const effectiveSemester = semesterId || enrollments[0]?.student?.id ? undefined : undefined

    const attendanceWhere: any = {
      courseId,
      studentId: { in: studentIds },
    }
    if (semesterId) {
      attendanceWhere.semesterId = semesterId
    }

    const attendanceRecords = await db.attendance.findMany({
      where: attendanceWhere,
      select: {
        studentId: true,
        status: true,
      },
    })

    // Group by student
    const studentAttendance: Record<string, { present: number; total: number }> = {}
    for (const e of enrollments) {
      studentAttendance[e.studentId] = { present: 0, total: 0 }
    }

    for (const r of attendanceRecords) {
      if (!studentAttendance[r.studentId]) continue
      studentAttendance[r.studentId].total++
      if (r.status === 'PRESENT' || r.status === 'LATE') {
        studentAttendance[r.studentId].present++
      }
    }

    const summary = enrollments.map((e) => {
      const att = studentAttendance[e.studentId] || { present: 0, total: 0 }
      const percentage = att.total > 0 ? Math.round((att.present / att.total) * 1000) / 10 : 0
      return {
        studentId: e.studentId,
        student: e.student,
        studentName: e.student.user.name,
        present: att.present,
        total: att.total,
        percentage,
      }
    })

    return successResponse(summary)
  } catch (error) {
    console.error('GET /api/attendance/course/[courseId]/summary error:', error)
    return errorResponse('Failed to fetch course attendance summary', 500)
  }
}