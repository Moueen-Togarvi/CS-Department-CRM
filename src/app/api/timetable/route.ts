import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { parsePaginationParams, skipTake } from '@/lib/pagination'
import { paginatedResponse, successResponse, errorResponse } from '@/lib/api-response'
import { Prisma, DayOfWeek } from '@prisma/client'
import { requireAuth, requireAdmin, handleApiError } from '@/lib/auth-utils'

function timeOverlaps(startA: string, endA: string, startB: string, endB: string): boolean {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + (m || 0)
  }
  const aStart = toMin(startA)
  const aEnd = toMin(endA)
  const bStart = toMin(startB)
  const bEnd = toMin(endB)
  return aStart < bEnd && bStart < aEnd
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)
    const { page, limit, sort, order } = parsePaginationParams(searchParams)

    const semesterId = searchParams.get('semesterId') || undefined
    let facultyId = searchParams.get('facultyId') || undefined
    const roomId = searchParams.get('roomId') || undefined
    let section = searchParams.get('section') || undefined
    let academicSemester = searchParams.get('academicSemester') || undefined

    // Enforce role-based restrictions
    if (session.user.role === 'STUDENT') {
      const student = await db.student.findUnique({
        where: { userId: session.user.id },
      })
      if (student) {
        section = student.section || undefined
        academicSemester = String(student.currentSemester)
      }
    } else if (session.user.role === 'FACULTY') {
      const faculty = await db.faculty.findUnique({
        where: { userId: session.user.id },
      })
      if (faculty) {
        facultyId = faculty.id
      }
    }

    const where: Prisma.TimetableWhereInput = {}

    if (semesterId) where.semesterId = semesterId
    if (facultyId) where.facultyId = facultyId
    if (roomId) where.roomId = roomId
    if (section) where.section = section
    if (academicSemester) {
      where.course = {
        semesterOffered: parseInt(academicSemester, 10),
      }
    }

    const orderBy: Prisma.TimetableOrderByWithRelationInput = {}
    if (sort === 'day') {
      orderBy.day = order
    } else if (sort === 'startTime') {
      orderBy.startTime = order
    } else if (sort === 'course') {
      orderBy.course = { code: order }
    } else {
      orderBy.startTime = order
    }

    const { skip, take } = skipTake(page, limit)

    const [slots, total] = await Promise.all([
      db.timetable.findMany({
        where,
        include: {
          course: {
            select: { id: true, code: true, name: true, courseType: true, creditHours: true, semesterOffered: true },
          },
          faculty: {
            select: { id: true, facultyId: true, user: { select: { name: true } }, designation: true },
          },
          room: {
            select: { id: true, name: true, building: true, roomType: true },
          },
          semester: {
            select: { id: true, name: true },
          },
        },
        orderBy,
        skip,
        take,
      }),
      db.timetable.count({ where }),
    ])

    const data = slots.map((s) => ({
      id: s.id,
      courseId: s.courseId,
      course: {
        id: s.course.id,
        code: s.course.code,
        name: s.course.name,
        courseType: s.course.courseType,
        creditHours: s.course.creditHours,
        semesterOffered: s.course.semesterOffered,
      },
      facultyId: s.facultyId,
      faculty: {
        id: s.faculty.id,
        facultyId: s.faculty.facultyId,
        name: s.faculty.user.name,
        designation: s.faculty.designation,
      },
      semesterId: s.semesterId,
      semester: s.semester,
      roomId: s.roomId,
      room: s.room,
      section: s.section,
      day: s.day,
      startTime: s.startTime,
      endTime: s.endTime,
      slotType: s.slotType,
      isRecurring: s.isRecurring,
      effectiveFrom: s.effectiveFrom,
      effectiveTo: s.effectiveTo,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }))

    return paginatedResponse(data, total, page, limit)
  } catch (error) {
    return handleApiError(error, 'Failed to fetch timetable slots')
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const { courseId, facultyId, semesterId, roomId, section, day, startTime, endTime, slotType } = body

    if (!courseId || !facultyId || !semesterId || !roomId || !day || !startTime || !endTime) {
      return errorResponse('Missing required fields: courseId, facultyId, semesterId, roomId, day, startTime, endTime', 400)
    }

    const validDays: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
    if (!validDays.includes(day)) {
      return errorResponse('Invalid day. Must be MONDAY-SATURDAY', 400)
    }

    // Check room conflict (same room + day + overlapping time)
    const roomConflicts = await db.timetable.findMany({
      where: {
        roomId,
        semesterId,
        day,
      },
    })
    const hasRoomConflict = roomConflicts.some((c) =>
      timeOverlaps(startTime, endTime, c.startTime, c.endTime)
    )
    if (hasRoomConflict) {
      return errorResponse('Room conflict: This room is already occupied at the selected time on this day', 409)
    }

    // Check faculty conflict (same faculty + day + overlapping time)
    const facultyConflicts = await db.timetable.findMany({
      where: {
        facultyId,
        semesterId,
        day,
      },
    })
    const hasFacultyConflict = facultyConflicts.some((c) =>
      timeOverlaps(startTime, endTime, c.startTime, c.endTime)
    )
    if (hasFacultyConflict) {
      return errorResponse('Faculty conflict: This faculty member already has a class at the selected time on this day', 409)
    }

    const slot = await db.timetable.create({
      data: {
        courseId,
        facultyId,
        semesterId,
        roomId,
        section: section || 'A',
        day,
        startTime,
        endTime,
        slotType: slotType || 'THEORY',
      },
      include: {
        course: { select: { id: true, code: true, name: true, courseType: true } },
        faculty: { select: { id: true, facultyId: true, user: { select: { name: true } } } },
        room: { select: { id: true, name: true, building: true } },
      },
    })

    return successResponse(
      {
        ...slot,
        faculty: { ...slot.faculty, name: slot.faculty.user.name },
      },
      'Timetable slot created successfully',
      201
    )
  } catch (error) {
    return handleApiError(error, 'Failed to create timetable slot')
  }
}