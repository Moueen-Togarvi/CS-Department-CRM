import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const [total, activeCourses, byTypeRaw] = await Promise.all([
      db.course.count({ where: { isActive: true } }),
      db.course.count({
        where: { isActive: true },
      }),
      db.course.groupBy({
        by: ["courseType"],
        where: { isActive: true },
        _count: { courseType: true },
      }),
    ]);

    // Count active enrollments (not dropped/withdrawn)
    const activeEnrollments = await db.enrollment.count({
      where: {
        status: "ENROLLED",
        course: { isActive: true },
      },
    });

    const byType: Record<string, number> = {};
    for (const item of byTypeRaw) {
      byType[item.courseType] = item._count.courseType;
    }

    return successResponse({
      total,
      active: activeCourses,
      byType,
      activeEnrollments,
    });
  } catch (error) {
    console.error("GET /api/courses/stats error:", error);
    return errorResponse("Failed to fetch course stats", 500);
  }
}