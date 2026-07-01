/**
 * One-off backfill: derive CourseOffering rows from existing Timetable slots.
 * Usage: bun run scripts/backfill-offerings.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const slots = await prisma.timetable.findMany({
    select: { courseId: true, facultyId: true, semesterId: true, section: true, slotType: true },
  });

  const seen = new Set<string>();
  let created = 0;

  for (const s of slots) {
    const section = s.section || "A";
    const slotType = s.slotType || "THEORY";
    const key = `${s.courseId}|${s.semesterId}|${section}|${slotType}`;
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      await prisma.courseOffering.create({
        data: {
          courseId: s.courseId,
          facultyId: s.facultyId,
          semesterId: s.semesterId,
          section,
          slotType,
          isActive: true,
        },
      });
      created++;
    } catch (e) {
      // ignore unique constraint violations (already exists)
    }
  }

  // Also create offerings from Course.instructorId for the current semester
  const current = await prisma.semester.findFirst({ where: { isCurrent: true } });
  if (current) {
    const instructedCourses = await prisma.course.findMany({
      where: { instructorId: { not: null } },
      select: { id: true, instructorId: true },
    });
    for (const c of instructedCourses) {
      if (!c.instructorId) continue;
      const key = `${c.id}|${current.id}|A|THEORY`;
      if (seen.has(key)) continue;
      seen.add(key);
      try {
        await prisma.courseOffering.create({
          data: {
            courseId: c.id,
            facultyId: c.instructorId,
            semesterId: current.id,
            section: "A",
            slotType: "THEORY",
            isActive: true,
          },
        });
        created++;
      } catch (e) {
        // ignore
      }
    }
  }

  console.log(`✓ Backfilled ${created} course offerings`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
