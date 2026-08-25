import { db } from '@/lib/db'
import { successResponse } from '@/lib/api-response'
import { AuthError, handleApiError, requireAuth } from '@/lib/auth-utils'

/**
 * Quick stats for the signed-in user.
 *
 * Identity comes from the session, never from the query string — these are
 * private academic records (GPA, attendance), so `?role=&id=` would let anyone
 * read anyone else's.
 */
export async function GET() {
  try {
    const session = await requireAuth()
    const { role, id } = session.user

    if (role === 'STUDENT') {
      return getStudentQuickStats(id)
    }

    if (role === 'FACULTY') {
      return getFacultyQuickStats(id)
    }

    return successResponse({})
  } catch (error) {
    if (error instanceof AuthError) return handleApiError(error)
    console.error('Quick stats error:', error)
    return successResponse(
      { error: 'Failed to load quick stats' },
      'Error loading quick stats',
      500
    )
  }
}

async function getStudentQuickStats(userId: string) {
  const student = await db.student.findUnique({
    where: { userId },
  })

  if (!student) {
    return successResponse({})
  }

  const currentSemester = await db.semester.findFirst({
    where: { isCurrent: true },
  })

  if (!currentSemester) {
    return successResponse({
      gpa: student.gpa ?? null,
      enrolledCourses: 0,
      attendancePercentage: null,
      currentSemester: null,
      totalCredits: student.totalCredits,
    })
  }

  // Parallel queries for student stats
  const [enrollments, attendanceRecords, currentSemesterResults] =
    await Promise.all([
      db.enrollment.count({
        where: {
          studentId: student.id,
          semesterId: currentSemester.id,
        },
      }),
      db.attendance.findMany({
        where: {
          studentId: student.id,
          semesterId: currentSemester.id,
        },
        select: { status: true },
      }),
      db.result.findMany({
        where: {
          studentId: student.id,
          semesterId: currentSemester.id,
        },
        select: { gradePoint: true },
      }),
    ])

  // Calculate attendance percentage
  const totalClasses = attendanceRecords.length
  const presentClasses = attendanceRecords.filter(
    (a) => a.status === 'PRESENT' || a.status === 'LATE'
  ).length
  const attendancePercentage =
    totalClasses > 0
      ? Math.round((presentClasses / totalClasses) * 100)
      : null

  // Calculate current semester GPA
  const gradePoints = currentSemesterResults
    .map((r) => r.gradePoint ?? 0)
    .filter((g) => g > 0)
  const semesterGPA =
    gradePoints.length > 0
      ? gradePoints.reduce((a, b) => a + b, 0) / gradePoints.length
      : null

  return successResponse({
    gpa: student.gpa ?? null,
    semesterGPA: semesterGPA !== null ? parseFloat(semesterGPA.toFixed(2)) : null,
    enrolledCourses: enrollments,
    attendancePercentage,
    currentSemester: {
      id: currentSemester.id,
      name: currentSemester.name,
    },
    totalCredits: student.totalCredits,
    currentSemesterNum: student.currentSemester,
    batch: student.batch,
  })
}

async function getFacultyQuickStats(userId: string) {
  const faculty = await db.faculty.findUnique({
    where: { userId },
  })

  if (!faculty) {
    return successResponse({})
  }

  const currentSemester = await db.semester.findFirst({
    where: { isCurrent: true },
  })

  const baseStats = {
    designation: faculty.designation,
    specialization: faculty.specialization,
    officeRoom: faculty.officeRoom,
    totalCourses: await db.course.count({
      where: { offerings: { some: { facultyId: faculty.id } } },
    }),
    supervisedProjects: await db.project.count({
      where: { supervisorId: faculty.id },
    }),
  }

  if (!currentSemester) {
    return successResponse({
      ...baseStats,
      currentCourses: 0,
      totalStudents: 0,
      currentSemester: null,
    })
  }

  // Current semester courses and student counts
  const [currentCourses, totalStudents] = await Promise.all([
    db.course.count({
      where: { offerings: { some: { facultyId: faculty.id, semesterId: currentSemester.id } } },
    }),
    db.enrollment.groupBy({
      by: ['courseId'],
      where: {
        courseId: {
          in: (
            await db.courseOffering.findMany({
              where: { facultyId: faculty.id, semesterId: currentSemester.id },
              select: { courseId: true },
            })
          ).map((o) => o.courseId),
        },
        semesterId: currentSemester.id,
      },
      _count: { id: true },
    }),
  ])

  return successResponse({
    ...baseStats,
    currentCourses,
    totalStudents: totalStudents.reduce((sum, g) => sum + g._count.id, 0),
    currentSemester: {
      id: currentSemester.id,
      name: currentSemester.name,
    },
  })
}
