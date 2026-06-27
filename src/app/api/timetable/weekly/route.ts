import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { DayOfWeek } from '@prisma/client'

const DAYS_ORDER: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']

function getSlotStartHour(time: string): number {
  return parseInt(time.split(':')[0], 10)
}

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
    const { searchParams } = new URL(request.url)
    const semesterId = searchParams.get('semesterId')

    if (!semesterId) {
      return errorResponse('semesterId is required', 400)
    }

    const section = searchParams.get('section') || undefined
    const facultyId = searchParams.get('facultyId') || undefined
    const roomId = searchParams.get('roomId') || undefined

    const where: any = { semesterId }
    if (section) where.section = section
    if (facultyId) where.facultyId = facultyId
    if (roomId) where.roomId = roomId

    const slots = await db.timetable.findMany({
      where,
      include: {
        course: {
          select: { id: true, code: true, name: true, courseType: true, creditHours: true },
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

    // Build the grid
    const grid: Record<string, Record<string, Array<{
      id: string
      course: { id: string; code: string; name: string; courseType: string }
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
      for (const ts of TIME_SLOTS) {
        grid[day][ts] = []
      }
    }

    for (const slot of slots) {
      const day = slot.day
      if (!grid[day]) continue

      const slotStartHour = getSlotStartHour(slot.startTime)
      const slotEndHour = getSlotStartHour(slot.endTime)
      const span = slotEndHour - slotStartHour

      // Place the slot at the starting time slot
      const timeKey = slot.startTime
      if (grid[day][timeKey] !== undefined) {
        grid[day][timeKey].push({
          id: slot.id,
          course: slot.course,
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

    return successResponse({
      days: DAYS_ORDER,
      timeSlots: TIME_SLOTS,
      grid,
    })
  } catch (error) {
    console.error('GET /api/timetable/weekly error:', error)
    return errorResponse('Failed to fetch weekly timetable', 500)
  }
}