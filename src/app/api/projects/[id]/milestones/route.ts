import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { parseBody } from '@/lib/validators/request'
import { createMilestoneSchema } from '@/lib/validators/project'
import { requireAuth, requireFacultyOrAdmin, handleApiError } from '@/lib/auth-utils'
import { NextRequest } from 'next/server'

// GET - list milestones
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params
    const milestones = await db.projectMilestone.findMany({
      where: { projectId: id },
      orderBy: { dueDate: 'asc' },
    })
    return successResponse(milestones)
  } catch (error) {
    return handleApiError(error, 'Error loading milestones')
  }
}

// POST - add milestone
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireFacultyOrAdmin()
    const { id } = await params
    const parsed = await parseBody(request, createMilestoneSchema)
    if (!parsed.ok) return parsed.response
    const { title, description, dueDate } = parsed.data

    if (!title || !dueDate) {
      return errorResponse('Title and due date are required')
    }

    const project = await db.project.findUnique({ where: { id } })
    if (!project) {
      return errorResponse('Project not found', 404)
    }

    const milestone = await db.projectMilestone.create({
      data: {
        projectId: id,
        title,
        description: description || null,
        dueDate: new Date(dueDate),
        status: 'PENDING',
      },
    })

    return successResponse(milestone, 'Milestone added', 201)
  } catch (error) {
    return handleApiError(error, 'Error adding milestone')
  }
}