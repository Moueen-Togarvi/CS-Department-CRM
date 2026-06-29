import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { parsePaginationParams, skipTake } from "@/lib/pagination";
import { paginatedResponse, errorResponse, successResponse } from "@/lib/api-response";
import { requireRole, requireAuth } from "@/lib/auth";
import { createFacultySchema } from "@/lib/validators/faculty";
import bcrypt from "bcryptjs";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);

    const params = parsePaginationParams(request.nextUrl.searchParams);
    const { skip, take } = skipTake(params.page!, params.limit!);
    const search = params.search?.toLowerCase();
    const designation = request.nextUrl.searchParams.get("designation")?.trim();
    const departmentId = request.nextUrl.searchParams
      .get("departmentId")
      ?.trim();

    const where: Record<string, unknown> = {
      user: { isActive: true },
    };

    if (search) {
      where.OR = [
        { facultyId: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
        { specialization: { contains: search } },
      ];
    }

    if (designation) {
      where.designation = designation;
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    const [faculty, total] = await Promise.all([
      db.faculty.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          facultyId: true,
          designation: true,
          specialization: true,
          highestDegree: true,
          officeRoom: true,
          officeHours: true,
          isAvailable: true,
          bio: true,
          createdAt: true,
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
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          courses: {
            select: { id: true },
          },
        },
      }),
      db.faculty.count({ where }),
    ]);

    const data = faculty.map((f) => ({
      ...f,
      courseCount: f.courses.length,
      courses: undefined,
    }));

    return paginatedResponse(data, total, params.page!, params.limit!);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return errorResponse(error.message, 401);
    }
    console.error("Faculty list error:", error);
    return errorResponse("Failed to fetch faculty list");
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, "ADMIN");

    const body = await request.json();
    const parsed = createFacultySchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return errorResponse(firstError?.message || "Invalid input", 400);
    }

    const data = parsed.data;

    // Check uniqueness: email
    const existingEmail = await db.user.findUnique({
      where: { email: data.email },
    });
    if (existingEmail) {
      return errorResponse("Email already exists", 409);
    }

    // Check uniqueness: facultyId
    const existingFacultyId = await db.faculty.findUnique({
      where: { facultyId: data.facultyId },
    });
    if (existingFacultyId) {
      return errorResponse("Faculty ID already exists", 409);
    }

    // Check department exists
    const department = await db.department.findUnique({
      where: { id: data.departmentId },
    });
    if (!department) {
      return errorResponse("Department not found", 404);
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await db.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        phone: data.phone || null,
        role: "FACULTY",
      },
    });

    const faculty = await db.faculty.create({
      data: {
        userId: user.id,
        facultyId: data.facultyId,
        designation: data.designation,
        specialization: data.specialization,
        highestDegree: data.highestDegree,
        departmentId: data.departmentId,
        officeRoom: data.officeRoom || null,
        officeHours: data.officeHours || null,
        bio: data.bio || null,
      },
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
    });

    return successResponse(faculty, "Faculty created successfully", 201);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes("Unauthorized") || error.message.includes("Forbidden")) {
        return errorResponse(error.message, error.message.includes("Forbidden") ? 403 : 401);
      }
    }
    console.error("Faculty create error:", error);
    return errorResponse("Failed to create faculty");
  }
}