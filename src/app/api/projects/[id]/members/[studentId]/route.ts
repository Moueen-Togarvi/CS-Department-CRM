import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const { id, studentId } = await params

    const member = await db.projectMember.findFirst({
      where: { projectId: id, studentId },
    })

    if (!member) {
      return errorResponse('Member not found', 404)
    }

    await db.projectMember.delete({ where: { id: member.id } })
    return successResponse(null, 'Member removed')
  } catch (error) {
    console.error('Remove member error:', error)
    return errorResponse('Error removing member', 500)
  }
}