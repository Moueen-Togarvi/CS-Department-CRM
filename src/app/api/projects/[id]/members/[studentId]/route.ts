import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { requireFacultyOrAdmin, handleApiError } from '@/lib/auth-utils'
import { NextRequest } from 'next/server'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    await requireFacultyOrAdmin()
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
    return handleApiError(error, 'Error removing member')
  }
}