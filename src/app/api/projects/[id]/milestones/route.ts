import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'

// GET - list milestones
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const milestones = await db.projectMilestone.findMany({
      where: { projectId: id },
      orderBy: { dueDate: 'asc' },
    })
    return successResponse(milestones)
  } catch (error) {
    console.error('Milestones list error:', error)
    return errorResponse('Error loading milestones', 500)
  }
}

// POST - add milestone
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, description, dueDate } = body

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
    console.error('Add milestone error:', error)
    return errorResponse('Error adding milestone', 500)
  }
}