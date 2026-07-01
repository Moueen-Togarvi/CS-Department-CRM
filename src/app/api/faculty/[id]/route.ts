import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { updateFacultySchema } from "@/lib/validators/faculty";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(request, ["ADMIN", "FACULTY"]);
    const { id } = await params;

    const faculty = await db.faculty.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            isActive: true,
            lastLogin: true,
            createdAt: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        courses: {
          select: {
            id: true,
            code: true,
            name: true,
            creditHours: true,
            courseType: true,
            isActive: true,
          },
        },
        timetables: {
          where: {
            semester: { isCurrent: true },
          },
          include: {
            course: {
              select: { id: true, code: true, name: true },
            },
            room: {
              select: { id: true, name: true, building: true },
            },
            semester: {
              select: { id: true, name: true },
            },
          },
          orderBy: [{ day: "asc" }, { startTime: "asc" }],
        },
        supervisedProjects: {
          include: {
            members: {
              include: {
                student: {
                  include: {
                    user: { select: { name: true } },
                  },
                },
              },
            },
            semester: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!faculty) {
      return errorResponse("Faculty not found", 404);
    }

    return successResponse(faculty);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes("Unauthorized")) return errorResponse(error.message, 401);
      if (error.message.includes("Forbidden")) return errorResponse(error.message, 403);
    }
    console.error("Faculty detail error:", error);
    return errorResponse("Failed to fetch faculty details");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(request, ["ADMIN", "FACULTY"]);
    const { id } = await params;

    const faculty = await db.faculty.findUnique({ where: { id } });
    if (!faculty) {
      return errorResponse("Faculty not found", 404);
    }

    const body = await request.json();
    const parsed = updateFacultySchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return errorResponse(firstError?.message || "Invalid input", 400);
    }

    const data = parsed.data;

    // If email is being updated, check uniqueness
    if (data.email) {
      const existingEmail = await db.user.findFirst({
        where: { email: data.email, id: { not: faculty.userId } },
      });
      if (existingEmail) {
        return errorResponse("Email already in use by another account", 409);
      }
    }

    // Update user fields
    const userUpdateData: Record<string, string | null> = {};
    if (data.name) userUpdateData.name = data.name;
    if (data.email) userUpdateData.email = data.email;
    if (data.phone !== undefined) userUpdateData.phone = data.phone || null;
    if (data.avatar !== undefined) userUpdateData.avatar = data.avatar || null;

    // Update faculty fields
    const facultyUpdateData: Record<string, unknown> = {};
    if (data.designation) facultyUpdateData.designation = data.designation;
    if (data.specialization) facultyUpdateData.specialization = data.specialization;
    if (data.highestDegree) facultyUpdateData.highestDegree = data.highestDegree;
    if (data.departmentId) {
      const dept = await db.department.findUnique({ where: { id: data.departmentId } });
      if (!dept) return errorResponse("Department not found", 404);
      facultyUpdateData.departmentId = data.departmentId;
    }
    if (data.officeRoom !== undefined) facultyUpdateData.officeRoom = data.officeRoom || null;
    if (data.officeHours !== undefined) facultyUpdateData.officeHours = data.officeHours || null;
    if (data.bio !== undefined) facultyUpdateData.bio = data.bio || null;
    if (data.isAvailable !== undefined) facultyUpdateData.isAvailable = data.isAvailable;

    const [updated] = await db.$transaction([
      db.user.update({
        where: { id: faculty.userId },
        data: userUpdateData,
      }),
      db.faculty.update({
        where: { id },
        data: facultyUpdateData,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatar: true,
              isActive: true,
            },
          },
          department: {
            select: { id: true, name: true, code: true },
          },
        },
      }),
    ]);

    return successResponse(updated, "Faculty updated successfully");
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes("Unauthorized")) return errorResponse(error.message, 401);
      if (error.message.includes("Forbidden")) return errorResponse(error.message, 403);
    }
    console.error("Faculty update error:", error);
    return errorResponse("Failed to update faculty");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(request, "ADMIN");
    const { id } = await params;

    const faculty = await db.faculty.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!faculty) {
      return errorResponse("Faculty not found", 404);
    }

    // Soft delete: deactivate user
    await db.user.update({
      where: { id: faculty.userId },
      data: { isActive: false },
    });

    return successResponse(null, "Faculty deleted successfully");
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes("Unauthorized")) return errorResponse(error.message, 401);
      if (error.message.includes("Forbidden")) return errorResponse(error.message, 403);
    }
    console.error("Faculty delete error:", error);
    return errorResponse("Failed to delete faculty");
  }
}