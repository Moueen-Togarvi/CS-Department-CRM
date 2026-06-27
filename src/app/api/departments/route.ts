import { db } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);

    const departments = await db.department.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });

    return successResponse(departments);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return errorResponse(error.message, 401);
    }
    return errorResponse("Failed to fetch departments");
  }
}