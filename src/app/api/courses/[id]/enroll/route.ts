import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-response";
import { enrollStudentsSchema } from "@/lib/validators/course";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;

    const course = await db.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return errorResponse("Course not found", 404);
    }

    const body = await request.json();
    const parsed = enrollStudentsSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return errorResponse(firstError?.message || "Invalid input", 400);
    }

    const { studentIds, semesterId, section } = parsed.data;

    // Check semester exists
    const semester = await db.semester.findUnique({ where: { id: semesterId } });
    if (!semester) {
      return errorResponse("Semester not found", 404);
    }

    // Check all students exist
    const students = await db.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, studentId: true },
    });

    if (students.length !== studentIds.length) {
      const foundIds = new Set(students.map((s) => s.id));
      const missing = studentIds.filter((id) => !foundIds.has(id));
      return errorResponse(`Students not found: ${missing.length} student(s)`, 404);
    }

    // Check for duplicates
    const existingEnrollments = await db.enrollment.findMany({
      where: {
        courseId,
        semesterId,
        studentId: { in: studentIds },
      },
      select: { studentId: true },
    });

    if (existingEnrollments.length > 0) {
      const duplicateIds = existingEnrollments.map((e) => e.studentId);
      const duplicateStudents = students.filter((s) => duplicateIds.includes(s.id));
      return errorResponse(
        `${duplicateStudents.length} student(s) already enrolled in this course for the selected semester`,
        409
      );
    }

    // Create enrollments
    const enrollments = await db.enrollment.createMany({
      data: studentIds.map((studentId) => ({
        studentId,
        courseId,
        semesterId,
        section,
      })),
    });

    return successResponse(
      { enrolled: enrollments.count },
      `${enrollments.count} student(s) enrolled successfully`,
      201
    );
  } catch (error) {
    console.error("POST /api/courses/[id]/enroll error:", error);
    return errorResponse("Failed to enroll students", 500);
  }
}