import { NextRequest } from 'next/server'
import { getCompatibleSections, timeOverlaps } from '@/lib/calculations/timetable'
import { parseBody } from '@/lib/validators/request'
import { shiftTimeColumnSchema, removeTimeColumnSchema } from '@/lib/validators/timetable'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { DayOfWeek } from '@prisma/client'
import { requireAdmin, requireAuth, handleApiError } from '@/lib/auth-utils'

const DAYS_ORDER: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)
    const semesterId = searchParams.get('semesterId')

    if (!semesterId) {
      return errorResponse('semesterId is required', 400)
    }

    let section = searchParams.get('section') || undefined
    let facultyId = searchParams.get('facultyId') || undefined
    const roomId = searchParams.get('roomId') || undefined
    let academicSemester = searchParams.get('academicSemester') || undefined
    let studentCompatibleSections: string[] = []
    let studentSessionVal: string | null = null

    // Enforce role-based restrictions
    if (session.user.role === 'STUDENT') {
      const student = await db.student.findUnique({
        where: { userId: session.user.id },
      })
      if (student) {
        studentCompatibleSections = getCompatibleSections(student.section, student.session)
        academicSemester = String(student.currentSemester)
        studentSessionVal = student.session
      }
    } else if (session.user.role === 'FACULTY') {
      const faculty = await db.faculty.findUnique({
        where: { userId: session.user.id },
      })
      if (faculty) {
        facultyId = faculty.id
      }
    }

    let shift = searchParams.get('shift') || 'Morning'
    if (session.user.role === 'STUDENT' && studentSessionVal) {
      shift = studentSessionVal
    } else if (section) {
      if (section.toLowerCase().includes('evening')) {
        shift = 'Evening'
      } else if (section.toLowerCase().includes('morning')) {
        shift = 'Morning'
      }
    }

    const where: any = { semesterId }
    
    if (session.user.role === 'STUDENT') {
      if (studentCompatibleSections.length > 0) {
        where.section = { in: studentCompatibleSections }
      }
    } else if (section) {
      // "Morning A" must also match slots stored as the bare shift ("Morning")
      // or as just the letter ("A"), since section strings are inconsistent.
      const compatible = getCompatibleSections(section, shift)
      where.section = compatible.length > 0 ? { in: compatible } : section
    }

    if (facultyId) where.facultyId = facultyId
    if (roomId) where.roomId = roomId
    if (academicSemester) {
      where.course = {
        semesterOffered: parseInt(academicSemester, 10),
      }
    }

    const slots = await db.timetable.findMany({
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
      },
      orderBy: { startTime: 'asc' },
    })

    // Determine default base slots depending on shift/role
    let baseSlots = shift === 'Evening'
      ? ['11:00', '12:00', '13:00', '14:00', '15:00']
      : ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00']

    if (session.user.role === 'FACULTY' || session.user.role === 'STUDENT') {
      baseSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']
    }

    // Dynamically expand time slots with any scheduled starts/ends to prevent cut-off slots
    const timeSlots = [...baseSlots]
    for (const slot of slots) {
      if (slot.startTime && !timeSlots.includes(slot.startTime)) {
        timeSlots.push(slot.startTime)
      }
    }

    // Sort timeSlots chronologically
    timeSlots.sort((a, b) => {
      const [ah, am] = a.split(':').map(Number)
      const [bh, bm] = b.split(':').map(Number)
      if (ah !== bh) return ah - bh
      return am - bm
    })

    // Build the grid
    const grid: Record<string, Record<string, Array<{
      id: string
      course: { id: string; code: string; name: string; courseType: string; creditHours?: number; semesterOffered?: number | null }
      faculty: { id: string; name: string; designation: string }
      room: { id: string; name: string; building: string }
      section: string
      startTime: string
      endTime: string
      slotType: string
      span: number
    }>>> = {}

    for (const day of DAYS_ORDER) {
      grid[day] = {}
      for (const ts of timeSlots) {
        grid[day][ts] = []
      }
    }

    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number)
      return h * 60 + (m || 0)
    }

    for (const slot of slots) {
      const day = slot.day
      if (!grid[day]) continue

      // Calculate span based on exact minute difference
      const durationMinutes = toMin(slot.endTime) - toMin(slot.startTime)
      const span = Math.max(1, Math.ceil(durationMinutes / 60))

      // Place the slot at the starting time slot
      const timeKey = slot.startTime
      if (grid[day][timeKey] !== undefined) {
        grid[day][timeKey].push({
          id: slot.id,
          course: {
            id: slot.course.id,
            code: slot.course.code,
            name: slot.course.name,
            courseType: slot.course.courseType,
            creditHours: slot.course.creditHours,
            semesterOffered: slot.course.semesterOffered,
          },
          faculty: {
            id: slot.faculty.id,
            name: slot.faculty.user.name,
            designation: slot.faculty.designation,
          },
          room: slot.room,
          section: slot.section,
          startTime: slot.startTime,
          endTime: slot.endTime,
          slotType: slot.slotType,
          span,
        })
      }
    }

    const daysOff = section
      ? (
          await db.timetableDayOff.findMany({
            where: { semesterId, section },
            select: { day: true },
          })
        ).map((d) => d.day)
      : []

    return successResponse({
      days: DAYS_ORDER,
      timeSlots,
      grid,
      daysOff,
    })
  } catch (error) {
    console.error('GET /api/timetable/weekly error:', error)
    return errorResponse('Failed to fetch weekly timetable', 500)
  }
}

