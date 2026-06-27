import { PrismaClient, Gender, DayOfWeek, AttendanceStatus, GradeScale, SessionStatus, SemesterType, CourseType, AnnouncementType, ProjectStatus, DocumentCategory, EvaluationType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Helper: hash password
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Helper: generate dates for a week (Mon-Fri) starting from a given date
function getWeekDates(startDate: Date, weekIndex: number): Date[] {
  const dates: Date[] = [];
  const weekStart = new Date(startDate);
  weekStart.setDate(weekStart.getDate() + weekIndex * 7);

  for (let day = 1; day <= 5; day++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + (day - 1));
    d.setHours(9, 0, 0, 0);
    dates.push(d);
  }
  return dates;
}

// Helper: calculate grade from percentage
function calculateGrade(percentage: number): { grade: GradeScale; gradePoint: number } {
  if (percentage >= 90) return { grade: "A", gradePoint: 4.0 };
  if (percentage >= 85) return { grade: "A_MINUS", gradePoint: 3.7 };
  if (percentage >= 80) return { grade: "B_PLUS", gradePoint: 3.3 };
  if (percentage >= 75) return { grade: "B", gradePoint: 3.0 };
  if (percentage >= 70) return { grade: "B_MINUS", gradePoint: 2.7 };
  if (percentage >= 65) return { grade: "C_PLUS", gradePoint: 2.3 };
  if (percentage >= 60) return { grade: "C", gradePoint: 2.0 };
  if (percentage >= 55) return { grade: "C_MINUS", gradePoint: 1.7 };
  if (percentage >= 50) return { grade: "D_PLUS", gradePoint: 1.3 };
  if (percentage >= 45) return { grade: "D", gradePoint: 1.0 };
  return { grade: "F", gradePoint: 0.0 };
}

// Seeded random for reproducibility
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

