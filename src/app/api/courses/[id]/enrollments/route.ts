import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;

    const course = await db.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return errorResponse("Course not found", 404);
    }

    // Get current semester
    const currentSemester = await db.semester.findFirst({
      where: { isCurrent: true },
    });

    const semesterId = currentSemester?.id;

    const enrollments = await db.enrollment.findMany({
      where: {
        courseId,
        ...(semesterId ? { semesterId } : {}),
      },
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
      semester: currentSemester
        ? { id: currentSemester.id, name: currentSemester.name }
        : null,
    });
  } catch (error) {
    console.error("GET /api/courses/[id]/enrollments error:", error);
    return errorResponse("Failed to fetch enrollments", 500);
  }
}