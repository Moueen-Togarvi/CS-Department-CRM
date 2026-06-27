import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { parsePaginationParams, skipTake } from '@/lib/pagination'
import { paginatedResponse, errorResponse } from '@/lib/api-response'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { page, limit } = parsePaginationParams(searchParams)

    const courseId = searchParams.get('courseId') || undefined
    const studentId = searchParams.get('studentId') || undefined
    const semesterId = searchParams.get('semesterId') || undefined
    const dateFrom = searchParams.get('dateFrom') || undefined
    const dateTo = searchParams.get('dateTo') || undefined

    const where: Prisma.AttendanceWhereInput = {}

    if (courseId) where.courseId = courseId
    if (studentId) where.studentId = studentId
    if (semesterId) where.semesterId = semesterId
    if (dateFrom || dateTo) {
      where.date = {}
      if (dateFrom) where.date.gte = new Date(dateFrom)
      if (dateTo) where.date.lte = new Date(dateTo)
    }

    const { skip, take } = skipTake(page, limit)

    const [records, total] = await Promise.all([
      db.attendance.findMany({
        where,
        include: {
          student: {
            select: { id: true, studentId: true, user: { select: { name: true, email: true } } },
          },
          course: {
            select: { id: true, code: true, name: true },
          },
          faculty: {
            select: { id: true, user: { select: { name: true } } },
          },
        },
        orderBy: { date: 'desc' },
        skip,
        take,
      }),
      db.attendance.count({ where }),
    ])

    const data = records.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      student: r.student ? {
        id: r.student.id,
        studentId: r.student.studentId,
        name: r.student.user.name,
        email: r.student.user.email,
      } : null,
      courseId: r.courseId,
      course: r.course,
      facultyId: r.facultyId,
      faculty: r.faculty ? { name: r.faculty.user.name } : null,
      semesterId: r.semesterId,
      date: r.date,
      status: r.status,
      remarks: r.remarks,
      createdAt: r.createdAt,
    }))

    return paginatedResponse(data, total, page, limit)
  } catch (error) {
    console.error('GET /api/attendance error:', error)
    return errorResponse('Failed to fetch attendance records', 500)
  }
}