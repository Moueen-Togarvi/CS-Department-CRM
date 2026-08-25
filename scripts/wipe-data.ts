/**
 * Wipe all operational data, keeping only the three demo logins shown on the
 * login page (coordinator, one faculty, one student), their profiles, and the
 * department those profiles reference.
 *
 * Everything else goes: courses, enrollments, attendance, results, timetable,
 * rooms, semesters, announcements, projects, documents, and all other users.
 *
 * Usage:
 *   npx tsx scripts/wipe-data.ts            # dry run — shows what would go
 *   npx tsx scripts/wipe-data.ts --apply    # actually delete
 *
 * Take a backup first. `backups/db-full-*.json` holds one.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

/** The accounts offered by the "Demo Accounts" buttons on /login. */
const KEEP_EMAILS = [
  "admin@csdept.edu",
  "sarah.khan@csdept.edu",
  "cs-2023-001@student.csdept.edu",
];

async function main() {
  const keepUsers = await prisma.user.findMany({
    where: { email: { in: KEEP_EMAILS } },
    select: {
      id: true,
      email: true,
      role: true,
      student: { select: { id: true, departmentId: true } },
      faculty: { select: { id: true, departmentId: true } },
    },
  });

  const missing = KEEP_EMAILS.filter((e) => !keepUsers.some((u) => u.email === e));
  if (missing.length > 0) {
    throw new Error(
      `Refusing to run: these accounts were not found, so the wipe would leave no way in: ${missing.join(", ")}`
    );
  }

  const keepUserIds = keepUsers.map((u) => u.id);
  const keepStudentIds = keepUsers.flatMap((u) => (u.student ? [u.student.id] : []));
  const keepFacultyIds = keepUsers.flatMap((u) => (u.faculty ? [u.faculty.id] : []));
  const keepDeptIds = [
    ...new Set(
      keepUsers.flatMap((u) => [u.student?.departmentId, u.faculty?.departmentId].filter(Boolean) as string[])
    ),
  ];

  console.log("Keeping:");
  for (const u of keepUsers) console.log(`  ${u.role.padEnd(8)} ${u.email}`);
  console.log(`  ${keepStudentIds.length} student profile(s), ${keepFacultyIds.length} faculty profile(s), ${keepDeptIds.length} department(s)\n`);

  const plan: Array<[string, () => Promise<number>, () => Promise<{ count: number }>]> = [
    ["AnnouncementRead", () => prisma.announcementRead.count(), () => prisma.announcementRead.deleteMany()],
    ["Notification", () => prisma.notification.count(), () => prisma.notification.deleteMany()],
    ["FYPEvaluation", () => prisma.fYPEvaluation.count(), () => prisma.fYPEvaluation.deleteMany()],
    ["ProjectMilestone", () => prisma.projectMilestone.count(), () => prisma.projectMilestone.deleteMany()],
    ["ProjectMember", () => prisma.projectMember.count(), () => prisma.projectMember.deleteMany()],
    ["Project", () => prisma.project.count(), () => prisma.project.deleteMany()],
    ["Attendance", () => prisma.attendance.count(), () => prisma.attendance.deleteMany()],
    ["Result", () => prisma.result.count(), () => prisma.result.deleteMany()],
    ["Enrollment", () => prisma.enrollment.count(), () => prisma.enrollment.deleteMany()],
    ["Timetable", () => prisma.timetable.count(), () => prisma.timetable.deleteMany()],
    ["CourseOffering", () => prisma.courseOffering.count(), () => prisma.courseOffering.deleteMany()],
    ["Document", () => prisma.document.count(), () => prisma.document.deleteMany()],
    ["Announcement", () => prisma.announcement.count(), () => prisma.announcement.deleteMany()],
    ["Course", () => prisma.course.count(), () => prisma.course.deleteMany()],
    ["ClassRoomAssignment", () => prisma.classRoomAssignment.count(), () => prisma.classRoomAssignment.deleteMany()],
    ["Room", () => prisma.room.count(), () => prisma.room.deleteMany()],
    ["Semester", () => prisma.semester.count(), () => prisma.semester.deleteMany()],
    ["Upload", () => prisma.upload.count(), () => prisma.upload.deleteMany()],
    [
      "Student (other)",
      () => prisma.student.count({ where: { id: { notIn: keepStudentIds } } }),
      () => prisma.student.deleteMany({ where: { id: { notIn: keepStudentIds } } }),
    ],
    [
      "Faculty (other)",
      () => prisma.faculty.count({ where: { id: { notIn: keepFacultyIds } } }),
      () => prisma.faculty.deleteMany({ where: { id: { notIn: keepFacultyIds } } }),
    ],
    [
      "User (other)",
      () => prisma.user.count({ where: { id: { notIn: keepUserIds } } }),
      () => prisma.user.deleteMany({ where: { id: { notIn: keepUserIds } } }),
    ],
    [
      "Department (other)",
      () => prisma.department.count({ where: { id: { notIn: keepDeptIds } } }),
      () => prisma.department.deleteMany({ where: { id: { notIn: keepDeptIds } } }),
    ],
  ];

  let total = 0;
  for (const [label, count] of plan) {
    const n = await count();
    total += n;
    console.log(`  ${label.padEnd(22)} ${String(n).padStart(5)}`);
  }
  console.log(`  ${"".padEnd(22)} ${"-----"}`);
  console.log(`  ${"TOTAL".padEnd(22)} ${String(total).padStart(5)}\n`);

  if (!APPLY) {
    console.log("Dry run — nothing deleted. Re-run with --apply to proceed.");
    return;
  }

  // A department head pointing at a faculty row that is about to go would
  // block the delete, so clear it first.
  await prisma.department.updateMany({
    where: { headId: { notIn: keepFacultyIds } },
    data: { headId: null },
  });

  for (const [label, , del] of plan) {
    const { count } = await del();
    if (count > 0) console.log(`  deleted ${String(count).padStart(5)}  ${label}`);
  }
  console.log("\nDone.");
}

main()
  .catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
