import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { requireAuth, handleApiError } from '@/lib/auth-utils'
import { getOrCreateCurrentSemester } from '@/lib/semester'

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const { searchParams } = new URL(request.url)
    const currentOnly = searchParams.get('current') === 'true'

    // Every semester-scoped feature needs one "current" row to exist. There is
    // no UI to create one, so provision it automatically rather than leaving
    // the whole app dead-ended.
    if ((await db.semester.count({ where: { isCurrent: true } })) === 0) {
      await getOrCreateCurrentSemester()
    }

    const where: any = {}
    if (currentOnly) {
      where.isCurrent = true
    }

    const semesters = await db.semester.findMany({
      where,
      select: {
        id: true,
        name: true,
        type: true,
        year: true,
        status: true,
        isCurrent: true,
        startDate: true,
        endDate: true,
      },
      orderBy: [{ year: 'desc' }, { type: 'asc' }],
    })

    return successResponse(semesters)
  } catch (error) {
    return handleApiError(error, 'Failed to fetch semesters')
  }
}