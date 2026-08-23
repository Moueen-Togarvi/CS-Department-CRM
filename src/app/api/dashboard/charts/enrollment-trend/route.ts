import { db } from '@/lib/db'
import { successResponse } from '@/lib/api-response'
import { requireAdmin, AuthError, handleApiError } from '@/lib/auth-utils'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    // Count students per batch (enrollmentYear)
    const studentBatches = await db.student.groupBy({
      by: ['enrollmentYear'],
      _count: { id: true },
      orderBy: { enrollmentYear: 'asc' },
    })

    const data = studentBatches.map((batch) => ({
      semester: `Batch ${batch.enrollmentYear}`,
      students: batch._count.id,
    }))

    return successResponse(data)
  } catch (error) {
    // This route falls back to an empty 200/500 payload; auth failures
    // must not be swallowed into that.
    if (error instanceof AuthError) return handleApiError(error)
    console.error('Enrollment trend error:', error)
    return successResponse(
      [],
      'Error loading enrollment trend',
      500
    )
  }
}
