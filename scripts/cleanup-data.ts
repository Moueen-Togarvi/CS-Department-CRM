import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Cleaning up all seed/fake data...\n");

  // Find the admin user to preserve
  const admin = await prisma.user.findUnique({
    where: { email: "admin@csdept.edu" },
  });

  if (!admin) {
    console.log("⚠️  Admin user (admin@csdept.edu) not found. Nothing to clean.\n");
    return;
  }

  console.log(`✓ Keeping admin user: ${admin.name} (${admin.email})\n`);

  // Delete in dependency order (child tables first)
  console.log("Deleting data...");

  const tables = [
    { name: "Attendance", delete: () => prisma.attendance.deleteMany() },
    { name: "Result", delete: () => prisma.result.deleteMany() },
    { name: "Enrollment", delete: () => prisma.enrollment.deleteMany() },
    { name: "FYPEvaluation", delete: () => prisma.fYPEvaluation.deleteMany() },
    { name: "ProjectMilestone", delete: () => prisma.projectMilestone.deleteMany() },
    { name: "ProjectMember", delete: () => prisma.projectMember.deleteMany() },
    { name: "Project", delete: () => prisma.project.deleteMany() },
    { name: "Timetable", delete: () => prisma.timetable.deleteMany() },
    { name: "Document", delete: () => prisma.document.deleteMany() },
    { name: "Announcement", delete: () => prisma.announcement.deleteMany() },
    { name: "CourseOffering", delete: () => prisma.courseOffering.deleteMany() },
    { name: "Course", delete: () => prisma.course.deleteMany() },
    { name: "Student", delete: () => prisma.student.deleteMany() },
    { name: "Faculty", delete: () => prisma.faculty.deleteMany() },
    { name: "Room", delete: () => prisma.room.deleteMany() },
    { name: "Semester", delete: () => prisma.semester.deleteMany() },
    { name: "Department", delete: () => prisma.department.deleteMany() },
  ];

  for (const table of tables) {
    const result = await table.delete();
    console.log(`  ✓ ${table.name}: ${result.count} records deleted`);
  }

  // Delete all users except the admin
  const deletedUsers = await prisma.user.deleteMany({
    where: { id: { not: admin.id } },
  });
  console.log(`  ✓ User (non-admin): ${deletedUsers.count} records deleted`);

  console.log("\n✅ Cleanup complete! All seed/fake data removed.");
  console.log("   Keep account: admin@csdept.edu / admin123");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Cleanup failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
