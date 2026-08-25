import { NextRequest } from "next/server";
import { parsePrerequisites } from '@/lib/calculations/course'
import { db } from "@/lib/db";
import { parsePaginationParams, skipTake } from "@/lib/pagination";
import { paginatedResponse, errorResponse, successResponse } from "@/lib/api-response";
import { createCourseSchema } from "@/lib/validators/course";
import { Prisma } from "@prisma/client";
import { requireAuth, requireAdmin, requireRole, handleApiError } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const { page, limit, search, sort, order } = parsePaginationParams(searchParams);
    const pageVal = page ?? 1;
    const limitVal = limit ?? 20;

    const courseType = searchParams.get("courseType") || undefined;
    const creditHours = searchParams.get("creditHours")
      ? parseInt(searchParams.get("creditHours")!)
      : undefined;
    const semesterOffered = searchParams.get("semesterOffered")
      ? parseInt(searchParams.get("semesterOffered")!)
      : undefined;

    const where: Prisma.CourseWhereInput = { isActive: true };

    if (session.user.role === 'FACULTY') {
      const faculty = await db.faculty.findUnique({
        where: { userId: session.user.id }
      })
      if (faculty) {
        // Get course IDs from CourseOffering (actual teaching assignments)
        const offerings = await db.courseOffering.findMany({
          where: { facultyId: faculty.id, isActive: true },
          select: { courseId: true },
        })
        where.id = { in: offerings.map((o) => o.courseId) }
      }
    } else if (session.user.role === 'STUDENT') {
      const student = await db.student.findUnique({
        where: { userId: session.user.id }
      });
      if (student) {
        where.semesterOffered = student.currentSemester;
      }
    }

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

    if (semesterOffered && session.user.role !== 'STUDENT') {
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

    const { skip, take } = skipTake(pageVal, limitVal);

    const [courses, total] = await Promise.all([
      db.course.findMany({
        where,
        include: {
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
      department: c.department,
      enrollmentCount: c._count.enrollments,
      createdAt: c.createdAt,
    }));

    return paginatedResponse(data, total, pageVal, limitVal);
  } catch (error) {
    return handleApiError(error, "Failed to fetch courses");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["ADMIN", "FACULTY"]);

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
        prerequisiteIds: parsePrerequisites(data.prerequisites),
        objectives: data.objectives || null,
      },
      include: {
        department: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return successResponse(course, "Course created successfully", 201);
  } catch (error) {
    return handleApiError(error, "Failed to create course");
  }
}