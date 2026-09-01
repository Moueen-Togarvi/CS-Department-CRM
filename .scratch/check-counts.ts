import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const counts = await Promise.all([
    prisma.student.count(),
    prisma.faculty.count(),
    prisma.course.count(),
    prisma.semester.count(),
    prisma.enrollment.count(),
    prisma.attendance.count(),
    prisma.timetable.count(),
    prisma.user.count(),
  ]);
  console.log({
    students: counts[0], faculty: counts[1], courses: counts[2],
    semesters: counts[3], enrollments: counts[4], attendance: counts[5],
    timetable: counts[6], users: counts[7],
  });
  const sem = await prisma.semester.findMany({ select: { id: true, name: true, isCurrent: true, status: true } });
  console.log("semesters:", sem);
}
main().finally(() => prisma.$disconnect());
