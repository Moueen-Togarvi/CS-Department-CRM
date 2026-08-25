import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { requireAdmin, handleApiError } from '@/lib/auth-utils'
import { getOrCreateCurrentSemester } from '@/lib/semester'

export const dynamic = 'force-dynamic'

const MAX_SEMESTER = 8

const promoteSchema = z.object({
  semester: z.number().int().min(1).max(12),
  section: z.string().min(1, 'Section is required'),
})

// POST /api/students/promote
// Bulk-promote every student in a (currentSemester, section) cohort to the next
// semester, auto-enrolling them in the next semester's active courses, and
// graduating final-semester students.
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const parsed = promoteSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400)
    }
    const { semester, section } = parsed.data

    // Cohort = the students shown on the clicked class card (excludes INACTIVE).
    const where = {
      currentSemester: semester,
      section,
      status: { not: 'INACTIVE' },
    }

    // ---- Final semester: graduate the whole cohort ----
    if (semester >= MAX_SEMESTER) {
      const graduated = await db.student.updateMany({
        where,
        data: { status: 'GRADUATED' },
      })
      return successResponse(
        { promoted: 0, graduated: graduated.count, newEnrollments: 0 },
        `${graduated.count} student(s) marked as graduated`
      )
    }

    // ---- Promote to next semester ----
    const currentTerm = await getOrCreateCurrentSemester()

    const result = await db.$transaction(async (tx) => {
      // Grab cohort ids before bumping (updateMany returns only a count).
      const students = await tx.student.findMany({
        where,
        select: { id: true, departmentId: true },
      })
      const studentIds = students.map((s) => s.id)
      if (studentIds.length === 0) {
        return { promoted: 0, newEnrollments: 0 }
      }
      const departmentId = students[0].departmentId

      // 1) Increment the semester counter for the cohort.
      await tx.student.updateMany({
        where: { id: { in: studentIds } },
        data: { currentSemester: { increment: 1 } },
      })

      // 2) Auto-enroll into the next semester's active courses.
      let newEnrollments = 0
      if (currentTerm) {
        const nextSemester = semester + 1
        const courses = await tx.course.findMany({
          where: {
            semesterOffered: nextSemester,
            isActive: true,
            departmentId,
          },
          select: { id: true },
        })

        if (courses.length > 0) {
          const enrollData = studentIds.flatMap((studentId) =>
            courses.map((course) => ({
              studentId,
              courseId: course.id,
              semesterId: currentTerm.id,
              section,
            }))
          )
          const created = await tx.enrollment.createMany({
            data: enrollData,
            skipDuplicates: true, // honors @@unique([studentId, courseId, semesterId])
          })
          newEnrollments = created.count
        }
      }

      return { promoted: studentIds.length, newEnrollments }
    })

    return successResponse(
      { promoted: result.promoted, graduated: 0, newEnrollments: result.newEnrollments },
      `${result.promoted} student(s) promoted, ${result.newEnrollments} new enrollment(s) created`
    )
  } catch (error) {
    return handleApiError(error, 'Failed to promote students')
  }
}
