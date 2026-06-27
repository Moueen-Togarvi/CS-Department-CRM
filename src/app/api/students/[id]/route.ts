import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { updateStudentSchema } from '@/lib/validators/student'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const student = await db.student.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            avatar: true,
            isActive: true,
            lastLogin: true,
            createdAt: true,
          },
        },
        department: {
          select: { id: true, name: true, code: true },
        },
        enrollments: {
          include: {
            course: {
              select: { id: true, code: true, name: true, creditHours: true },
            },
            semester: {
              select: { id: true, name: true, type: true, year: true },
            },
          },
          orderBy: { enrollmentDate: 'desc' },
        },
        results: {
          include: {
            course: {
              select: { id: true, code: true, name: true, creditHours: true },
            },
            semester: {
              select: { id: true, name: true, type: true, year: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!student) {
      return errorResponse('Student not found', 404)
    }

    // Compute attendance summary per course
    const attendanceRecords = await db.attendance.findMany({
      where: { studentId: id },
      select: {
        courseId: true,
        status: true,
        course: {
          select: { id: true, code: true, name: true },
        },
      },
    })

    const attendanceMap = new Map<string, { course: typeof attendanceRecords[0]['course']; total: number; present: number; late: number; excused: number }>()

    for (const record of attendanceRecords) {
      if (!attendanceMap.has(record.courseId)) {
        attendanceMap.set(record.courseId, {
          course: record.course,
          total: 0,
          present: 0,
          late: 0,
          excused: 0,
        })
      }
      const entry = attendanceMap.get(record.courseId)!
      entry.total++
      if (record.status === 'PRESENT') entry.present++
      if (record.status === 'LATE') entry.late++
      if (record.status === 'EXCUSED') entry.excused++
    }

    const attendanceSummary = Array.from(attendanceMap.values()).map((entry) => ({
      courseId: entry.course.id,
      courseCode: entry.course.code,
      courseName: entry.course.name,
      total: entry.total,
      present: entry.present,
      late: entry.late,
      excused: entry.excused,
      percentage: entry.total > 0 ? Math.round(((entry.present + entry.late) / entry.total) * 100) : 0,
    }))

    return successResponse({
      ...student,
      attendanceSummary,
    })
  } catch (error) {
    console.error('GET /api/students/[id] error:', error)
    return errorResponse('Failed to fetch student details', 500)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.student.findUnique({
      where: { id },
      include: { user: true },
    })

    if (!existing) {
      return errorResponse('Student not found', 404)
    }

    const body = await request.json()
    const parsed = updateStudentSchema.safeParse(body)

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return errorResponse(firstError.message, 400)
    }

    const data = parsed.data

    // Build update data - exclude email, studentId, userId
    const studentUpdateData: Record<string, unknown> = {}
    const userUpdateData: Record<string, unknown> = {}

    if (data.name !== undefined) {
      userUpdateData.name = data.name
    }

    if (data.currentSemester !== undefined) {
      studentUpdateData.currentSemester = data.currentSemester
    }
    if (data.enrollmentYear !== undefined) {
      studentUpdateData.enrollmentYear = data.enrollmentYear
    }
    if (data.batch !== undefined) {
      studentUpdateData.batch = data.batch || null
    }
    if (data.program !== undefined) {
      studentUpdateData.program = data.program
    }
    if (data.gender !== undefined) {
      studentUpdateData.gender = data.gender
    }
    if (data.dateOfBirth !== undefined) {
      studentUpdateData.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null
    }
    if (data.phone !== undefined) {
      userUpdateData.phone = data.phone
    }
    if (data.address !== undefined) {
      studentUpdateData.address = data.address
    }
    if (data.guardianName !== undefined) {
      studentUpdateData.guardianName = data.guardianName
    }
    if (data.guardianPhone !== undefined) {
      studentUpdateData.guardianPhone = data.guardianPhone
    }
    if (data.emergencyContact !== undefined) {
      studentUpdateData.emergencyContact = data.emergencyContact
    }

    const student = await db.$transaction(async (tx) => {
      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id: existing.userId },
          data: userUpdateData,
        })
      }

      return tx.student.update({
        where: { id },
        data: studentUpdateData,
        include: {
          user: {
            select: { email: true, name: true, isActive: true },
          },
          department: {
            select: { id: true, name: true, code: true },
          },
        },
      })
    })

    return successResponse({
      id: student.id,
      studentId: student.studentId,
      name: student.user.name,
      email: student.user.email,
      batch: student.batch,
      currentSemester: student.currentSemester,
      program: student.program,
      gpa: student.gpa,
      status: student.status,
      gender: student.gender,
      department: student.department,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
    }, 'Student updated successfully')
  } catch (error) {
    console.error('PUT /api/students/[id] error:', error)
    return errorResponse('Failed to update student', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.student.findUnique({
      where: { id },
      include: { user: true },
    })

    if (!existing) {
      return errorResponse('Student not found', 404)
    }

    // Soft delete: deactivate user and set student status to INACTIVE
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existing.userId },
        data: { isActive: false },
      })
      await tx.student.update({
        where: { id },
        data: { status: 'INACTIVE' },
      })
    })

    return successResponse(null, 'Student deactivated successfully')
  } catch (error) {
    console.error('DELETE /api/students/[id] error:', error)
    return errorResponse('Failed to deactivate student', 500)
  }
}