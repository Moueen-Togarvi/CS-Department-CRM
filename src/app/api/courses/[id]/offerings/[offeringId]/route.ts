import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { requireAdmin, handleApiError } from '@/lib/auth-utils'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; offeringId: string }> }
) {
  try {
    await requireAdmin()
    const { id: courseId, offeringId } = await params

    const offering = await db.courseOffering.findUnique({
      where: { id: offeringId },
    })

    if (!offering || offering.courseId !== courseId) {
      return errorResponse('Offering not found', 404)
    }

    await db.courseOffering.delete({
      where: { id: offeringId },
    })

    return successResponse(null, 'Assignment removed successfully')
  } catch (error) {
    return handleApiError(error, 'Failed to remove assignment')
  }
}
