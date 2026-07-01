import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { DayOfWeek } from '@prisma/client'
import { requireAdmin, handleApiError } from '@/lib/auth-utils'

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const existing = await db.timetable.findUnique({ where: { id } })
    if (!existing) {
      return errorResponse('Timetable slot not found', 404)
    }

    const body = await request.json()
    const { courseId, facultyId, semesterId, roomId, section, day, startTime, endTime, slotType } = body

    const updateData: any = {}
    if (courseId) updateData.courseId = courseId
    if (facultyId) updateData.facultyId = facultyId
    if (semesterId) updateData.semesterId = semesterId
    if (roomId) updateData.roomId = roomId
    if (section !== undefined) updateData.section = section
    if (day) updateData.day = day
    if (startTime) updateData.startTime = startTime
    if (endTime) updateData.endTime = endTime
    if (slotType) updateData.slotType = slotType

    const checkDay = (updateData.day || existing.day) as DayOfWeek
    const checkStart = updateData.startTime || existing.startTime
    const checkEnd = updateData.endTime || existing.endTime
    const checkRoom = updateData.roomId || existing.roomId
    const checkFaculty = updateData.facultyId || existing.facultyId
    const checkSemester = updateData.semesterId || existing.semesterId

    // Check room conflict (exclude current slot)
    const roomConflicts = await db.timetable.findMany({
      where: {
        roomId: checkRoom,
        semesterId: checkSemester,
        day: checkDay,
        id: { not: id },
      },
    })
    const hasRoomConflict = roomConflicts.some((c) =>
      timeOverlaps(checkStart, checkEnd, c.startTime, c.endTime)
    )
    if (hasRoomConflict) {
      return errorResponse('Room conflict: This room is already occupied at the selected time on this day', 409)
    }

    // Check faculty conflict (exclude current slot)
    const facultyConflicts = await db.timetable.findMany({
      where: {
        facultyId: checkFaculty,
        semesterId: checkSemester,
        day: checkDay,
        id: { not: id },
      },
    })
    const hasFacultyConflict = facultyConflicts.some((c) =>
      timeOverlaps(checkStart, checkEnd, c.startTime, c.endTime)
    )
    if (hasFacultyConflict) {
      return errorResponse('Faculty conflict: This faculty member already has a class at the selected time on this day', 409)
    }

    const slot = await db.timetable.update({
      where: { id },
      data: updateData,
      include: {
        course: { select: { id: true, code: true, name: true, courseType: true } },
        faculty: { select: { id: true, facultyId: true, user: { select: { name: true } } } },
        room: { select: { id: true, name: true, building: true } },
        semester: { select: { id: true, name: true } },
      },
    })

    return successResponse({
      id: slot.id,
      courseId: slot.courseId,
      course: slot.course,
      facultyId: slot.facultyId,
      faculty: { ...slot.faculty, name: slot.faculty.user.name },
      semesterId: slot.semesterId,
      semester: slot.semester,
      roomId: slot.roomId,
      room: slot.room,
      section: slot.section,
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      slotType: slot.slotType,
    }, 'Timetable slot updated successfully')
  } catch (error) {
    return handleApiError(error, 'Failed to update timetable slot')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const existing = await db.timetable.findUnique({ where: { id } })
    if (!existing) {
      return errorResponse('Timetable slot not found', 404)
    }

    await db.timetable.delete({ where: { id } })
    return successResponse(null, 'Timetable slot deleted successfully')
  } catch (error) {
    return handleApiError(error, 'Failed to delete timetable slot')
  }
}