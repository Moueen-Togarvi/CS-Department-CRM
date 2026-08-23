import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { requireAuth, requireFacultyOrAdmin, handleApiError } from '@/lib/auth-utils'
import { NextRequest } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params
    const project = await db.project.findUnique({
      where: { id },
      include: {
        supervisor: {
          select: { id: true, facultyId: true, designation: true, user: { select: { name: true, email: true } } },
        },
        coSupervisor: {
          select: { id: true, facultyId: true, designation: true, user: { select: { name: true, email: true } } },
        },
        semester: { select: { id: true, name: true, type: true, year: true } },
        members: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            contributionPercent: true,
            student: {
              select: {
                id: true,
                studentId: true,
                user: { select: { name: true, email: true, avatar: true } },
              },
            },
          },
        },
        milestones: {
          orderBy: { dueDate: 'asc' },
        },
        evaluations: {
          include: {
            evaluator: {
              select: { id: true, facultyId: true, user: { select: { name: true } } },
            },
          },
        },
      },
    })

    if (!project) {
      return errorResponse('Project not found', 404)
    }

    return successResponse({
      ...project,
      supervisorName: project.supervisor.user.name,
      coSupervisorName: project.coSupervisor?.user.name || null,
      _memberCount: project.members.length,
    })
  } catch (error) {
    return handleApiError(error, 'Error loading project')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireFacultyOrAdmin()
    const { id } = await params
    const body = await request.json()
    const { title, description, supervisorId, coSupervisorId, domain, methodology } = body

    const existing = await db.project.findUnique({ where: { id } })
    if (!existing) {
      return errorResponse('Project not found', 404)
    }

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (supervisorId !== undefined) updateData.supervisorId = supervisorId
    if (coSupervisorId !== undefined) updateData.coSupervisorId = coSupervisorId || null
    if (domain !== undefined) updateData.domain = domain
    if (methodology !== undefined) updateData.methodology = methodology

    const project = await db.project.update({
      where: { id },
      data: updateData,
      include: {
        supervisor: { select: { user: { select: { name: true } } } },
      },
    })

    return successResponse({ ...project, supervisorName: project.supervisor.user.name })
  } catch (error) {
    return handleApiError(error, 'Error updating project')
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireFacultyOrAdmin()
    const { id } = await params
    const existing = await db.project.findUnique({ where: { id } })
    if (!existing) {
      return errorResponse('Project not found', 404)
    }

    await db.project.delete({ where: { id } })
    return successResponse(null, 'Project deleted')
  } catch (error) {
    return handleApiError(error, 'Error deleting project')
  }
}