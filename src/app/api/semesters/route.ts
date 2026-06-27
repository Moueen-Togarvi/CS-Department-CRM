import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const currentOnly = searchParams.get('current') === 'true'

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
    console.error('GET /api/semesters error:', error)
    return errorResponse('Failed to fetch semesters', 500)
  }
}