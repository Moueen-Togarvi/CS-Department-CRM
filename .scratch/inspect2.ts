import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const sem = await prisma.semester.findMany();
  console.log("SEMESTER:", sem);
  const offerings = await prisma.courseOffering.findMany({ select: { id: true, courseId: true, facultyId: true, semesterId: true, section: true, isActive: true } });
  console.log("OFFERINGS:", offerings);
  const students = await prisma.student.count();
  const attendanceSample = await prisma.attendance.findMany({ take: 2 });
  console.log("attendance sample:", attendanceSample);
}
main().finally(() => prisma.$disconnect());
