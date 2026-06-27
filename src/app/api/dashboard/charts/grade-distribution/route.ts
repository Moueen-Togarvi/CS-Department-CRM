import { db } from '@/lib/db'
import { successResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Find the latest COMPLETED semester
    const completedSemester = await db.semester.findFirst({
      where: { status: 'COMPLETED' },
      orderBy: { year: 'desc' },
    })

    if (!completedSemester) {
      // Fallback: get grade distribution from all results
      const gradeCounts = await db.result.groupBy({
        by: ['grade'],
        _count: { id: true },
      })

      const data = gradeCounts
        .filter((g) => g.grade !== null)
        .map((g) => ({
          grade: formatGrade(g.grade!),
          count: g._count.id,
        }))

      return successResponse(data)
    }

    // Count grades for the completed semester
    const gradeCounts = await db.result.groupBy({
      by: ['grade'],
      where: { semesterId: completedSemester.id },
      _count: { id: true },
    })

    const data = gradeCounts
      .filter((g) => g.grade !== null)
      .map((g) => ({
        grade: formatGrade(g.grade!),
        count: g._count.id,
      }))

    return successResponse(data)
  } catch (error) {
    console.error('Grade distribution error:', error)
    return successResponse(
      [],
      'Error loading grade distribution',
      500
    )
  }
}

function formatGrade(grade: string): string {
  return grade
    .replace('_', ' ')
    .replace(/PLUS/g, '+')
    .replace(/MINUS/g, '−')
}
