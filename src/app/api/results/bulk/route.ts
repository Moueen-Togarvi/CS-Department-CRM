import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { parseBody } from '@/lib/validators/request'
import { bulkResultsSchema } from '@/lib/validators/result'
import { calculateTotalMarks, calculateGrade } from '@/lib/calculations/grade'
import { requireFacultyOrAdmin, assertFacultyOwnsCourse, getFacultyCourseSections, handleApiError, AuthError } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    const session = await requireFacultyOrAdmin()

    const parsed = await parseBody(request, bulkResultsSchema)
    if (!parsed.ok) return parsed.response
    const { results: resultsData } = parsed.data

    const enrollmentIds: string[] = []
    for (const item of resultsData) {
      if (item?.enrollmentId) enrollmentIds.push(item.enrollmentId)
    }

    // Batch the reads. Previously every row cost an enrollment lookup, an
    // ownership check (three queries of its own) and a result lookup, so a
    // 200-row upload made well over a thousand round-trips.
    const [enrollments, existingResults] = await Promise.all([
      db.enrollment.findMany({
        where: { id: { in: enrollmentIds } },
        include: { student: true, course: true, semester: true },
      }),
      db.result.findMany({
        where: { enrollmentId: { in: enrollmentIds } },
        select: { enrollmentId: true, isLocked: true },
      }),
    ])

    const enrollmentById = new Map(enrollments.map((e) => [e.id, e]))
    const lockedByEnrollment = new Map(existingResults.map((r) => [r.enrollmentId, r.isLocked]))

    // Ownership and section scope are per (course, semester), not per row.
    const scopeCache = new Map<string, string[]>()
    const ownershipCache = new Map<string, Promise<unknown>>()

    const processedResults: Array<Record<string, unknown>> = []
    const errors: string[] = []

    for (const item of resultsData) {
      const { enrollmentId, assignmentMarks, quizMarks, midtermMarks, finalMarks, labMarks, projectMarks } = item

      if (!enrollmentId) {
        errors.push('Each result must have an enrollmentId')
        continue
      }

      try {
        const enrollment = enrollmentById.get(enrollmentId)

        if (!enrollment) {
          errors.push(`Enrollment ${enrollmentId} not found`)
          continue
        }

        // Faculty may only grade their own courses, within their assigned sections
        if (session.user.role === 'FACULTY') {
          const cacheKey = `${enrollment.courseId}|${enrollment.semesterId}`

          let ownership = ownershipCache.get(cacheKey)
          if (ownership === undefined) {
            ownership = assertFacultyOwnsCourse(session.user.id, enrollment.courseId, enrollment.semesterId)
            ownershipCache.set(cacheKey, ownership)
          }
          await ownership

          let scope = scopeCache.get(cacheKey)
          if (scope === undefined) {
            scope = await getFacultyCourseSections(session.user.id, enrollment.courseId, enrollment.semesterId)
            scopeCache.set(cacheKey, scope)
          }
          // An empty list means no assignment at all, which must deny.
          if (!scope.includes(enrollment.section)) {
            throw new AuthError('You are not assigned to this section', 403)
          }
        }

        // Check locked
        if (lockedByEnrollment.get(enrollmentId)) {
          errors.push(`Results for enrollment ${enrollmentId} are locked`)
          continue
        }

        // Calculate
        const totalMarks = calculateTotalMarks(
          assignmentMarks, quizMarks, midtermMarks, finalMarks, labMarks, projectMarks
        )
        // Component marks are recorded out of 100 in total, so the sum is
        // already the percentage. Kept explicit rather than implied.
        const percentage = totalMarks
        const gradeInfo = calculateGrade(percentage)

        const result = await db.result.upsert({
          where: { enrollmentId },
          create: {
            enrollmentId,
            studentId: enrollment.studentId,
            courseId: enrollment.courseId,
            semesterId: enrollment.semesterId,
            assignmentMarks: assignmentMarks ?? null,
            quizMarks: quizMarks ?? null,
            midtermMarks: midtermMarks ?? null,
            finalMarks: finalMarks ?? null,
            labMarks: labMarks ?? null,
            projectMarks: projectMarks ?? null,
            totalMarks,
            percentage: Math.round(percentage * 100) / 100,
            grade: gradeInfo.grade,
            gradePoint: gradeInfo.gradePoint,
          },
          update: {
            assignmentMarks: assignmentMarks ?? null,
            quizMarks: quizMarks ?? null,
            midtermMarks: midtermMarks ?? null,
            finalMarks: finalMarks ?? null,
            labMarks: labMarks ?? null,
            projectMarks: projectMarks ?? null,
            totalMarks,
            percentage: Math.round(percentage * 100) / 100,
            grade: gradeInfo.grade,
            gradePoint: gradeInfo.gradePoint,
          },
        })

        processedResults.push(result)
      } catch (err) {
        if (err instanceof AuthError) throw err
        errors.push(`Failed to process enrollment ${enrollmentId}`)
      }
    }

    return successResponse({
      processed: processedResults.length,
      results: processedResults,
      errors: errors.length > 0 ? errors : undefined,
    }, `Bulk save completed: ${processedResults.length} results processed`)
  } catch (error) {
    return handleApiError(error, 'Failed to process bulk results')
  }
}