import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { requireFacultyOrAdmin, handleApiError, getFacultySectionScope, scopeToWhere } from '@/lib/auth-utils'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await requireFacultyOrAdmin()

    // Faculty section scope (semester + section level)
    const facultyScope = await getFacultySectionScope(session)
    const scopeWhere = scopeToWhere(facultyScope) as Prisma.StudentWhereInput

    const [total, active, byBatchRaw, bySemesterRaw, bySemesterSectionRaw] = await Promise.all([
      db.student.count({
        where: {
          status: { not: 'INACTIVE' },
          ...scopeWhere,
        },
      }),
      db.student.count({
        where: {
          status: 'ACTIVE',
          ...scopeWhere,
        },
      }),
      db.student.groupBy({
        by: ['batch'],
        where: {
          status: { not: 'INACTIVE' },
          batch: { not: null },
          ...scopeWhere,
        },
        _count: true,
      }),
      db.student.groupBy({
        by: ['currentSemester'],
        where: {
          status: { not: 'INACTIVE' },
          ...scopeWhere,
        },
        _count: true,
      }),
      db.student.groupBy({
        by: ['currentSemester', 'section'],
        where: {
          status: { not: 'INACTIVE' },
          ...scopeWhere,
        },
        _count: true,
      }),
    ])

    const byBatch: Record<string, number> = {}
    for (const item of byBatchRaw) {
      if (item.batch) {
        byBatch[item.batch] = item._count
      }
    }

    const bySemester: Record<string, number> = {}
    for (const item of bySemesterRaw) {
      bySemester[String(item.currentSemester)] = item._count
    }

    let assignments: { semester: number; section: string; roomId: string | null; roomName: string | null; floor: number | null }[] = []
    try {
      assignments = await db.classRoomAssignment.findMany()
    } catch {
      // Table may not exist yet before `prisma db push` is run — degrade gracefully.
      assignments = []
    }
    let fileMappings: Record<string, { roomId?: string | null; roomName?: string | null; floor?: number | null }> = {}
    for (const a of assignments) {
      fileMappings[`${a.semester}-${a.section}`] = {
        roomId: a.roomId ?? undefined,
        roomName: a.roomName ?? undefined,
        floor: a.floor ?? undefined,
      }
    }

    const bySemesterSection = await Promise.all(
      bySemesterSectionRaw.map(async (item) => {
        const semester = item.currentSemester
        const section = item.section || 'Unassigned'
        const key = `${semester}-${section}`
        const customMapping = fileMappings[key]

        let roomName = 'N/A'
        let floor: number | null = null
        let building: string | null = null
        let shift = 'Morning'

        if (section.toLowerCase().includes('evening')) {
          shift = 'Evening'
        } else if (section.toLowerCase().includes('morning')) {
          shift = 'Morning'
        }

        if (customMapping) {
          roomName = customMapping.roomName || 'N/A'
          floor = customMapping.floor !== undefined ? customMapping.floor : null
        } else if (section !== 'Unassigned') {
          const timetableEntry = await db.timetable.findFirst({
            where: {
              section: section,
              course: {
                semesterOffered: semester,
              },
            },
            include: {
              room: true,
            },
          })

          if (timetableEntry?.room) {
            roomName = timetableEntry.room.name
            floor = timetableEntry.room.floor
            building = timetableEntry.room.building
          }
        }

        return {
          semester,
          section,
          count: item._count,
          room: roomName,
          floor: floor,
          building: building,
          shift: shift,
        }
      })
    )

    return successResponse({ total, active, byBatch, bySemester, bySemesterSection })
  } catch (error) {
    return handleApiError(error, 'Failed to fetch student stats')
  }
}