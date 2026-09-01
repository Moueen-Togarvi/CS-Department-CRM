import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const courses = await prisma.course.findMany({ select: { id: true, code: true, name: true } });
  console.log("COURSES:", courses);

  const timetable = await prisma.timetable.findMany({
    select: { id: true, courseId: true, facultyId: true, semesterId: true, section: true, day: true, startTime: true, endTime: true },
  });
  console.log("TIMETABLE:", timetable);

  const students = await prisma.student.findMany({
    select: { id: true, studentId: true, currentSemester: true, session: true, section: true, status: true, userId: true },
    take: 30,
  });
  console.log("STUDENTS:", students);

  const faculty = await prisma.faculty.findMany({ select: { id: true, facultyId: true, userId: true } });
  console.log("FACULTY:", faculty);

  const users = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true, email: true, role: true } });
  console.log("ADMIN USERS:", users);
}
main().finally(() => prisma.$disconnect());
