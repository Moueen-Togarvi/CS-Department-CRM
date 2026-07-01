import { db } from '@/lib/db'
import { successResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { requireAuth, getSelfStudentId } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const now = new Date()
    const { searchParams } = new URL(request.url)
    const paramDate = searchParams.get('date')
    const paramDay = searchParams.get('day')
    
    let today = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
    if (paramDay) {
      today = paramDay.toUpperCase()
    } else if (paramDate) {
      const d = new Date(paramDate)
      if (!isNaN(d.getTime())) {
        today = d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
      }
    }
    const role = session.user.role

    // ── ADMIN ──────────────────────────────────────────────
    if (role === 'ADMIN') {
      const [
        totalStudents,
        totalFaculty,
        totalCourses,
        totalRooms,
        totalAnnouncements,
        activeSemester,
        currentSemesterEnrollments,
        upcomingEvents,
      ] = await Promise.all([
        db.student.count(),
        db.faculty.count(),
        db.course.count({ where: { isActive: true } }),
        db.room.count(),
        db.announcement.count({ where: { isPublished: true } }),
        db.semester.findFirst({ where: { isCurrent: true } }),
        db.semester.findFirst({
          where: { isCurrent: true },
          select: { id: true, _count: { select: { enrollments: true } } },
        }),
        db.announcement.findMany({
          where: { isPublished: true, eventDate: { gte: now } },
          orderBy: [{ priority: 'desc' }, { eventDate: 'asc' }],
          take: 5,
          select: { id: true, title: true, type: true, eventDate: true, eventLocation: true, content: true },
        }),
      ])

      return successResponse({
        role: 'ADMIN',
        totalStudents,
        totalFaculty,
        totalCourses,
        totalRooms,
        totalAnnouncements,
        activeSemester: activeSemester ? { id: activeSemester.id, name: activeSemester.name } : null,
        currentSemesterStudents: currentSemesterEnrollments?._count.enrollments ?? 0,
        upcomingEvents: upcomingEvents.map((e) => ({
          id: e.id, title: e.title, type: e.type,
          eventDate: e.eventDate?.toISOString() ?? null, eventLocation: e.eventLocation,
        })),
      })
    }

    // ── FACULTY ────────────────────────────────────────────
    if (role === 'FACULTY') {
      const faculty = await db.faculty.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      })

      if (!faculty) {
        return successResponse({ role: 'FACULTY', courses: [], todayClasses: [], pendingResults: 0, recentAnnouncements: [] })
      }


      const [offerings, todayClasses, pendingResults, recentAnnouncements] = await Promise.all([
        db.courseOffering.findMany({
          where: { facultyId: faculty.id },
          take: 10,
          include: {
            course: { select: { id: true, code: true, name: true } },
            semester: { select: { id: true, name: true } },
          },
        }),
        db.timetable.findMany({
          where: { facultyId: faculty.id, day: today as any },
          orderBy: { startTime: 'asc' },
          take: 5,
          select: { id: true, startTime: true, endTime: true, courseId: true, room: { select: { name: true } }, course: { select: { code: true, name: true } } },
        }),
        db.courseOffering.count({
          where: { facultyId: faculty.id },
        }),
        db.announcement.findMany({
          where: {
            isPublished: true,
            OR: [{ targetAudience: 'ALL' }, { targetAudience: 'FACULTY' }],
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, title: true, type: true, content: true, createdAt: true },
        }),
      ])

      return successResponse({
        role: 'FACULTY',
        courseCount: offerings.length,
        courses: offerings.map((o) => ({
          id: o.id,
          courseCode: o.course.code,
          courseName: o.course.name,
          semester: o.semester.name,
          section: o.section,
        })),
        todayClasses: todayClasses.map((t) => ({
          id: t.id,
          startTime: t.startTime,
          endTime: t.endTime,
          courseCode: t.course?.code || '',
          courseName: t.course?.name || '',
          room: t.room?.name || '',
        })),
        pendingResults: pendingResults,
        recentAnnouncements: recentAnnouncements.map((a) => ({
          id: a.id, title: a.title, type: a.type, content: a.content,
          publishedAt: a.createdAt.toISOString(),
        })),
        upcomingEvents: [],
      })
    }

    // ── STUDENT ────────────────────────────────────────────
    const studentId = await getSelfStudentId(session.user.id)
    const student = studentId
      ? await db.student.findUnique({
          where: { id: studentId },
          select: {
            id: true, studentId: true, currentSemester: true, section: true,
            gpa: true, totalCredits: true, program: true,
            user: { select: { name: true } },
          },
        })
      : null

    if (!student) {
      return successResponse({ role: 'STUDENT', attendanceRate: 0, courses: [], todayClasses: [], recentAnnouncements: [], upcomingEvents: [] })
    }


    const [attendanceRecords, enrolledCourses, todayClasses, recentAnnouncements, upcomingEvents] = await Promise.all([
      db.attendance.findMany({
        where: { studentId: student.id },
        select: { status: true },
      }),
      db.enrollment.findMany({
        where: { studentId: student.id, status: 'ENROLLED' },
        take: 6,
        include: {
          course: { select: { id: true, code: true, name: true, creditHours: true } },
          semester: { select: { name: true } },
        },
      }),
      db.timetable.findMany({
        where: {
          day: today as any,
          OR: [
            { course: { enrollments: { some: { studentId: student.id } } } },
          ],
        },
        orderBy: { startTime: 'asc' },
        take: 5,
        select: {
          id: true, startTime: true, endTime: true,
          course: { select: { code: true, name: true } },
          room: { select: { name: true } },
          faculty: { select: { user: { select: { name: true } } } },
        },
      }),
      db.announcement.findMany({
        where: {
          isPublished: true,
          OR: [
            { targetAudience: 'ALL' },
            { targetAudience: 'STUDENTS' },
            { targetSemester: student.currentSemester },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, type: true, content: true, createdAt: true },
      }),
      db.announcement.findMany({
        where: { isPublished: true, eventDate: { gte: now } },
        orderBy: [{ priority: 'desc' }, { eventDate: 'asc' }],
        take: 5,
        select: { id: true, title: true, type: true, eventDate: true, eventLocation: true },
      }),
    ])

    const present = attendanceRecords.filter((a) => a.status === 'PRESENT').length
    const attendanceRate = attendanceRecords.length > 0
      ? Math.round((present / attendanceRecords.length) * 100)
      : 0

    return successResponse({
      role: 'STUDENT',
      studentName: student.user.name,
      studentId: student.studentId,
      semester: student.currentSemester,
      section: student.section,
      gpa: student.gpa,
      totalCredits: student.totalCredits,
      program: student.program,
      attendanceRate,
      totalAttendanceRecords: attendanceRecords.length,
      courses: enrolledCourses.map((e) => ({
        id: e.course.id,
        code: e.course.code,
        name: e.course.name,
        creditHours: e.course.creditHours,
        semester: e.semester.name,
      })),
      todayClasses: todayClasses.map((t) => ({
        id: t.id,
        startTime: t.startTime,
        endTime: t.endTime,
        courseCode: t.course?.code || '',
        courseName: t.course?.name || '',
        room: t.room?.name || '',
        faculty: t.faculty?.user?.name || '',
      })),
      recentAnnouncements: recentAnnouncements.map((a) => ({
        id: a.id, title: a.title, type: a.type, content: a.content,
        publishedAt: a.createdAt.toISOString(),
      })),
      upcomingEvents: upcomingEvents.map((e) => ({
        id: e.id, title: e.title, type: e.type,
        eventDate: e.eventDate?.toISOString() ?? null, eventLocation: e.eventLocation,
      })),
    })
  } catch (error) {
    console.error('Dashboard overview error:', error)
    return successResponse(
      { error: 'Failed to load dashboard data' },
      'Error loading dashboard data',
      500
    )
  }
}
