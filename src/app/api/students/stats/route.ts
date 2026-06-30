import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { promises as fs } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [total, active, byBatchRaw, bySemesterRaw, bySemesterSectionRaw] = await Promise.all([
      db.student.count({
        where: { status: { not: 'INACTIVE' } },
      }),
      db.student.count({
        where: { status: 'ACTIVE' },
      }),
      db.student.groupBy({
        by: ['batch'],
        where: { status: { not: 'INACTIVE' }, batch: { not: null } },
        _count: true,
      }),
      db.student.groupBy({
        by: ['currentSemester'],
        where: { status: { not: 'INACTIVE' } },
        _count: true,
      }),
      db.student.groupBy({
        by: ['currentSemester', 'section'],
        where: { status: { not: 'INACTIVE' } },
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

    const filePath = path.join(process.cwd(), 'data', 'class-rooms.json')
    let fileMappings: Record<string, { roomId?: string; roomName?: string; floor?: number | null }> = {}
    try {
      const fileData = await fs.readFile(filePath, 'utf-8')
      fileMappings = JSON.parse(fileData)
    } catch (e) {
      // Ignore if file doesn't exist
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
    console.error('GET /api/students/stats error:', error)
    return errorResponse('Failed to fetch student stats', 500)
  }
}