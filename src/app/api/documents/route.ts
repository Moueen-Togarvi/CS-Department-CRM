import { db } from '@/lib/db'
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api-response'
import { parsePaginationParams, skipTake } from '@/lib/pagination'
import { NextRequest } from 'next/server'
import { DocumentCategory } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pagination = parsePaginationParams(searchParams)
    const { skip, take } = skipTake(pagination.page!, pagination.limit!)

    const courseId = searchParams.get('courseId')
    const category = searchParams.get('category') as DocumentCategory | null
    const search = searchParams.get('search')

    const where: any = {}
    if (courseId) where.courseId = courseId
    if (category) where.category = category
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ]
    }

    const [documents, total] = await Promise.all([
      db.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          uploadedByUser: { select: { id: true, name: true } },
          course: { select: { id: true, code: true, name: true } },
        },
      }),
      db.document.count({ where }),
    ])

    const data = documents.map((d) => ({
      ...d,
      uploadedByName: d.uploadedByUser.name,
      courseName: d.course?.name || null,
      courseCode: d.course?.code || null,
    }))

    return paginatedResponse(data, total, pagination.page!, pagination.limit!)
  } catch (error) {
    console.error('Documents list error:', error)
    return errorResponse('Error loading documents', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title,
      description,
      category = 'OTHER',
      courseId,
      semesterId,
      fileUrl,
      fileType,
      fileSize,
    } = body

    if (!title || !fileUrl) {
      return errorResponse('Title and file URL are required')
    }

    const adminUser = await db.user.findFirst({ where: { role: 'ADMIN' } })
    const uploadedBy = adminUser?.id || 'system'

    const currentSemester = await db.semester.findFirst({ where: { isCurrent: true } })

    const document = await db.document.create({
      data: {
        title,
        description: description || null,
        category,
        courseId: courseId || null,
        semesterId: semesterId || currentSemester?.id || null,
        uploadedBy,
        fileUrl,
        fileType: fileType || null,
        fileSize: fileSize ? Number(fileSize) : null,
      },
      include: {
        uploadedByUser: { select: { id: true, name: true } },
        course: { select: { id: true, code: true, name: true } },
      },
    })

    return successResponse(
      {
        ...document,
        uploadedByName: document.uploadedByUser.name,
        courseName: document.course?.name || null,
        courseCode: document.course?.code || null,
      },
      'Document created',
      201
    )
  } catch (error) {
    console.error('Create document error:', error)
    return errorResponse('Error creating document', 500)
  }
}