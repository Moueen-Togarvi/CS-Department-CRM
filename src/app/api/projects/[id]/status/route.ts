import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { ProjectStatus } from '@prisma/client'

const VALID_TRANSITIONS: Record<string, string[]> = {
  PROPOSED: ['APPROVED'],
  APPROVED: ['IN_PROGRESS'],
  IN_PROGRESS: ['SUBMITTED'],
  SUBMITTED: ['EVALUATED'],
  EVALUATED: ['DEFENDED', 'FAILED'],
  DEFENDED: ['PASSED'],
  FAILED: ['PROPOSED'],
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status || !Object.values(ProjectStatus).includes(status)) {
      return errorResponse('Invalid status')
    }

    const project = await db.project.findUnique({ where: { id } })
    if (!project) {
      return errorResponse('Project not found', 404)
    }

    const allowedTransitions = VALID_TRANSITIONS[project.status]
    if (!allowedTransitions || !allowedTransitions.includes(status)) {
      return errorResponse(
        `Cannot transition from ${project.status} to ${status}. Allowed: ${allowedTransitions?.join(', ') || 'none'}`
      )
    }

    const updateData: any = { status }
    if (status === 'APPROVED') {
      updateData.proposedAt = new Date()
    }
    if (status === 'SUBMITTED') {
      updateData.finalReportUrl = 'submitted'
    }
    if (status === 'DEFENDED') {
      updateData.defenseDate = new Date()
    }

    const updated = await db.project.update({
      where: { id },
      data: updateData,
      include: {
        supervisor: { select: { user: { select: { name: true } } } },
      },
    })

    return successResponse({
      ...updated,
      supervisorName: updated.supervisor.user.name,
    })
  } catch (error) {
    console.error('Update status error:', error)
    return errorResponse('Error updating project status', 500)
  }
}