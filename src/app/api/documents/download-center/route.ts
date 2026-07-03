import { db } from '@/lib/db'
import { successResponse } from '@/lib/api-response'
import { requireAuth, handleApiError } from '@/lib/auth-utils'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const { searchParams } = new URL(request.url)

    const semesterNumber = searchParams.get('semesterNumber')
    const courseId = searchParams.get('courseId')
    const facultyId = searchParams.get('facultyId')
    const search = searchParams.get('search')

    const where: any = {}
    if (semesterNumber) where.semesterNumber = Number(semesterNumber)
    if (courseId) where.courseId = courseId
    if (facultyId) where.facultyId = facultyId
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ]
    }

    const documents = await db.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        course: { select: { id: true, code: true, name: true, semesterOffered: true } },
        uploadedByUser: { select: { id: true, name: true } },
        faculty: { select: { id: true, designation: true, user: { select: { id: true, name: true } } } },
      },
    })

    const mapped = documents.map((d) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      category: d.category,
      fileUrl: d.fileUrl,
      fileType: d.fileType,
      fileSize: d.fileSize,
      semesterNumber: d.semesterNumber,
      courseName: d.course?.name || null,
      courseCode: d.course?.code || null,
      uploadedByName: d.uploadedByUser.name,
      facultyName: d.faculty?.user?.name || null,
      facultyDesignation: d.faculty?.designation || null,
      createdAt: d.createdAt,
    }))

    const grouped: Record<string, any[]> = {}
    for (const doc of mapped) {
      const cat = doc.category
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(doc)
    }

    return successResponse(grouped)
  } catch (error) {
    return handleApiError(error, 'Error loading download center')
  }
}
