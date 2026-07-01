import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { requireAdmin, handleApiError } from '@/lib/auth-utils'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await request.json()
    const { facultyId, section, slotType } = body

    const existing = await db.courseOffering.findUnique({ where: { id } })
    if (!existing) {
      return errorResponse('Course offering not found', 404)
    }

    // If changing faculty, enforce load limit
    if (facultyId && facultyId !== existing.facultyId) {
      const faculty = await db.faculty.findUnique({ where: { id: facultyId } })
      if (!faculty) return errorResponse('Faculty not found', 404)

      const currentCount = await db.courseOffering.count({
        where: { facultyId, semesterId: existing.semesterId, isActive: true },
      })
      if (currentCount >= faculty.maxCoursesPerSemester) {
        return errorResponse(
          `Faculty already has ${currentCount} assignments (max: ${faculty.maxCoursesPerSemester})`,
          409
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (facultyId !== undefined) updateData.facultyId = facultyId
    if (section !== undefined) updateData.section = section
    if (slotType !== undefined) updateData.slotType = slotType

    const updated = await db.courseOffering.update({
      where: { id },
      data: updateData,
      include: {
        course: { select: { id: true, code: true, name: true } },
        faculty: { select: { id: true, facultyId: true, user: { select: { name: true } } } },
        semester: { select: { id: true, name: true } },
      },
    })

    return successResponse(updated, 'Assignment updated')
  } catch (error) {
    return handleApiError(error, 'Failed to update assignment')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params

    const offering = await db.courseOffering.findUnique({ where: { id } })
    if (!offering) {
      return errorResponse('Course offering not found', 404)
    }

    await db.courseOffering.update({
      where: { id },
      data: { isActive: false },
    })

    return successResponse(null, 'Course assignment removed')
  } catch (error) {
    return handleApiError(error, 'Failed to remove course assignment')
  }
}
