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
        by: ['currentSemester', 'section', 'departmentId', 'batch'],
        where: {
          status: 'ACTIVE',
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
    const departments = await db.department.findMany({ select: { id: true, code: true } })
    const departmentCodeById = new Map(departments.map((department) => [department.id, department.code]))

    const sections = [...new Set(bySemesterSectionRaw.map((item) => item.section).filter((section): section is string => Boolean(section)))]
    const semesters = [...new Set(bySemesterSectionRaw.map((item) => item.currentSemester))]
    const timetableEntries = sections.length && semesters.length
      ? await db.timetable.findMany({
          where: { section: { in: sections }, course: { semesterOffered: { in: semesters } } },
          select: {
            section: true,
            course: { select: { semesterOffered: true } },
            room: { select: { name: true, floor: true, building: true } },
          },
        })
      : []
    const roomBySemesterSection = new Map<string, (typeof timetableEntries)[number]['room']>()
    for (const entry of timetableEntries) {
      const key = `${entry.course.semesterOffered}-${entry.section}`
      if (!roomBySemesterSection.has(key)) roomBySemesterSection.set(key, entry.room)
    }

    const bySemesterSection = bySemesterSectionRaw.map((item) => {
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
        const room = roomBySemesterSection.get(key)
        if (room) {
          roomName = room.name
          floor = room.floor
          building = room.building
        }
      }

      return {
        semester,
        section,
        departmentId: item.departmentId,
        departmentCode: departmentCodeById.get(item.departmentId) ?? '',
        batch: item.batch,
        count: item._count,
        room: roomName,
        floor,
        building,
        shift,
      }
    })

    return successResponse({ total, active, byBatch, bySemester, bySemesterSection })
  } catch (error) {
    return handleApiError(error, 'Failed to fetch student stats')
  }
}
