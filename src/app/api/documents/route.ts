import { db } from '@/lib/db'
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api-response'
import { parseBody } from '@/lib/validators/request'
import { createDocumentSchema } from '@/lib/validators/document'
import { parsePaginationParams, skipTake } from '@/lib/pagination'
import { NextRequest } from 'next/server'
import { DocumentCategory } from '@prisma/client'
import { requireAuth, requireFacultyOrAdmin, handleApiError } from '@/lib/auth-utils'

const DOC_INCLUDE = {
  uploadedByUser: { select: { id: true, name: true } },
  course: { select: { id: true, code: true, name: true, semesterOffered: true } },
  faculty: { select: { id: true, designation: true, user: { select: { id: true, name: true } } } },
}

function mapDoc(d: any) {
  return {
    ...d,
    uploadedByName: d.uploadedByUser.name,
    courseName: d.course?.name || null,
    courseCode: d.course?.code || null,
    courseSemester: d.course?.semesterOffered || null,
    facultyName: d.faculty?.user?.name || null,
    facultyDesignation: d.faculty?.designation || null,
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const { searchParams } = new URL(request.url)
    const pagination = parsePaginationParams(searchParams)
    const { skip, take } = skipTake(pagination.page!, pagination.limit!)

    const courseId = searchParams.get('courseId')
    const semesterNumber = searchParams.get('semesterNumber')
    const category = searchParams.get('category') as DocumentCategory | null
    const search = searchParams.get('search')

    const where: any = {}
    if (courseId) where.courseId = courseId
    if (semesterNumber) where.semesterNumber = Number(semesterNumber)
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
        include: DOC_INCLUDE,
      }),
      db.document.count({ where }),
    ])

    return paginatedResponse(documents.map(mapDoc), total, pagination.page!, pagination.limit!)
  } catch (error) {
    return handleApiError(error, 'Error loading documents')
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireFacultyOrAdmin()
    const parsed = await parseBody(request, createDocumentSchema)
    if (!parsed.ok) return parsed.response
    const {
      title,
      description,
      category,
      courseId,
      semesterNumber,
      facultyId,
      fileUrl,
      fileType,
      fileSize,
    } = parsed.data

    if (!title || !fileUrl || !courseId || !semesterNumber) {
      return errorResponse('Title, file URL, course, and semester are required')
    }

    const uploadedBy = session.user.id

    const document = await db.document.create({
      data: {
        title,
        description: description || null,
        category,
        courseId,
        semesterNumber: Number(semesterNumber),
        facultyId: facultyId || null,
        uploadedBy,
        fileUrl,
        fileType: fileType || null,
        fileSize: fileSize ? Number(fileSize) : null,
      },
      include: DOC_INCLUDE,
    })

    return successResponse(mapDoc(document), 'Document created', 201)
  } catch (error) {
    return handleApiError(error, 'Error creating document')
  }
}
