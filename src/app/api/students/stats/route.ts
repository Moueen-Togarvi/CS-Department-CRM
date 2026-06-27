import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'

export async function GET() {
  try {
    const [total, active, byBatchRaw, bySemesterRaw] = await Promise.all([
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

    return successResponse({ total, active, byBatch, bySemester })
  } catch (error) {
    console.error('GET /api/students/stats error:', error)
    return errorResponse('Failed to fetch student stats', 500)
  }
}