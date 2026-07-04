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

    // Faculty may only view attendance for their own courses
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

    // Get all students enrolled in this course for the semester (and section)
    const enrollments = await db.enrollment.findMany({
      where: {
        courseId,
        ...(semesterId ? { semesterId } : {}),
        ...(effectiveSection ? { section: effectiveSection } : {}),
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
      if (!r.studentId || !studentAttendance[r.studentId]) continue
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
    return handleApiError(error, 'Failed to fetch course attendance summary')
  }
}