import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse } from '@/lib/api-response'
import { handleApiError, requireFacultyOrAdmin, getFacultyCourseSections } from '@/lib/auth-utils'

/**
 * Returns the distinct sections available for a course (+ optional semester).
 * - Faculty: scoped to the sections they are assigned (via CourseOfferings/Timetables);
 *   if they are only a legacy Course.instructorId (no section-based assignment), all sections are returned.
 * - Admin: all distinct sections that have enrollments, offerings, or timetable slots.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireFacultyOrAdmin()
    const { id: courseId } = await params
    const { searchParams } = new URL(request.url)
    const semesterId = searchParams.get('semesterId') || undefined
    const semFilter = semesterId ? { semesterId } : {}

    // Faculty section scope (null = all sections allowed)
    let scope: string[] | null = null
    if (session.user.role === 'FACULTY') {
      scope = await getFacultyCourseSections(session.user.id, courseId, semesterId)
      // If restricted to specific sections, return those directly
      if (scope && scope.length > 0) {
        return successResponse({ sections: scope })
      }
      // scope === null → legacy instructor fallback or no offerings: fall through to all
    }

    const [enrollmentSections, offeringSections, timetableSections] = await Promise.all([
      db.enrollment.findMany({
        where: { courseId, ...semFilter, status: 'ENROLLED' },
        select: { section: true },
        distinct: ['section'],
      }).catch(() => []),
      db.courseOffering.findMany({
        where: { courseId, ...semFilter, isActive: true },
        select: { section: true },
        distinct: ['section'],
      }).catch(() => []),
      db.timetable.findMany({
        where: { courseId, ...semFilter },
        select: { section: true },
        distinct: ['section'],
      }).catch(() => []),
    ])

    const sections = new Set<string>()
    for (const e of enrollmentSections) if (e.section) sections.add(e.section)
    for (const o of offeringSections) if (o.section) sections.add(o.section)
    for (const t of timetableSections) if (t.section) sections.add(t.section)

    const result = Array.from(sections).sort()
    return successResponse({ sections: result })
  } catch (error) {
    return handleApiError(error, 'Failed to fetch course sections')
  }
}
