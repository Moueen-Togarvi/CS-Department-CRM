import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { parseBody } from '@/lib/validators/request'
import { updateMilestoneSchema } from '@/lib/validators/project'
import { requireFacultyOrAdmin, handleApiError } from '@/lib/auth-utils'
import { NextRequest } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  try {
    await requireFacultyOrAdmin()
    const { id, milestoneId } = await params
    const parsed = await parseBody(request, updateMilestoneSchema)
    if (!parsed.ok) return parsed.response
    const { status, completedDate, feedback } = parsed.data

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
    return handleApiError(error, 'Error updating milestone')
  }
}