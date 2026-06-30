import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'

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

    const bySemesterSection = bySemesterSectionRaw.map((item) => ({
      semester: item.currentSemester,
      section: item.section || 'Unassigned',
      count: item._count,
    }))

    return successResponse({ total, active, byBatch, bySemester, bySemesterSection })
  } catch (error) {
    console.error('GET /api/students/stats error:', error)
    return errorResponse('Failed to fetch student stats', 500)
  }
}