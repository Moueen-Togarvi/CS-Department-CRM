import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-response";
import { updateCourseSchema } from "@/lib/validators/course";
import { requireAuth, requireAdmin, handleApiError } from "@/lib/auth-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const course = await db.course.findUnique({
      where: { id },
      include: {
        instructor: {
          select: {
            id: true,
            facultyId: true,
            designation: true,
            user: { select: { name: true, email: true, phone: true } },
          },
        },
        department: {
          select: { id: true, name: true, code: true },
        },
        enrollments: {
          include: {
            student: {
              include: {
                user: { select: { name: true, email: true } },
              },
            },
            semester: {
              select: { id: true, name: true, isCurrent: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        documents: {
          select: {
            id: true,
            title: true,
            category: true,
            fileType: true,
            fileSize: true,
            createdAt: true,
            uploadedByUser: {
              select: { name: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!course) {
      return errorResponse("Course not found", 404);
    }

    // Compute result stats for this course
    const results = await db.result.findMany({
      where: { courseId: id },
      select: { grade: true },
    });

    const gradeDistribution: Record<string, number> = {};
    let gradedCount = 0;
    for (const r of results) {
      if (r.grade) {
        gradedCount++;
        const key = r.grade.replace(/_/g, "-");
        gradeDistribution[key] = (gradeDistribution[key] || 0) + 1;
      }
    }

    // Average percentage
    const resultWithPercentage = await db.result.findMany({
      where: { courseId: id, percentage: { not: null } },
      select: { percentage: true },
    });
    const avgPercentage =
      resultWithPercentage.length > 0
        ? resultWithPercentage.reduce((sum, r) => sum + (r.percentage ?? 0), 0) /
          resultWithPercentage.length
        : null;

    return successResponse({
      ...course,
      prerequisites: course.prerequisiteIds,
      resultsStats: {
        totalGraded: gradedCount,
        gradeDistribution,
        avgPercentage: avgPercentage ? Math.round(avgPercentage * 100) / 100 : null,
      },
    });
  } catch (error) {
    return handleApiError(error, "Failed to fetch course details");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const course = await db.course.findUnique({ where: { id } });
    if (!course) {
      return errorResponse("Course not found", 404);
    }

    const body = await request.json();
    const parsed = updateCourseSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return errorResponse(firstError?.message || "Invalid input", 400);
    }

    const data = parsed.data;

    // If departmentId is being updated, check it exists
    if (data.departmentId) {
      const dept = await db.department.findUnique({ where: { id: data.departmentId } });
      if (!dept) return errorResponse("Department not found", 404);
    }

    // If instructorId is being updated, check it exists
    if (data.instructorId !== undefined) {
      if (data.instructorId) {
        const instr = await db.faculty.findUnique({ where: { id: data.instructorId } });
        if (!instr) return errorResponse("Instructor not found", 404);
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.departmentId !== undefined) updateData.departmentId = data.departmentId;
    if (data.creditHours !== undefined) updateData.creditHours = data.creditHours;
    if (data.labCreditHours !== undefined) updateData.labCreditHours = data.labCreditHours;
    if (data.courseType !== undefined) updateData.courseType = data.courseType;
    if (data.semesterOffered !== undefined) updateData.semesterOffered = data.semesterOffered ?? null;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.prerequisites !== undefined) updateData.prerequisiteIds = data.prerequisites || "[]";
    if (data.objectives !== undefined) updateData.objectives = data.objectives || null;
    if (data.instructorId !== undefined) updateData.instructorId = data.instructorId ?? null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await db.course.update({
      where: { id },
      data: updateData,
      include: {
        instructor: {
          select: { id: true, facultyId: true, user: { select: { name: true } } },
        },
        department: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return successResponse(updated, "Course updated successfully");
  } catch (error) {
    return handleApiError(error, "Failed to update course");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const course = await db.course.findUnique({ where: { id } });
    if (!course) {
      return errorResponse("Course not found", 404);
    }

    await db.course.update({
      where: { id },
      data: { isActive: false, instructorId: null },
    });

    return successResponse(null, "Course deleted successfully");
  } catch (error) {
    return handleApiError(error, "Failed to delete course");
  }
}