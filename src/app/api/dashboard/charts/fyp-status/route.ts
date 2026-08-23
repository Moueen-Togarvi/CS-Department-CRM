import { db } from '@/lib/db'
import { successResponse } from '@/lib/api-response'
import { requireAdmin, AuthError, handleApiError } from '@/lib/auth-utils'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    // Count projects per status
    const statusCounts = await db.project.groupBy({
      by: ['status'],
      _count: { id: true },
    })

    const data = statusCounts.map((s) => ({
      status: formatStatus(s.status),
      count: s._count.id,
    }))

    return successResponse(data)
  } catch (error) {
    // This route falls back to an empty 200/500 payload; auth failures
    // must not be swallowed into that.
    if (error instanceof AuthError) return handleApiError(error)
    console.error('FYP status error:', error)
    return successResponse(
      [],
      'Error loading FYP status',
      500
    )
  }
}

function formatStatus(status: string): string {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
