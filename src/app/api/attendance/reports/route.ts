import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { Prisma } from '@prisma/client'
import { requireFacultyOrAdmin, handleApiError } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const session = await requireFacultyOrAdmin()
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId') || undefined
    const dateFrom = searchParams.get('dateFrom') || undefined
    const dateTo = searchParams.get('dateTo') || undefined
    const semesterId = searchParams.get('semesterId') || undefined

    const where: Prisma.AttendanceWhereInput = {}
    if (courseId) where.courseId = courseId
    if (semesterId) where.semesterId = semesterId
    if (dateFrom || dateTo) {
      where.date = {}
      if (dateFrom) where.date.gte = new Date(dateFrom)
      if (dateTo) where.date.lte = new Date(dateTo)
    }

    // Faculty can only see reports for their own classes
    if (session.user.role === 'FACULTY') {
      const faculty = await db.faculty.findUnique({ where: { userId: session.user.id } })
      where.facultyId = faculty?.id ?? '__none__'
    }

    // Get all attendance records grouped by date
    const records = await db.attendance.findMany({
      where,
      select: {
        date: true,
        courseId: true,
        status: true,
        course: { select: { id: true, code: true, name: true } },
      },
      orderBy: { date: 'asc' },
    })

    // Group by date
    const dateMap: Record<string, {
      date: string
      courses: Record<string, {
        courseId: string
        courseCode: string
        courseName: string
        present: number
        absent: number
        late: number
        excused: number
        total: number
      }>
    }> = {}

    for (const r of records) {
      const dateKey = r.date.toISOString().split('T')[0]
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = { date: dateKey, courses: {} }
      }
      if (!dateMap[dateKey].courses[r.courseId]) {
        dateMap[dateKey].courses[r.courseId] = {
          courseId: r.courseId,
          courseCode: r.course.code,
          courseName: r.course.name,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          total: 0,
        }
      }
      const courseStat = dateMap[dateKey].courses[r.courseId]
      courseStat.total++
      switch (r.status) {
        case 'PRESENT': courseStat.present++; break
        case 'ABSENT': courseStat.absent++; break
        case 'LATE': courseStat.late++; break
        case 'EXCUSED': courseStat.excused++; break
      }
    }

    const dailyBreakdown = Object.values(dateMap).map((d) => ({
      date: d.date,
      courses: Object.values(d.courses),
    }))

    // Overall stats
    const totalRecords = records.length
    const totalPresent = records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length
    const overallPercentage = totalRecords > 0
      ? Math.round((totalPresent / totalRecords) * 1000) / 10
      : 0

    return successResponse({
      dailyBreakdown,
      stats: {
        totalRecords,
        totalPresent,
        totalAbsent: records.filter((r) => r.status === 'ABSENT').length,
        overallPercentage,
      },
    })
  } catch (error) {
    return handleApiError(error, 'Failed to fetch attendance reports')
  }
}