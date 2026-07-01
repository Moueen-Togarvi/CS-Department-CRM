import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { calculateTotalMarks, calculateGrade } from '@/lib/calculations/grade'
import { requireFacultyOrAdmin, assertFacultyOwnsCourse, handleApiError, AuthError } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    const session = await requireFacultyOrAdmin()

    const body = await request.json()
    const { results: resultsData } = body

    if (!Array.isArray(resultsData) || resultsData.length === 0) {
      return errorResponse('results array is required and must not be empty')
    }

    const processedResults: Array<Record<string, unknown>> = []
    const errors: string[] = []

    for (const item of resultsData) {
      const { enrollmentId, assignmentMarks, quizMarks, midtermMarks, finalMarks, labMarks, projectMarks } = item

      if (!enrollmentId) {
        errors.push('Each result must have an enrollmentId')
        continue
      }

      try {
        // Check enrollment
        const enrollment = await db.enrollment.findUnique({
          where: { id: enrollmentId },
          include: { student: true, course: true, semester: true },
        })

        if (!enrollment) {
          errors.push(`Enrollment ${enrollmentId} not found`)
          continue
        }

        // Faculty may only grade their own courses
        if (session.user.role === 'FACULTY') {
          await assertFacultyOwnsCourse(session.user.id, enrollment.courseId, enrollment.semesterId)
        }

        // Check locked
        const existingResult = await db.result.findUnique({
          where: { enrollmentId },
        })

        if (existingResult?.isLocked) {
          errors.push(`Results for enrollment ${enrollmentId} are locked`)
          continue
        }

        // Calculate
        const totalMarks = calculateTotalMarks(
          assignmentMarks, quizMarks, midtermMarks, finalMarks, labMarks, projectMarks
        )
        const percentage = totalMarks / 100 * 100
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