async function main() {
  console.log("🌱 Seeding database...\n");

  // Clear existing data (in order of dependencies)
  console.log("Clearing existing data...");
  await prisma.attendance.deleteMany();
  await prisma.result.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.timetable.deleteMany();
  await prisma.fYPEvaluation.deleteMany();
  await prisma.projectMilestone.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.document.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.course.deleteMany();
  await prisma.student.deleteMany();
  await prisma.faculty.deleteMany();
  await prisma.user.deleteMany();
  await prisma.room.deleteMany();
  await prisma.semester.deleteMany();
  await prisma.department.deleteMany();
  console.log("Data cleared.\n");

  // ==================== 1. DEPARTMENT ====================
  console.log("Creating department...");
  const department = await prisma.department.create({
    data: {
      name: "Computer Science",
      code: "CS",
      description: "Department of Computer Science - Leading in computing education and research",
      establishedYear: 2005,
    },
  });
  console.log(`  ✓ Department: ${department.name} (${department.code})\n`);

  // ==================== 2. SEMESTERS ====================
  console.log("Creating semesters...");
  const semesters = await prisma.semester.createMany({
    data: [
      {
        name: "Fall 2024",
        type: SemesterType.FALL,
        year: 2024,
        startDate: new Date("2024-09-02"),
        endDate: new Date("2025-01-10"),
        status: SessionStatus.COMPLETED,
        isCurrent: false,
      },
      {
        name: "Spring 2025",
        type: SemesterType.SPRING,
        year: 2025,
        startDate: new Date("2025-02-03"),
        endDate: new Date("2025-06-13"),
        status: SessionStatus.ACTIVE,
        isCurrent: true,
      },
      {
        name: "Fall 2025",
        type: SemesterType.FALL,
        year: 2025,
        startDate: new Date("2025-09-01"),
        endDate: new Date("2026-01-09"),
        status: SessionStatus.UPCOMING,
        isCurrent: false,
      },
    ],
  });

  const semesterData = await prisma.semester.findMany({ orderBy: { startDate: "asc" } });
  const fall2024 = semesterData[0];
  const spring2025 = semesterData[1];
  const fall2025 = semesterData[2];
  console.log(`  ✓ Created ${semesters.count} semesters: Fall 2024, Spring 2025, Fall 2025\n`);

  // ==================== 3. ROOMS ====================
  console.log("Creating rooms...");
  const rooms = await prisma.room.createMany({
    data: [
      { name: "Room-101", building: "Academic Block A", floor: 1, capacity: 40, roomType: "CLASSROOM", hasProjector: true, hasAC: true, isAvailable: true },
      { name: "Room-102", building: "Academic Block A", floor: 1, capacity: 35, roomType: "CLASSROOM", hasProjector: true, hasAC: true, isAvailable: true },
      { name: "Room-201", building: "Academic Block A", floor: 2, capacity: 40, roomType: "CLASSROOM", hasProjector: true, hasAC: true, isAvailable: true },
      { name: "Lab-301", building: "IT Building", floor: 3, capacity: 30, roomType: "LAB", hasProjector: true, hasAC: true, isAvailable: true },
      { name: "Lab-302", building: "IT Building", floor: 3, capacity: 25, roomType: "LAB", hasProjector: true, hasAC: true, isAvailable: true },
      { name: "Seminar-Hall", building: "Main Building", floor: 1, capacity: 100, roomType: "SEMINAR_HALL", hasProjector: true, hasAC: true, isAvailable: true },
    ],
  });
  const roomData = await prisma.room.findMany({ orderBy: { name: "asc" } });
  console.log(`  ✓ Created ${rooms.count} rooms\n`);

  // ==================== 4. ADMIN USER ====================
  console.log("Creating admin user...");
  const adminPassword = await hashPassword("admin123");
  const admin = await prisma.user.create({
    data: {
      email: "admin@csdept.edu",
      password: adminPassword,
      name: "System Administrator",
      role: "ADMIN",
      phone: "+92-300-0000001",
      isActive: true,
    },
  });
  console.log(`  ✓ Admin: ${admin.email}\n`);

  // ==================== 5. FACULTY ====================
  console.log("Creating faculty...");
  const facultyPassword = await hashPassword("faculty123");

  const facultyDefs = [
    {
      name: "Dr. Sarah Khan", email: "sarah.khan@csdept.edu", facultyId: "F-001",
      designation: "Professor", specialization: "AI & ML",
      highestDegree: "PhD Computer Science", joiningDate: new Date("2010-08-01"),
      officeRoom: "Room-201", officeHours: "Mon/Wed 14:00-16:00", bio: "Professor with 15+ years of experience in AI and Machine Learning research.",
      phone: "+92-300-1000001", isHead: true,
    },
    {
      name: "Dr. Ahmed Hassan", email: "ahmed.hassan@csdept.edu", facultyId: "F-002",
      designation: "Associate Professor", specialization: "Database Systems",
      highestDegree: "PhD Computer Science", joiningDate: new Date("2013-08-01"),
      officeRoom: "Room-202", officeHours: "Tue/Thu 10:00-12:00", bio: "Expert in database systems, data warehousing, and big data analytics.",
      phone: "+92-300-1000002", isHead: false,
    },
    {
      name: "Mr. Ali Raza", email: "ali.raza@csdept.edu", facultyId: "F-003",
      designation: "Lecturer", specialization: "Web Development",
      highestDegree: "MS Computer Science", joiningDate: new Date("2019-01-15"),
      officeRoom: "Room-203", officeHours: "Mon/Wed 10:00-12:00", bio: "Full-stack developer turned academic with industry experience at top tech companies.",
      phone: "+92-300-1000003", isHead: false,
    },
    {
      name: "Dr. Fatima Noor", email: "fatima.noor@csdept.edu", facultyId: "F-004",
      designation: "Assistant Professor", specialization: "Algorithms",
      highestDegree: "PhD Computer Science", joiningDate: new Date("2017-08-01"),
      officeRoom: "Room-204", officeHours: "Tue/Thu 14:00-16:00", bio: "Specialist in algorithm design, competitive programming, and computational complexity.",
      phone: "+92-300-1000004", isHead: false,
    },
    {
      name: "Mr. Usman Tariq", email: "usman.tariq@csdept.edu", facultyId: "F-005",
      designation: "Lecturer", specialization: "Mobile App Development",
      highestDegree: "MS Computer Science", joiningDate: new Date("2021-01-15"),
      officeRoom: "Room-205", officeHours: "Wed/Fri 10:00-12:00", bio: "Mobile development expert with publications in cross-platform app architectures.",
      phone: "+92-300-1000005", isHead: false,
    },
  ];

  const facultyRecords: { user: any; faculty: any }[] = [];

  for (const f of facultyDefs) {
    const user = await prisma.user.create({
      data: {
        email: f.email,
        password: facultyPassword,
        name: f.name,
        role: "FACULTY",
        phone: f.phone,
        isActive: true,
      },
    });
    const faculty = await prisma.faculty.create({
      data: {
        userId: user.id,
        facultyId: f.facultyId,
        departmentId: department.id,
        designation: f.designation,
        specialization: f.specialization,
        highestDegree: f.highestDegree,
        joiningDate: f.joiningDate,
        officeRoom: f.officeRoom,
        officeHours: f.officeHours,
        bio: f.bio,
        isAvailable: true,
      },
    });
    facultyRecords.push({ user, faculty });
    console.log(`  ✓ Faculty: ${f.name} (${f.facultyId})`);
  }

  // Set department head
  await prisma.department.update({
    where: { id: department.id },
    data: { headId: facultyRecords[0].faculty.id },
  });
  console.log(`  ✓ Set ${facultyRecords[0].faculty.facultyId} as department head\n`);

  // ==================== 6. STUDENTS ====================
  console.log("Creating students...");
  const studentPassword = await hashPassword("student123");

  const studentDefs = [
    // Batch 2023 - Semester 7 (seniors)
    { name: "Muhammad Ali", studentId: "CS-2023-001", gender: Gender.MALE, year: 2023, semester: 7, gpa: 3.5, dob: "2002-03-15", phone: "+92-301-2000001", guardian: "Ali Akbar", guardianPhone: "+92-300-9000001" },
    { name: "Ayesha Siddiqui", studentId: "CS-2023-002", gender: Gender.FEMALE, year: 2023, semester: 7, gpa: 3.8, dob: "2002-07-22", phone: "+92-301-2000002", guardian: "Siddiqui Ahmed", guardianPhone: "+92-300-9000002" },
    { name: "Hassan Mehmood", studentId: "CS-2023-003", gender: Gender.MALE, year: 2023, semester: 7, gpa: 3.2, dob: "2002-11-08", phone: "+92-301-2000003", guardian: "Mehmood Shah", guardianPhone: "+92-300-9000003" },
    { name: "Zainab Khan", studentId: "CS-2023-004", gender: Gender.FEMALE, year: 2023, semester: 7, gpa: 3.6, dob: "2002-01-30", phone: "+92-301-2000004", guardian: "Khan Rahim", guardianPhone: "+92-300-9000004" },
    { name: "Bilal Ahmed", studentId: "CS-2023-005", gender: Gender.MALE, year: 2023, semester: 7, gpa: 3.4, dob: "2002-05-12", phone: "+92-301-2000005", guardian: "Ahmed Naseer", guardianPhone: "+92-300-9000005" },
    // Batch 2024 - Semester 3
    { name: "Sara Ali", studentId: "CS-2024-001", gender: Gender.FEMALE, year: 2024, semester: 3, gpa: null, dob: "2003-09-18", phone: "+92-301-2000006", guardian: "Ali Muhammad", guardianPhone: "+92-300-9000006" },
    { name: "Omar Farooq", studentId: "CS-2024-002", gender: Gender.MALE, year: 2024, semester: 3, gpa: null, dob: "2003-04-05", phone: "+92-301-2000007", guardian: "Farooq Khan", guardianPhone: "+92-300-9000007" },
    { name: "Hira Shah", studentId: "CS-2024-003", gender: Gender.FEMALE, year: 2024, semester: 3, gpa: null, dob: "2003-12-25", phone: "+92-301-2000008", guardian: "Shah Wali", guardianPhone: "+92-300-9000008" },
    { name: "Farhan Raza", studentId: "CS-2024-004", gender: Gender.MALE, year: 2024, semester: 3, gpa: null, dob: "2003-06-14", phone: "+92-301-2000009", guardian: "Raza Muhammad", guardianPhone: "+92-300-9000009" },
    { name: "Amina Yousuf", studentId: "CS-2024-005", gender: Gender.FEMALE, year: 2024, semester: 3, gpa: null, dob: "2003-02-28", phone: "+92-301-2000010", guardian: "Yousuf Ali", guardianPhone: "+92-300-9000010" },
    // Batch 2025 - Semester 1 (freshmen)
    { name: "Talha Khan", studentId: "CS-2025-001", gender: Gender.MALE, year: 2025, semester: 1, gpa: null, dob: "2005-08-10", phone: "+92-301-2000011", guardian: "Khan Zahid", guardianPhone: "+92-300-9000011" },
    { name: "Mariam Javed", studentId: "CS-2025-002", gender: Gender.FEMALE, year: 2025, semester: 1, gpa: null, dob: "2005-01-20", phone: "+92-301-2000012", guardian: "Javed Iqbal", guardianPhone: "+92-300-9000012" },
    { name: "Arslan Iqbal", studentId: "CS-2025-003", gender: Gender.MALE, year: 2025, semester: 1, gpa: null, dob: "2005-05-03", phone: "+92-301-2000013", guardian: "Iqbal Hussain", guardianPhone: "+92-300-9000013" },
    { name: "Nadia Hussain", studentId: "CS-2025-004", gender: Gender.FEMALE, year: 2025, semester: 1, gpa: null, dob: "2005-11-17", phone: "+92-301-2000014", guardian: "Hussain Ahmed", guardianPhone: "+92-300-9000014" },
    { name: "Kamran Ali", studentId: "CS-2025-005", gender: Gender.MALE, year: 2025, semester: 1, gpa: null, dob: "2005-03-09", phone: "+92-301-2000015", guardian: "Ali Sher", guardianPhone: "+92-300-9000015" },
  ];

  const studentRecords: { user: any; student: any }[] = [];

  for (const s of studentDefs) {
    const email = `${s.studentId}@student.csdept.edu`;
    const user = await prisma.user.create({
      data: {
        email,
        password: studentPassword,
        name: s.name,
        role: "STUDENT",
        phone: s.phone,
        isActive: true,
      },
    });
    const student = await prisma.student.create({
      data: {
        userId: user.id,
        studentId: s.studentId,
        departmentId: department.id,
        currentSemester: s.semester,
        enrollmentYear: s.year,
        batch: `Batch-${s.year}`,
        program: "BS",
        status: "ACTIVE",
        gpa: s.gpa,
        dateOfBirth: new Date(s.dob),
        gender: s.gender,
        guardianName: s.guardian,
        guardianPhone: s.guardianPhone,
        emergencyContact: s.guardianPhone,
      },
    });
    studentRecords.push({ user, student });
    console.log(`  ✓ Student: ${s.name} (${s.studentId}) - Batch ${s.year}, Sem ${s.semester}`);
  }
  console.log(`  ✓ Total: ${studentRecords.length} students\n`);

  // ==================== 7. COURSES ====================
  console.log("Creating courses...");
  const courseDefs = [
    { code: "CS101", name: "Introduction to Computer Science", creditHours: 3, labCreditHours: 0, courseType: CourseType.THEORY, semOffered: 1, instructorIndex: 3, desc: "Fundamentals of computer science including problem solving, algorithms, and programming concepts." },
    { code: "CS201", name: "Data Structures", creditHours: 3, labCreditHours: 1, courseType: CourseType.THEORY, semOffered: 3, instructorIndex: 1, desc: "Study of fundamental data structures including arrays, linked lists, trees, graphs, and hash tables." },
    { code: "CS202", name: "Object Oriented Programming", creditHours: 3, labCreditHours: 1, courseType: CourseType.THEORY, semOffered: 3, instructorIndex: 2, desc: "Principles of object-oriented programming including encapsulation, inheritance, and polymorphism." },
    { code: "CS301", name: "Database Systems", creditHours: 3, labCreditHours: 1, courseType: CourseType.THEORY, semOffered: 5, instructorIndex: 1, desc: "Relational database design, SQL, normalization, transaction management, and database administration." },
    { code: "CS303", name: "Web Development", creditHours: 3, labCreditHours: 1, courseType: CourseType.THEORY, semOffered: 5, instructorIndex: 2, desc: "Modern web development including front-end frameworks, back-end technologies, and full-stack application development." },
    { code: "CS401", name: "Artificial Intelligence", creditHours: 3, labCreditHours: 0, courseType: CourseType.THEORY, semOffered: 7, instructorIndex: 0, desc: "Introduction to AI covering search algorithms, knowledge representation, machine learning, and neural networks." },
    { code: "CS402", name: "Machine Learning", creditHours: 3, labCreditHours: 0, courseType: CourseType.THEORY, semOffered: 7, instructorIndex: 0, desc: "Supervised and unsupervised learning, neural networks, deep learning, and practical applications." },
    { code: "CS491", name: "Final Year Project I", creditHours: 3, labCreditHours: 0, courseType: CourseType.PROJECT, semOffered: 7, instructorIndex: 0, desc: "First part of the final year project including proposal, literature review, and initial implementation." },
  ];

  const courseRecords: any[] = [];

  for (const c of courseDefs) {
    const course = await prisma.course.create({
      data: {
        code: c.code,
        name: c.name,
        departmentId: department.id,
        creditHours: c.creditHours,
        labCreditHours: c.labCreditHours,
        courseType: c.courseType,
        semesterOffered: c.semOffered,
        description: c.desc,
        isActive: true,
        instructorId: facultyRecords[c.instructorIndex].faculty.id,
      },
    });
    courseRecords.push(course);
    console.log(`  ✓ Course: ${c.code} - ${c.name} (${c.creditHours}+${c.labCreditHours}cr) → ${facultyRecords[c.instructorIndex].faculty.facultyId}`);
  }
  console.log(`  ✓ Total: ${courseRecords.length} courses\n`);

  // ==================== 8. ENROLLMENTS ====================
  console.log("Creating enrollments...");

  // Enrollment mapping: student batch -> course codes in Spring 2025
  // Batch 2023 (seniors) → CS401, CS402, CS491
  // Batch 2024 (sem 3) → CS201, CS202
  // Batch 2025 (freshmen) → CS101

  const enrollmentDefs: { studentIdx: number; courseIdx: number }[] = [
    // Batch 2023 → CS401 (idx 5), CS402 (idx 6), CS491 (idx 7)
    { studentIdx: 0, courseIdx: 5 },
    { studentIdx: 0, courseIdx: 6 },
    { studentIdx: 0, courseIdx: 7 },
    { studentIdx: 1, courseIdx: 5 },
    { studentIdx: 1, courseIdx: 6 },
    { studentIdx: 1, courseIdx: 7 },
    { studentIdx: 2, courseIdx: 5 },
    { studentIdx: 2, courseIdx: 6 },
    { studentIdx: 2, courseIdx: 7 },
    { studentIdx: 3, courseIdx: 5 },
    { studentIdx: 3, courseIdx: 6 },
    { studentIdx: 3, courseIdx: 7 },
    { studentIdx: 4, courseIdx: 5 },
    { studentIdx: 4, courseIdx: 6 },
    { studentIdx: 4, courseIdx: 7 },
    // Batch 2024 → CS201 (idx 1), CS202 (idx 2)
    { studentIdx: 5, courseIdx: 1 },
    { studentIdx: 5, courseIdx: 2 },
    { studentIdx: 6, courseIdx: 1 },
    { studentIdx: 6, courseIdx: 2 },
    { studentIdx: 7, courseIdx: 1 },
    { studentIdx: 7, courseIdx: 2 },
    { studentIdx: 8, courseIdx: 1 },
    { studentIdx: 8, courseIdx: 2 },
    { studentIdx: 9, courseIdx: 1 },
    { studentIdx: 9, courseIdx: 2 },
    // Batch 2025 → CS101 (idx 0)
    { studentIdx: 10, courseIdx: 0 },
    { studentIdx: 11, courseIdx: 0 },
    { studentIdx: 12, courseIdx: 0 },
    { studentIdx: 13, courseIdx: 0 },
    { studentIdx: 14, courseIdx: 0 },
  ];

  const enrollmentRecords: any[] = [];

  for (const e of enrollmentDefs) {
    const enrollment = await prisma.enrollment.create({
      data: {
        studentId: studentRecords[e.studentIdx].student.id,
        courseId: courseRecords[e.courseIdx].id,
        semesterId: spring2025.id,
        section: "A",
        status: "ENROLLED",
        enrollmentDate: new Date("2025-02-03"),
      },
    });
    enrollmentRecords.push(enrollment);
  }
  console.log(`  ✓ Total: ${enrollmentRecords.length} enrollments in Spring 2025\n`);

  // ==================== 9. TIMETABLE ====================
  console.log("Creating timetable slots for Spring 2025...");

  const timetableDefs = [
    // CS101 (Intro to CS) - Fatima Noor (F-004) - Room-101
    { courseIdx: 0, facultyIdx: 3, roomIdx: 0, day: DayOfWeek.MONDAY, start: "09:00", end: "10:30", type: "THEORY" },
    { courseIdx: 0, facultyIdx: 3, roomIdx: 0, day: DayOfWeek.WEDNESDAY, start: "09:00", end: "10:30", type: "THEORY" },

    // CS201 (Data Structures) - Ahmed Hassan (F-002) - Room-102
    { courseIdx: 1, facultyIdx: 1, roomIdx: 1, day: DayOfWeek.MONDAY, start: "11:00", end: "12:30", type: "THEORY" },
    { courseIdx: 1, facultyIdx: 1, roomIdx: 1, day: DayOfWeek.WEDNESDAY, start: "11:00", end: "12:30", type: "THEORY" },
    { courseIdx: 1, facultyIdx: 1, roomIdx: 3, day: DayOfWeek.FRIDAY, start: "09:00", end: "11:00", type: "LAB" },

    // CS202 (OOP) - Ali Raza (F-003) - Room-201
    { courseIdx: 2, facultyIdx: 2, roomIdx: 2, day: DayOfWeek.TUESDAY, start: "09:00", end: "10:30", type: "THEORY" },
    { courseIdx: 2, facultyIdx: 2, roomIdx: 2, day: DayOfWeek.THURSDAY, start: "09:00", end: "10:30", type: "THEORY" },
    { courseIdx: 2, facultyIdx: 2, roomIdx: 4, day: DayOfWeek.SATURDAY, start: "09:00", end: "11:00", type: "LAB" },

    // CS301 (Database Systems) - Ahmed Hassan (F-002) - Room-201
    { courseIdx: 3, facultyIdx: 1, roomIdx: 2, day: DayOfWeek.TUESDAY, start: "11:00", end: "12:30", type: "THEORY" },
    { courseIdx: 3, facultyIdx: 1, roomIdx: 2, day: DayOfWeek.THURSDAY, start: "11:00", end: "12:30", type: "THEORY" },

    // CS303 (Web Dev) - Ali Raza (F-003) - Lab-301
    { courseIdx: 4, facultyIdx: 2, roomIdx: 3, day: DayOfWeek.MONDAY, start: "14:00", end: "15:30", type: "THEORY" },
    { courseIdx: 4, facultyIdx: 2, roomIdx: 3, day: DayOfWeek.WEDNESDAY, start: "14:00", end: "16:00", type: "LAB" },

    // CS401 (AI) - Sarah Khan (F-001) - Room-201
    { courseIdx: 5, facultyIdx: 0, roomIdx: 2, day: DayOfWeek.MONDAY, start: "09:00", end: "10:30", type: "THEORY" },
    { courseIdx: 5, facultyIdx: 0, roomIdx: 2, day: DayOfWeek.WEDNESDAY, start: "11:00", end: "12:30", type: "THEORY" },

    // CS402 (Machine Learning) - Sarah Khan (F-001) - Seminar-Hall
    { courseIdx: 6, facultyIdx: 0, roomIdx: 5, day: DayOfWeek.TUESDAY, start: "14:00", end: "15:30", type: "THEORY" },
    { courseIdx: 6, facultyIdx: 0, roomIdx: 5, day: DayOfWeek.THURSDAY, start: "14:00", end: "15:30", type: "THEORY" },

    // CS491 (FYP-I) - Sarah Khan (F-001) - Seminar-Hall
    { courseIdx: 7, facultyIdx: 0, roomIdx: 5, day: DayOfWeek.SATURDAY, start: "11:00", end: "13:00", type: "PROJECT" },
  ];

  for (const t of timetableDefs) {
    await prisma.timetable.create({
      data: {
        courseId: courseRecords[t.courseIdx].id,
        facultyId: facultyRecords[t.facultyIdx].faculty.id,
        semesterId: spring2025.id,
        roomId: roomData[t.roomIdx].id,
        section: "A",
        day: t.day,
        startTime: t.start,
        endTime: t.end,
        slotType: t.type,
        isRecurring: true,
        effectiveFrom: spring2025.startDate,
        effectiveTo: spring2025.endDate,
      },
    });
  }
  console.log(`  ✓ Total: ${timetableDefs.length} timetable slots\n`);

  // ==================== 10. ATTENDANCE ====================
  console.log("Creating attendance records for Spring 2025...");

  const random = seededRandom(42);
  const spring2025Start = new Date("2025-02-03"); // Monday

  // For each enrollment, create 10 weeks of Mon-Fri attendance
  // But only on days the course actually meets
  let attendanceCount = 0;

  for (const enrollment of enrollmentRecords) {
    const course = courseRecords.find((c: any) => c.id === enrollment.courseId)!;
    const courseSlots = timetableDefs.filter(
      (t: any) => courseRecords[t.courseIdx].id === course.id
    );

    // Determine which days of the week this course meets
    const courseDays: DayOfWeek[] = [...new Set(courseSlots.map((t: any) => t.day))];

    // Determine attendance rate for this student (most 75-95%, some below 60%)
    const studentIdx = enrollmentRecords.indexOf(enrollment);
    let attendanceRate: number;

    if (studentIdx === 2 || studentIdx === 14 || studentIdx === 8) {
      // Hassan Mehmood (2), Kamran Ali (14), Farhan Raza (8) - low attendance
      attendanceRate = 0.45 + random() * 0.15; // 45-60%
    } else {
      attendanceRate = 0.75 + random() * 0.20; // 75-95%
    }

    const markedById = admin.id;

    for (let week = 0; week < 10; week++) {
      const weekDates = getWeekDates(spring2025Start, week);

      for (const weekDate of weekDates) {
        // Determine which day of the week this is (Mon=1, Tue=2, ..., Fri=5, Sat=6)
        const jsDay = weekDate.getDay();
        let prismaDay: DayOfWeek | undefined;

        if (jsDay === 1) prismaDay = DayOfWeek.MONDAY;
        else if (jsDay === 2) prismaDay = DayOfWeek.TUESDAY;
        else if (jsDay === 3) prismaDay = DayOfWeek.WEDNESDAY;
        else if (jsDay === 4) prismaDay = DayOfWeek.THURSDAY;
        else if (jsDay === 5) prismaDay = DayOfWeek.FRIDAY;
        else if (jsDay === 6) prismaDay = DayOfWeek.SATURDAY;

        if (!prismaDay || !courseDays.includes(prismaDay)) continue;

        // Determine attendance status
        let status: AttendanceStatus;
        const roll = random();

        if (roll < attendanceRate) {
          if (roll < attendanceRate * 0.85) {
            status = AttendanceStatus.PRESENT;
          } else {
            status = AttendanceStatus.LATE;
          }
        } else {
          if (roll < attendanceRate + 0.05) {
            status = AttendanceStatus.EXCUSED;
          } else {
            status = AttendanceStatus.ABSENT;
          }
        }

        await prisma.attendance.create({
          data: {
            studentId: enrollment.studentId,
            facultyId: course.instructorId,
            courseId: course.id,
            semesterId: spring2025.id,
            date: weekDate,
            status,
            markedBy: markedById,
          },
        });
        attendanceCount++;
      }
    }
  }
  console.log(`  ✓ Total: ${attendanceCount} attendance records\n`);

  // ==================== 11. RESULTS FOR FALL 2024 ====================
  console.log("Creating results for Fall 2024 (completed semester)...");

  // For batch 2023, create results for courses they would have taken in Fall 2024
  // Assume they took: CS301 (Database), CS303 (Web Dev), CS302 (Algorithms), CS304 (OS)
  // We'll create results using existing course IDs but different semester
  // Since we only have 8 courses, let's create results for Fall 2024 using CS301, CS303, and CS201 (they'd have retaken or it was scheduled differently)
  // Better: create results for the batch 2023 in CS301 (idx 3), CS303 (idx 4), and CS401 (idx 5) in Fall 2024

  // Actually, let's be practical. For Fall 2024, batch 2023 (then in sem 6) would have taken:
  // Some courses. Let's use CS301 and CS303 as their Fall 2024 courses.
  // We also need Fall 2024 enrollments for batch 2023.

  // Create Fall 2024 enrollments for batch 2023 students
  const fall2024CourseIndices = [3, 4]; // CS301, CS303
  const fall2024Enrollments: any[] = [];

  for (let i = 0; i < 5; i++) {
    for (const cIdx of fall2024CourseIndices) {
      const enrollment = await prisma.enrollment.create({
        data: {
          studentId: studentRecords[i].student.id,
          courseId: courseRecords[cIdx].id,
          semesterId: fall2024.id,
          section: "A",
          status: "ENROLLED",
          enrollmentDate: new Date("2024-09-02"),
        },
      });
      fall2024Enrollments.push({ enrollment, courseIdx: cIdx, studentIdx: i });
    }
  }

  // Also create results for batch 2024 students in CS101 (they took it in Fall 2024 before Spring 2025)
  for (let i = 5; i < 10; i++) {
    const enrollment = await prisma.enrollment.create({
      data: {
        studentId: studentRecords[i].student.id,
        courseId: courseRecords[0].id, // CS101
        semesterId: fall2024.id,
        section: "A",
        status: "ENROLLED",
        enrollmentDate: new Date("2024-09-02"),
      },
    });
    fall2024Enrollments.push({ enrollment, courseIdx: 0, studentIdx: i });
  }

  // Predefined realistic marks for batch 2023 students
  const marksData2023: Record<number, { assignment: number; quiz: number; midterm: number; final: number; lab: number }> = {
    0: { assignment: 18, quiz: 15, midterm: 32, final: 45, lab: 25 },  // Muhammad Ali
    1: { assignment: 20, quiz: 18, midterm: 38, final: 48, lab: 28 },  // Ayesha - high performer
    2: { assignment: 14, quiz: 12, midterm: 25, final: 35, lab: 20 },  // Hassan - lower
    3: { assignment: 19, quiz: 16, midterm: 35, final: 46, lab: 27 },  // Zainab
    4: { assignment: 16, quiz: 14, midterm: 28, final: 40, lab: 23 },  // Bilal
  };

  // Predefined realistic marks for batch 2024 students in CS101
  const marksData2024_CS101: Record<number, { assignment: number; quiz: number; midterm: number; final: number; lab: number }> = {
    5:  { assignment: 17, quiz: 14, midterm: 30, final: 42, lab: 0 },
    6:  { assignment: 19, quiz: 16, midterm: 36, final: 47, lab: 0 },
    7:  { assignment: 15, quiz: 13, midterm: 27, final: 38, lab: 0 },
    8:  { assignment: 12, quiz: 10, midterm: 22, final: 30, lab: 0 },  // Farhan - struggling
    9:  { assignment: 18, quiz: 15, midterm: 33, final: 44, lab: 0 },
  };

  // Also add marks for batch 2024 in CS201 and CS202 (hypothetical Fall 2024 for variety)
  // Actually no - batch 2024 is sem 3 in Spring 2025, so in Fall 2024 they were sem 1 taking CS101.
  // Let's keep it realistic.

  const resultCount = { count: 0 };

  // Create results for batch 2023 in Fall 2024 (CS301, CS303)
  for (const e of fall2024Enrollments) {
    const marks =
      e.studentIdx < 5
        ? marksData2023[e.studentIdx]
        : marksData2024_CS101[e.studentIdx];

    if (!marks) continue;

    const course = courseRecords[e.courseIdx];
    const totalMarks = 100;
    // Weighting: Assignment 20, Quiz 20, Midterm 40, Final 60, Lab 30 (but lab only for courses with lab credits)
    const maxAssignment = 20;
    const maxQuiz = 20;
    const maxMidterm = 40;
    const maxFinal = 60;
    const maxLab = course.labCreditHours > 0 ? 30 : 0;
    const maxTotal = maxAssignment + maxQuiz + maxMidterm + maxFinal + maxLab;

    const totalScore = marks.assignment + marks.quiz + marks.midterm + marks.final + marks.lab;
    const percentage = (totalScore / maxTotal) * 100;
    const { grade, gradePoint } = calculateGrade(percentage);

    await prisma.result.create({
      data: {
        enrollmentId: e.enrollment.id,
        studentId: e.enrollment.studentId,
        courseId: e.enrollment.courseId,
        semesterId: fall2024.id,
        assignmentMarks: marks.assignment,
        quizMarks: marks.quiz,
        midtermMarks: marks.midterm,
        finalMarks: marks.final,
        labMarks: maxLab > 0 ? marks.lab : null,
        totalMarks: totalScore,
        percentage: Math.round(percentage * 100) / 100,
        grade,
        gradePoint,
        isLocked: true,
      },
    });
    resultCount.count++;
  }

  console.log(`  ✓ Total: ${resultCount.count} results for Fall 2024 (${fall2024Enrollments.length} enrollments)\n`);

  // ==================== 12. ANNOUNCEMENTS ====================
  console.log("Creating announcements...");
  await prisma.announcement.createMany({
    data: [
      {
        title: "Welcome to Spring 2025 Semester!",
        content: "Dear students, welcome to the Spring 2025 semester. Classes commence from February 3, 2025. Please check your timetables and ensure you are registered for the correct courses. Wishing everyone a productive semester ahead!",
        type: AnnouncementType.GENERAL,
        priority: 2,
        targetAudience: "ALL",
        departmentId: department.id,
        isPublished: true,
        publishedAt: new Date("2025-01-27"),
        createdBy: admin.id,
      },
      {
        title: "Mid-Term Examination Schedule",
        content: "Mid-term examinations will be held from March 24 to April 4, 2025. The detailed schedule will be posted on the notice board and website. Students are advised to collect their exam slips from the admin office.",
        type: AnnouncementType.NOTICE,
        priority: 3,
        targetAudience: "ALL",
        departmentId: department.id,
        isPublished: true,
        publishedAt: new Date("2025-03-10"),
        createdBy: admin.id,
      },
      {
        title: "AI Research Seminar: Future of Large Language Models",
        content: "Join Dr. Sarah Khan for an insightful seminar on the latest developments in Large Language Models and their impact on society. Date: March 15, 2025 at 2:00 PM in the Seminar Hall. All faculty and senior students are encouraged to attend.",
        type: AnnouncementType.SEMINAR,
        priority: 2,
        targetAudience: "FACULTY,STUDENT",
        departmentId: department.id,
        eventDate: new Date("2025-03-15T14:00:00"),
        eventLocation: "Seminar Hall, Main Building",
        isPublished: true,
        publishedAt: new Date("2025-03-05"),
        createdBy: facultyRecords[0].user.id,
      },
      {
        title: "Code Fest 2025 - Annual Programming Competition",
        content: "The CS Department is organizing its annual programming competition on April 20, 2025. Register in teams of 2-3 members. Exciting prizes and certificates for winners! Registration deadline: April 10, 2025.",
        type: AnnouncementType.EVENT,
        priority: 3,
        targetAudience: "STUDENT",
        departmentId: department.id,
        eventDate: new Date("2025-04-20T09:00:00"),
        eventLocation: "IT Building, Labs 301 & 302",
        isPublished: true,
        publishedAt: new Date("2025-03-20"),
        createdBy: facultyRecords[3].user.id,
      },
      {
        title: "FYP Proposal Submission Deadline Extended",
        content: "The deadline for Final Year Project proposals has been extended to March 31, 2025. All CS-2023 batch students must submit their proposals through the project portal. Late submissions will not be accepted.",
        type: AnnouncementType.URGENT,
        priority: 5,
        targetAudience: "STUDENT",
        departmentId: department.id,
        isPublished: true,
        publishedAt: new Date("2025-03-18"),
        expiresAt: new Date("2025-04-01"),
        createdBy: facultyRecords[0].user.id,
      },
      {
        title: "Database Workshop by Industry Expert",
        content: "A hands-on workshop on modern database technologies (PostgreSQL, MongoDB, Redis) will be conducted by Mr. Tahir Malik from TechCorp. Open to all students of semester 3 and above. Limited seats available.",
        type: AnnouncementType.EVENT,
        priority: 1,
        targetAudience: "STUDENT",
        departmentId: department.id,
        eventDate: new Date("2025-04-10T10:00:00"),
        eventLocation: "Lab 301, IT Building",
        isPublished: true,
        publishedAt: new Date("2025-03-25"),
        createdBy: facultyRecords[1].user.id,
      },
      {
        title: "Spring Break Notice",
        content: "The university will observe spring break from April 14 to April 18, 2025. Classes will resume on April 21, 2025. All labs and offices will remain closed during this period.",
        type: AnnouncementType.NOTICE,
        priority: 2,
        targetAudience: "ALL",
        departmentId: department.id,
        isPublished: true,
        publishedAt: new Date("2025-04-07"),
        createdBy: admin.id,
      },
      {
        title: "New Lab Equipment Installed",
        content: "Lab 302 has been upgraded with 25 new high-performance workstations featuring RTX 4070 GPUs, 32GB RAM, and Intel i9 processors. These are available for ML/AI and graphics courses. Booking system will be live next week.",
        type: AnnouncementType.GENERAL,
        priority: 1,
        targetAudience: "ALL",
        departmentId: department.id,
        isPublished: true,
        publishedAt: new Date("2025-02-15"),
        createdBy: admin.id,
      },
    ],
  });
  console.log("  ✓ Total: 8 announcements\n");

  // ==================== 13. VERIFICATION ====================
  console.log("📊 Verification - Record counts:");

  const counts = await Promise.all([
    prisma.user.count(),
    prisma.department.count(),
    prisma.semester.count(),
    prisma.room.count(),
    prisma.faculty.count(),
    prisma.student.count(),
    prisma.course.count(),
    prisma.enrollment.count(),
    prisma.timetable.count(),
    prisma.attendance.count(),
    prisma.result.count(),
    prisma.announcement.count(),
  ]);

  const labels = [
    "Users", "Departments", "Semesters", "Rooms", "Faculty",
    "Students", "Courses", "Enrollments", "Timetable slots",
    "Attendance records", "Results", "Announcements",
  ];

  for (let i = 0; i < labels.length; i++) {
    console.log(`  ${labels[i]}: ${counts[i]}`);
  }

  console.log("\n✅ Seed completed successfully!");
  console.log("\n🔑 Test Accounts:");
  console.log("  Admin:   admin@csdept.edu / admin123");
  console.log("  Faculty: sarah.khan@csdept.edu / faculty123 (or any faculty email)");
  console.log("  Student: CS-2023-001@student.csdept.edu / student123 (or any student email)");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });