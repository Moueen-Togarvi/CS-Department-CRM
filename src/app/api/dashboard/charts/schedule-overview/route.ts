import { db } from "@/lib/db";
import { successResponse } from "@/lib/api-response";
import { requireAdmin, handleApiError } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const DAY_LABELS: Record<string, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
};

export async function GET() {
  try {
    await requireAdmin();

    const currentSemester = await db.semester.findFirst({
      where: { isCurrent: true },
    });

    const where = currentSemester
      ? { semesterId: currentSemester.id }
      : {};

    const records = await db.timetable.findMany({
      where,
      select: { day: true, startTime: true, endTime: true },
    });

    const dayMap = new Map<string, { classes: number; slots: Set<string> }>();
    for (const d of DAYS) {
      dayMap.set(d, { classes: 0, slots: new Set() });
    }

    for (const r of records) {
      const entry = dayMap.get(r.day);
      if (entry) {
        const slotKey = `${r.startTime}-${r.endTime}`;
        if (!entry.slots.has(slotKey)) {
          entry.slots.add(slotKey);
          entry.classes++;
        }
      }
    }

    const data = DAYS.map((d) => ({
      day: DAY_LABELS[d],
      classes: dayMap.get(d)?.classes ?? 0,
    }));

    return successResponse(data);
  } catch (error) {
    return handleApiError(error, "Failed to fetch schedule overview");
  }
}
