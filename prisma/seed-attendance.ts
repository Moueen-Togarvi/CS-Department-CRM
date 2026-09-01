import { PrismaClient, AttendanceStatus } from "@prisma/client";

const prisma = new PrismaClient();

// Seeded random for reproducibility
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function pickStatus(random: () => number): AttendanceStatus {
  const roll = random();
  if (roll < 0.78) return AttendanceStatus.PRESENT;
  if (roll < 0.88) return AttendanceStatus.LATE;
  if (roll < 0.94) return AttendanceStatus.EXCUSED;
  return AttendanceStatus.ABSENT;
}

async function main() {
  console.log("Seeding a small batch of attendance records...\n");

  const semester = await prisma.semester.findFirst({ where: { isCurrent: true } });
  if (!semester) throw new Error("No current semester found. Aborting.");
  console.log(`Using semester: ${semester.name}`);

  const offerings = await prisma.courseOffering.findMany({
    where: { semesterId: semester.id, isActive: true },
    include: { course: true, faculty: true },
  });
  if (!offerings.length) throw new Error("No active course offerings found for the current semester. Aborting.");

  // Session dates: two sessions/week from semester start through today (or now).
  const sessionDates: Date[] = [];
  const cursor = new Date(semester.startDate);
  const today = new Date();
  while (cursor <= today) {
    const day = cursor.getDay();
    if (day === 1 || day === 3) {
      sessionDates.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  if (!sessionDates.length) sessionDates.push(new Date(semester.startDate));
  console.log(`Session dates: ${sessionDates.map((d) => d.toISOString().slice(0, 10)).join(", ")}\n`);

  const random = seededRandom(7);
  let created = 0;
  let updated = 0;

  for (const offering of offerings) {
    const students = await prisma.student.findMany({
      where: { section: offering.section, status: "ACTIVE" },
      select: { id: true, studentId: true },
    });

    if (!students.length) {
      console.log(`  Skipping ${offering.course.code} (${offering.section}) - no students in this section`);
      continue;
    }

    console.log(`  ${offering.course.code} - ${offering.section}: ${students.length} students x ${sessionDates.length} sessions`);

    for (const date of sessionDates) {
      for (const student of students) {
        const status = pickStatus(random);
        const result = await prisma.attendance.upsert({
          where: {
            studentId_courseId_semesterId_date: {
              studentId: student.id,
              courseId: offering.courseId,
              semesterId: semester.id,
              date,
            },
          },
          update: {},
          create: {
            studentId: student.id,
            facultyId: offering.facultyId,
            courseId: offering.courseId,
            semesterId: semester.id,
            date,
            status,
            markedBy: offering.faculty.userId,
          },
        });
        if (result.createdAt.getTime() === result.updatedAt.getTime()) created++;
        else updated++;
      }
    }
  }

  console.log(`\n✅ Done. Created ${created} new attendance records (${updated} already existed).`);
}

main()
  .catch((e) => {
    console.error("❌ Attendance seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
