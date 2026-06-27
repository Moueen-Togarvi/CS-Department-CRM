import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  try {
    const { id, milestoneId } = await params
    const body = await request.json()
    const { status, completedDate, feedback } = body

    const milestone = await db.projectMilestone.findFirst({
      where: { id: milestoneId, projectId: id },
    })

    if (!milestone) {
      return errorResponse('Milestone not found', 404)
    }

    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (completedDate !== undefined) {
      updateData.completedDate = completedDate ? new Date(completedDate) : null
    } else if (status === 'COMPLETED' && !milestone.completedDate) {
      updateData.completedDate = new Date()
    }
    if (feedback !== undefined) updateData.feedback = feedback

    const updated = await db.projectMilestone.update({
      where: { id: milestoneId },
      data: updateData,
    })

    return successResponse(updated)
  } catch (error) {
    console.error('Update milestone error:', error)
    return errorResponse('Error updating milestone', 500)
  }
}