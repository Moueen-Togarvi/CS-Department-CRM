import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { requireAuth, handleApiError } from '@/lib/auth-utils'

export async function GET() {
  try {
    await requireAuth()
    const [total, byStatus, byDomain] = await Promise.all([
      db.project.count(),
      db.project.groupBy({ by: ['status'], _count: { status: true } }),
      db.project.groupBy({
        by: ['domain'],
        where: { domain: { not: null } },
        _count: { domain: true },
      }),
    ])

    const statusMap: Record<string, number> = {}
    for (const item of byStatus) {
      statusMap[item.status] = item._count.status
    }

    const domainMap: Record<string, number> = {}
    for (const item of byDomain) {
      domainMap[item.domain!] = item._count.domain
    }

    return successResponse({
      total,
      byStatus: statusMap,
      byDomain: domainMap,
    })
  } catch (error) {
    return handleApiError(error, 'Error loading project stats')
  }
}