import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth, assertFacultyOwnsCourse, getFacultyCourseSections, handleApiError } from "@/lib/auth-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: courseId } = await params;
    const { searchParams } = new URL(request.url);
    const sectionParam = searchParams.get("section") || undefined;
    const semesterParam = searchParams.get("semesterId") || undefined;

    // Students may not fetch course enrollments (faculty/admin only)
    if (session.user.role === "STUDENT") {
      return errorResponse("Forbidden", 403);
    }

    // Faculty may only fetch enrollments for their own courses
    let facultyScope: string[] | null = null;
    if (session.user.role === "FACULTY") {
      try {
        await assertFacultyOwnsCourse(session.user.id, courseId, semesterParam);
      } catch {
        return errorResponse("Forbidden: You are not assigned to this course", 403);
      }
      // Resolve the faculty's allowed sections (null = all sections, legacy fallback)
      facultyScope = await getFacultyCourseSections(session.user.id, courseId, semesterParam);
    }

    // Resolve the effective section to filter by:
    // - If a specific section was requested, ensure faculty is allowed to access it
    // - Otherwise, if the faculty is restricted to a single section, auto-use it
    let effectiveSection = sectionParam;
    if (session.user.role === "FACULTY" && facultyScope && facultyScope.length > 0) {
      if (effectiveSection && !facultyScope.includes(effectiveSection)) {
        return errorResponse("Forbidden: You are not assigned to this section", 403);
      }
      if (!effectiveSection && facultyScope.length === 1) {
        effectiveSection = facultyScope[0];
      }
    }

    const course = await db.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return errorResponse("Course not found", 404);
    }

    const baseWhere = {
      courseId,
      ...(semesterParam ? { semesterId: semesterParam } : {}),
      ...(effectiveSection ? { section: effectiveSection } : {}),
    };

    // Try enrollments first (any status)
    let enrollments = await db.enrollment.findMany({
      where: baseWhere,
      include: {
        student: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        semester: {
          select: { id: true, name: true, isCurrent: true },
        },
        result: {
          select: {
            id: true,
            grade: true,
            percentage: true,
            isLocked: true,
          },
        },
      },
      orderBy: { student: { studentId: "asc" } },
    });

    // Fallback: if no enrollments exist, return all active students
    // matching the course's semester (or all active students), scoped to section
    if (enrollments.length === 0) {
      const students = await db.student.findMany({
        where: {
          user: { isActive: true },
          ...(course.semesterOffered
            ? { currentSemester: course.semesterOffered }
            : {}),
          ...(effectiveSection ? { section: effectiveSection } : {}),
        },
        include: {
          user: { select: { name: true, email: true } },
        },
        orderBy: { studentId: "asc" },
      });

      const data = students.map((s) => ({
        id: `student-${s.id}`,
        section: s.section || "A",
        status: "ENROLLED",
        enrollmentDate: new Date().toISOString(),
        student: {
          id: s.id,
          studentId: s.studentId,
          name: s.user.name,
          email: s.user.email,
        },
        semester: null,
        result: null,
      }));

      return successResponse({ enrollments: data });
    }

    const data = enrollments.map((e) => ({
      id: e.id,
      section: e.section,
      status: e.status,
      enrollmentDate: e.enrollmentDate,
      student: {
        id: e.student.id,
        studentId: e.student.studentId,
        name: e.student.user.name,
        email: e.student.user.email,
      },
      semester: e.semester,
      result: e.result
        ? {
            grade: e.result.grade,
            percentage: e.result.percentage,
            isLocked: e.result.isLocked,
          }
        : null,
    }));

    return successResponse({
      enrollments: data,
    });
  } catch (error) {
    return handleApiError(error, "Failed to fetch enrollments");
  }
}
