import { db } from '@/lib/db'
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api-response'
import { parsePaginationParams, skipTake } from '@/lib/pagination'
import { NextRequest } from 'next/server'
import { ProjectStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pagination = parsePaginationParams(searchParams)
    const { skip, take } = skipTake(pagination.page!, pagination.limit!)

    const status = searchParams.get('status') as ProjectStatus | null
    const semesterId = searchParams.get('semesterId')
    const supervisorId = searchParams.get('supervisorId')
    const domain = searchParams.get('domain')
    const search = searchParams.get('search')

    const where: any = {}
    if (status) where.status = status
    if (semesterId) where.semesterId = semesterId
    if (supervisorId) where.supervisorId = supervisorId
    if (domain) where.domain = domain
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ]
    }

    const [projects, total] = await Promise.all([
      db.project.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          supervisor: {
            select: { id: true, facultyId: true, user: { select: { name: true } } },
          },
          members: {
            select: {
              id: true,
              role: true,
              student: {
                select: {
                  id: true,
                  studentId: true,
                  user: { select: { name: true, avatar: true } },
                },
              },
            },
          },
          semester: { select: { id: true, name: true } },
          milestones: {
            select: { id: true, status: true, dueDate: true },
          },
        },
      }),
      db.project.count({ where }),
    ])

    const data = projects.map((p) => ({
      ...p,
      supervisorName: p.supervisor.user.name,
      _memberCount: p.members.length,
    }))

    return paginatedResponse(data, total, pagination.page!, pagination.limit!)
  } catch (error) {
    console.error('Projects list error:', error)
    return errorResponse('Error loading projects', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title,
      description,
      semesterId,
      supervisorId,
      coSupervisorId,
      domain,
      methodology,
    } = body

    if (!title || !description || !semesterId || !supervisorId) {
      return errorResponse('Title, description, semester, and supervisor are required')
    }

    const project = await db.project.create({
      data: {
        title,
        description,
        semesterId,
        supervisorId,
        coSupervisorId: coSupervisorId || null,
        domain: domain || null,
        methodology: methodology || null,
        status: 'PROPOSED',
      },
      include: {
        supervisor: {
          select: { id: true, facultyId: true, user: { select: { name: true } } },
        },
        coSupervisor: {
          select: { id: true, user: { select: { name: true } } },
        },
        semester: { select: { id: true, name: true } },
      },
    })

    return successResponse(
      {
        ...project,
        supervisorName: project.supervisor.user.name,
        coSupervisorName: project.coSupervisor?.user.name || null,
      },
      'Project created',
      201
    )
  } catch (error) {
    console.error('Create project error:', error)
    return errorResponse('Error creating project', 500)
  }
}