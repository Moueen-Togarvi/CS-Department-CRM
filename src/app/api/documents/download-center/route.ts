import { db } from '@/lib/db'
import { successResponse } from '@/lib/api-response'
import { requireAuth, handleApiError } from '@/lib/auth-utils'

export async function GET() {
  try {
    await requireAuth()
    const documents = await db.document.findMany({
      orderBy: { category: 'asc' },
      include: {
        course: { select: { id: true, code: true, name: true } },
        uploadedByUser: { select: { id: true, name: true } },
      },
    })

    const grouped: Record<string, any[]> = {}
    for (const doc of documents) {
      const cat = doc.category
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push({
        ...doc,
        uploadedByName: doc.uploadedByUser.name,
        courseName: doc.course?.name || null,
        courseCode: doc.course?.code || null,
      })
    }

    return successResponse(grouped)
  } catch (error) {
    return handleApiError(error, 'Error loading download center')
  }
}
