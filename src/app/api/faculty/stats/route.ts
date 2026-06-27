import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);

    const [total, byDesignationRaw] = await Promise.all([
      db.faculty.count({
        where: { user: { isActive: true } },
      }),
      db.faculty.groupBy({
        by: ["designation"],
        where: { user: { isActive: true } },
        _count: { designation: true },
      }),
    ]);

    const byDesignation: Record<string, number> = {};
    for (const item of byDesignationRaw) {
      byDesignation[item.designation] = item._count.designation;
    }

    return successResponse({ total, byDesignation });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return errorResponse(error.message, 401);
    }
    console.error("Faculty stats error:", error);
    return errorResponse("Failed to fetch faculty stats");
  }
}