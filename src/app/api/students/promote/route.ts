import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { requireAdmin, handleApiError } from '@/lib/auth-utils'

export const dynamic = 'force-dynamic'

const MAX_SEMESTER = 8

const promoteSchema = z.object({
  semester: z.number().int().min(1).max(MAX_SEMESTER),
  departmentId: z.string().min(1),
  batch: z.string().nullable(),
  section: z.string().nullable(),
  semesterId: z.string().optional(),
})

// POST /api/students/promote
// Promote one active department, batch, semester, and section cohort.
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const parsed = promoteSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400)
    }
    const { semester, section, departmentId, batch, semesterId } = parsed.data

    // Cohort = the students shown on the clicked class card (excludes INACTIVE).
    const where = {
      currentSemester: semester,
      departmentId,
      batch,
      section,
      status: 'ACTIVE',
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
    if (!semesterId) return errorResponse('Choose the academic term for these enrollments', 400)
    const targetTerm = await db.semester.findFirst({ where: { id: semesterId, status: { in: ['ACTIVE', 'UPCOMING'] } } })
    if (!targetTerm) return errorResponse('Selected academic term is unavailable', 400)

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
      const offerings = await tx.courseOffering.findMany({
        where: {
          semesterId: targetTerm.id,
          section: section ?? '',
          isActive: true,
          course: { departmentId, semesterOffered: semester + 1, isActive: true },
        },
        select: { courseId: true, course: { select: { prerequisiteIds: true } } },
      })
      const courseById = new Map(offerings.map((offering) => [offering.courseId, offering.course]))
      const courseIds = [...courseById.keys()]
      if (!courseIds.length) return { promoted: 0, newEnrollments: 0, noOfferings: true }

      const prerequisiteIds = [...new Set([...courseById.values()].flatMap((course) => course.prerequisiteIds))]
      const priorResults = prerequisiteIds.length ? await tx.result.findMany({
        where: { studentId: { in: studentIds }, courseId: { in: prerequisiteIds } },
        select: { studentId: true, courseId: true, grade: true },
      }) : []
      const passed = new Set(priorResults.filter((r) => r.grade && !['F', 'I', 'W'].includes(r.grade)).map((r) => `${r.studentId}:${r.courseId}`))
      const eligible = studentIds.map((studentId) => ({
        studentId,
        courseIds: courseIds.filter((courseId) => courseById.get(courseId)!.prerequisiteIds.every((prerequisiteId) => passed.has(`${studentId}:${prerequisiteId}`))),
      }))
      const skippedPrerequisites = eligible.reduce((total, student) => total + courseIds.length - student.courseIds.length, 0)

      await tx.student.updateMany({ where: { id: { in: studentIds } }, data: { currentSemester: { increment: 1 } } })
      const enrollData = eligible.flatMap(({ studentId, courseIds: eligibleCourseIds }) => eligibleCourseIds.map((courseId) => ({ studentId, courseId, semesterId: targetTerm.id, section: section! })))
      const created = enrollData.length ? await tx.enrollment.createMany({ data: enrollData, skipDuplicates: true }) : { count: 0 }

      return { promoted: studentIds.length, newEnrollments: created.count, skippedPrerequisites, noOfferings: false }
    })

    if (result.noOfferings) return errorResponse(`No active course offerings found for ${targetTerm.name}, section ${section ?? 'Unassigned'}`, 409)

    return successResponse(
      { promoted: result.promoted, graduated: 0, newEnrollments: result.newEnrollments, skippedPrerequisites: result.skippedPrerequisites ?? 0 },
      `${result.promoted} student(s) promoted, ${result.newEnrollments} enrollment(s) created, ${result.skippedPrerequisites ?? 0} enrollment(s) skipped due to unmet prerequisites`
    )
  } catch (error) {
    return handleApiError(error, 'Failed to promote students')
  }
}
