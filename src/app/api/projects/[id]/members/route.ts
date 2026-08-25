import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { parseBody } from '@/lib/validators/request'
import { addProjectMemberSchema } from '@/lib/validators/project'
import { requireAuth, requireFacultyOrAdmin, handleApiError } from '@/lib/auth-utils'
import { NextRequest } from 'next/server'

// GET /api/projects/[id]/members - list members
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params
    const members = await db.projectMember.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            user: { select: { name: true, email: true, avatar: true } },
          },
        },
      },
    })
    return successResponse(members)
  } catch (error) {
    return handleApiError(error, 'Error loading members')
  }
}

// POST /api/projects/[id]/members - add member
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireFacultyOrAdmin()
    const { id } = await params
    const parsed = await parseBody(request, addProjectMemberSchema)
    if (!parsed.ok) return parsed.response
    const { studentId, role } = parsed.data

    if (!studentId) {
      return errorResponse('Student ID is required')
    }

    // Check project exists
    const project = await db.project.findUnique({ where: { id } })
    if (!project) {
      return errorResponse('Project not found', 404)
    }

    // Check student exists
    const student = await db.student.findUnique({ where: { id: studentId } })
    if (!student) {
      return errorResponse('Student not found', 404)
    }

    // Check not already in another project
    const existingMembership = await db.projectMember.findFirst({
      where: { studentId },
      include: { project: { select: { id: true, title: true, status: true } } },
    })
    if (existingMembership) {
      return errorResponse(
        `Student is already a member of "${existingMembership.project.title}"`
      )
    }

    // Check not already in this project
    const existingInProject = await db.projectMember.findFirst({
      where: { projectId: id, studentId },
    })
    if (existingInProject) {
      return errorResponse('Student is already a member of this project')
    }

    const member = await db.projectMember.create({
      data: {
        projectId: id,
        studentId,
        role,
      },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    })

    return successResponse(member, 'Member added', 201)
  } catch (error) {
    return handleApiError(error, 'Error adding member')
  }
}