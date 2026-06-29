import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { parsePaginationParams, skipTake } from "@/lib/pagination";
import { paginatedResponse, errorResponse } from "@/lib/api-response";
import { createCourseSchema } from "@/lib/validators/course";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, search, sort, order } = parsePaginationParams(searchParams);

    const courseType = searchParams.get("courseType") || undefined;
    const creditHours = searchParams.get("creditHours")
      ? parseInt(searchParams.get("creditHours")!)
      : undefined;
    const semesterOffered = searchParams.get("semesterOffered")
      ? parseInt(searchParams.get("semesterOffered")!)
      : undefined;

    const where: Prisma.CourseWhereInput = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
      ];
    }

    if (courseType) {
      where.courseType = courseType as Prisma.EnumCourseTypeFilter["equals"];
    }

    if (creditHours) {
      where.creditHours = creditHours;
    }

    if (semesterOffered) {
      where.semesterOffered = semesterOffered;
    }

    const orderBy: Prisma.CourseOrderByWithRelationInput = {};
    if (sort === "code") {
      orderBy.code = order;
    } else if (sort === "name") {
      orderBy.name = order;
    } else if (sort === "creditHours") {
      orderBy.creditHours = order;
    } else {
      orderBy.createdAt = order;
    }

    const { skip, take } = skipTake(page, limit);

    const [courses, total] = await Promise.all([
      db.course.findMany({
        where,
        include: {
          instructor: {
            select: { id: true, facultyId: true, user: { select: { name: true } } },
          },
          department: {
            select: { id: true, name: true, code: true },
          },
          _count: {
            select: { enrollments: true },
          },
        },
        orderBy,
        skip,
        take,
      }),
      db.course.count({ where }),
    ]);

    const data = courses.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      creditHours: c.creditHours,
      labCreditHours: c.labCreditHours,
      courseType: c.courseType,
      semesterOffered: c.semesterOffered,
      description: c.description,
      objectives: c.objectives,
      prerequisites: c.prerequisiteIds,
      isActive: c.isActive,
      instructor: c.instructor
        ? {
            id: c.instructor.id,
            facultyId: c.instructor.facultyId,
            name: c.instructor.user.name,
          }
        : null,
      department: c.department,
      enrollmentCount: c._count.enrollments,
      createdAt: c.createdAt,
    }));

    return paginatedResponse(data, total, page, limit);
  } catch (error) {
    console.error("GET /api/courses error:", error);
    return errorResponse("Failed to fetch courses", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createCourseSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return errorResponse(firstError?.message || "Invalid input", 400);
    }

    const data = parsed.data;

    // Check unique code
    const existingCode = await db.course.findUnique({
      where: { code: data.code },
    });
    if (existingCode) {
      return errorResponse("Course code already exists", 409);
    }

    // Check department exists
    const department = await db.department.findUnique({
      where: { id: data.departmentId },
    });
    if (!department) {
      return errorResponse("Department not found", 404);
    }

    // Check instructor exists if provided
    if (data.instructorId) {
      const instructor = await db.faculty.findUnique({
        where: { id: data.instructorId },
      });
      if (!instructor) {
        return errorResponse("Instructor not found", 404);
      }
    }

    const course = await db.course.create({
      data: {
        code: data.code,
        name: data.name,
        departmentId: data.departmentId,
        creditHours: data.creditHours,
        labCreditHours: data.labCreditHours,
        courseType: data.courseType,
        semesterOffered: data.semesterOffered ?? null,
        description: data.description || null,
        prerequisiteIds: data.prerequisites || "[]",
        objectives: data.objectives || null,
        instructorId: data.instructorId ?? null,
      },
      include: {
        instructor: {
          select: { id: true, facultyId: true, user: { select: { name: true } } },
        },
        department: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return successResponse(course, "Course created successfully", 201);
  } catch (error) {
    console.error("POST /api/courses error:", error);
    return errorResponse("Failed to create course", 500);
  }
}