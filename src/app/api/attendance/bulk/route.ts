import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { AttendanceStatus } from '@prisma/client'
import { requireFacultyOrAdmin, assertFacultyOwnsCourse, handleApiError } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    const session = await requireFacultyOrAdmin()

    const body = await request.json()
    const { courseId, semesterId, date, records } = body

    if (!courseId || !semesterId || !date || !Array.isArray(records)) {
      return errorResponse('Missing required fields: courseId, semesterId, date, records', 400)
    }

    if (!records.length) {
      return errorResponse('Records array cannot be empty', 400)
    }

    const validStatuses: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']
    for (const rec of records) {
      if (!rec.studentId || !rec.status) {
        return errorResponse('Each record must have studentId and status', 400)
      }
      if (!validStatuses.includes(rec.status)) {
        return errorResponse(`Invalid status: ${rec.status}. Must be PRESENT, ABSENT, LATE, or EXCUSED`, 400)
      }
    }

    // Faculty (non-admin) may only mark attendance for their own courses
    const faculty = session.user.role === 'FACULTY'
      ? await assertFacultyOwnsCourse(session.user.id, courseId, semesterId)
      : await db.faculty.findUnique({ where: { userId: session.user.id } })

    const dateObj = new Date(date)

    // Upsert each attendance record
    const results = await Promise.all(
      records.map((rec: { studentId: string; status: AttendanceStatus; remarks?: string }) =>
        db.attendance.upsert({
          where: {
            studentId_courseId_semesterId_date: {
              studentId: rec.studentId,
              courseId,
              semesterId,
              date: dateObj,
            },
          },
          update: {
            status: rec.status,
            remarks: rec.remarks || null,
            markedBy: session.user.id,
            ...(faculty ? { facultyId: faculty.id } : {}),
          },
          create: {
            studentId: rec.studentId,
            courseId,
            semesterId,
            date: dateObj,
            status: rec.status,
            remarks: rec.remarks || null,
            markedBy: session.user.id,
            ...(faculty ? { facultyId: faculty.id } : {}),
          },
        })
      )
    )

    return successResponse({
      processed: results.length,
      date: dateObj,
    }, 'Attendance saved successfully')
  } catch (error) {
    return handleApiError(error, 'Failed to save attendance')
  }
}