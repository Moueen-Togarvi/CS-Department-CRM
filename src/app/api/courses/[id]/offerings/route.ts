import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { requireAdmin, handleApiError } from '@/lib/auth-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params

    const offerings = await db.courseOffering.findMany({
      where: { courseId },
      include: {
        faculty: {
          select: {
            id: true,
            facultyId: true,
            designation: true,
            user: { select: { name: true } },
          },
        },
        semester: {
          select: { id: true, name: true, isCurrent: true },
        },
      },
      orderBy: [{ semester: { isCurrent: 'desc' } }, { section: 'asc' }],
    })

    return successResponse(offerings)
  } catch (error) {
    return handleApiError(error, 'Failed to fetch offerings')
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id: courseId } = await params
    const body = await request.json()

    const { facultyId, section, semesterId, slotType } = body

    if (!facultyId || !section) {
      return errorResponse('facultyId and section are required', 400)
    }

    const course = await db.course.findUnique({ where: { id: courseId } })
    if (!course) {
      return errorResponse('Course not found', 404)
    }

    let finalSemesterId = semesterId
    if (!finalSemesterId) {
      const currentSem = await db.semester.findFirst({ where: { isCurrent: true } })
      if (!currentSem) {
        return errorResponse('No active semester found. Please set a current semester first.', 400)
      }
      finalSemesterId = currentSem.id
    }

    const existing = await db.courseOffering.findUnique({
      where: {
        courseId_semesterId_section_slotType: {
          courseId,
          semesterId: finalSemesterId,
          section,
          slotType: slotType || 'THEORY',
        },
      },
    })

    if (existing) {
      return errorResponse('This section and slot type already has an assignment for this semester', 409)
    }

    const offering = await db.courseOffering.create({
      data: {
        courseId,
        facultyId,
        semesterId: finalSemesterId,
        section,
        slotType: slotType || 'THEORY',
        isActive: true,
      },
      include: {
        faculty: {
          select: {
            id: true,
            facultyId: true,
            designation: true,
            user: { select: { name: true } },
          },
        },
        semester: {
          select: { id: true, name: true, isCurrent: true },
        },
      },
    })

    return successResponse(offering, 'Faculty assigned successfully', 201)
  } catch (error) {
    return handleApiError(error, 'Failed to assign faculty')
  }
}