/** Renames a whole time column (e.g. 08:00 -> 08:30), moving every slot in it by the same offset. */
export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin()

    const parsed = await parseBody(request, shiftTimeColumnSchema)
    if (!parsed.ok) return parsed.response
    const { semesterId, oldStartTime, newStartTime, section, academicSemester, facultyId, roomId, shift } =
      parsed.data

    const where: any = { semesterId, startTime: oldStartTime }
    if (section) {
      const effectiveShift = shift || (section.toLowerCase().includes('evening') ? 'Evening' : 'Morning')
      const compatible = getCompatibleSections(section, effectiveShift)
      where.section = compatible.length > 0 ? { in: compatible } : section
    }
    if (facultyId) where.facultyId = facultyId
    if (roomId) where.roomId = roomId
    if (academicSemester) {
      where.course = { semesterOffered: parseInt(academicSemester, 10) }
    }

    const slotsToMove = await db.timetable.findMany({ where })
    if (slotsToMove.length === 0) {
      return errorResponse('No slots found in this time column to move', 404)
    }

    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number)
      return h * 60 + (m || 0)
    }
    const toTime = (mins: number) => {
      const h = Math.floor(mins / 60) % 24
      const m = mins % 60
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
    const offset = toMin(newStartTime) - toMin(oldStartTime)
    const movedIds = new Set(slotsToMove.map((s) => s.id))

    // Check every moved slot's new time against everything else in the semester
    // that isn't itself being moved (room + faculty conflicts).
    const others = await db.timetable.findMany({
      where: { semesterId, id: { notIn: Array.from(movedIds) } },
    })

    for (const slot of slotsToMove) {
      const newEnd = toTime(toMin(slot.endTime) + offset)
      if (newEnd <= newStartTime || toMin(newEnd) >= 24 * 60) {
        return errorResponse('The new time would push a slot past midnight or invert its duration', 400)
      }
      const conflict = others.find(
        (c) =>
          c.day === slot.day &&
          (c.roomId === slot.roomId || c.facultyId === slot.facultyId) &&
          timeOverlaps(newStartTime, newEnd, c.startTime, c.endTime)
      )
      if (conflict) {
        return errorResponse(
          `Cannot move to ${newStartTime}: conflicts with an existing slot on ${slot.day}`,
          409
        )
      }
    }

    await db.$transaction(
      slotsToMove.map((slot) =>
        db.timetable.update({
          where: { id: slot.id },
          data: { startTime: newStartTime, endTime: toTime(toMin(slot.endTime) + offset) },
        })
      )
    )

    return successResponse({ moved: slotsToMove.length }, 'Time column updated successfully')
  } catch (error) {
    return handleApiError(error, 'Failed to update time column')
  }
}

/** Removes every slot in one time column, scoped to the current semester/section/faculty/room filters. */
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin()
    const parsed = await parseBody(request, removeTimeColumnSchema)
    if (!parsed.ok) return parsed.response
    const { semesterId, startTime, section, academicSemester, facultyId, roomId, shift } = parsed.data

    const where: any = { semesterId, startTime }
    if (section) {
      const effectiveShift = shift || (section.toLowerCase().includes('evening') ? 'Evening' : 'Morning')
      const compatible = getCompatibleSections(section, effectiveShift)
      where.section = compatible.length > 0 ? { in: compatible } : section
    }
    if (facultyId) where.facultyId = facultyId
    if (roomId) where.roomId = roomId
    if (academicSemester) {
      where.course = { semesterOffered: parseInt(academicSemester, 10) }
    }

    const result = await db.timetable.deleteMany({ where })

    return successResponse({ removed: result.count }, 'Time slot column removed')
  } catch (error) {
    return handleApiError(error, 'Failed to remove time column')
  }
}
