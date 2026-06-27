import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'

export async function GET() {
  try {
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
    console.error('Download center error:', error)
    return errorResponse('Error loading download center', 500)
  }
}