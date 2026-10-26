import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { parseBody } from '@/lib/validators/request'
import { updateDocumentSchema } from '@/lib/validators/document'
import { NextRequest } from 'next/server'
import { requireAuth, requireFacultyOrAdmin, assertFacultyOwnsCourse, AuthError, handleApiError } from '@/lib/auth-utils'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params
    const document = await db.document.findUnique({
      where: { id },
      include: {
        uploadedByUser: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, code: true, name: true } },
        semester: { select: { id: true, name: true } },
      },
    })

    if (!document) {
      return errorResponse('Document not found', 404)
    }

    return successResponse({
      ...document,
      uploadedByName: document.uploadedByUser.name,
    })
  } catch (error) {
    return handleApiError(error, 'Error loading document')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireFacultyOrAdmin()
    const { id } = await params
    const parsed = await parseBody(request, updateDocumentSchema)
    if (!parsed.ok) return parsed.response
    const { title, description, category, courseId, semesterNumber, facultyId, fileUrl, fileType, fileSize } =
      parsed.data

    const existing = await db.document.findUnique({ where: { id } })
    if (!existing) {
      return errorResponse('Document not found', 404)
    }
    if (session.user.role === 'FACULTY') {
      if (existing.uploadedBy !== session.user.id && existing.courseId) {
        try { await assertFacultyOwnsCourse(session.user.id, existing.courseId) }
        catch { throw new AuthError('You cannot edit this document', 403) }
      } else if (existing.uploadedBy !== session.user.id) {
        throw new AuthError('You cannot edit this document', 403)
      }
      if (courseId) await assertFacultyOwnsCourse(session.user.id, courseId)
    }

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (category !== undefined) updateData.category = category
    if (courseId !== undefined) updateData.courseId = courseId || null
    if (semesterNumber !== undefined) updateData.semesterNumber = semesterNumber ? Number(semesterNumber) : null
    if (facultyId !== undefined) updateData.facultyId = facultyId || null
    if (fileUrl !== undefined) updateData.fileUrl = fileUrl
    if (fileType !== undefined) updateData.fileType = fileType
    if (fileSize !== undefined) updateData.fileSize = Number(fileSize)

    const document = await db.document.update({
      where: { id },
      data: updateData,
      include: {
        uploadedByUser: { select: { id: true, name: true } },
        course: { select: { id: true, code: true, name: true } },
      },
    })

    return successResponse({
      ...document,
      uploadedByName: document.uploadedByUser.name,
      courseName: document.course?.name || null,
      courseCode: document.course?.code || null,
    })
  } catch (error) {
    return handleApiError(error, 'Error updating document')
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireFacultyOrAdmin()
    const { id } = await params
    const existing = await db.document.findUnique({ where: { id } })
    if (!existing) {
      return errorResponse('Document not found', 404)
    }
    if (session.user.role === 'FACULTY' && existing.uploadedBy !== session.user.id) {
      if (!existing.courseId) throw new AuthError('You cannot delete this document', 403)
      try { await assertFacultyOwnsCourse(session.user.id, existing.courseId) }
      catch { throw new AuthError('You cannot delete this document', 403) }
    }

    await db.document.delete({ where: { id } })
    return successResponse(null, 'Document deleted')
  } catch (error) {
    return handleApiError(error, 'Error deleting document')
  }
}
