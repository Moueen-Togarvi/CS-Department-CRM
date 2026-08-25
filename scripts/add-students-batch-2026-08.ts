/**
 * One-off batch import of the students given directly by the coordinator on
 * 2026-08-25. Mirrors exactly what POST /api/students does (same hashing,
 * same User+Student transaction), just run over a fixed roster instead of
 * one HTTP request per student.
 *
 * Section naming: the roster gave a single "Morning" group per semester with
 * no A/B split, and a single "Evening" group for semester 7. Mapped both to
 * "...A" to match the section-naming convention already used everywhere else
 * in the app (Morning A/B, Evening A/B) — and already in use by the two real
 * students added since the last data wipe (Omaan Mahmood, ali hassan both
 * use "Morning A"). Where the roster DID split Evening into A/B (semesters 3
 * and 5), that split is kept exactly as given.
 *
 * Enrollment year follows the pattern already present in the live data
 * (semester 3 -> 2025, semester 5 -> 2024, semester 7 -> 2023 — matching
 * Muhammad Ali/CS-2023-001 at semester 7, Omaan Mahmood at semester 5/2024,
 * ali hassan at semester 3/2025).
 *
 * Usage:
 *   npx tsx scripts/add-students-batch-2026-08.ts            # dry run
 *   npx tsx scripts/add-students-batch-2026-08.ts --apply    # write
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const DEFAULT_PASSWORD = "student123";

interface RosterEntry {
  name: string;
  currentSemester: number;
  enrollmentYear: number;
  shift: "Morning" | "Evening";
  section: string;
}

function titleCase(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function group(
  names: string[],
  currentSemester: number,
  enrollmentYear: number,
  shift: "Morning" | "Evening",
  section: string
): RosterEntry[] {
  return names.map((name) => ({
    name: titleCase(name),
    currentSemester,
    enrollmentYear,
    shift,
    section,
  }));
}

const ROSTER: RosterEntry[] = [
  ...group(["mohsin", "safdar"], 3, 2025, "Morning", "Morning A"),
  ...group(["abdullah", "ali", "zain"], 3, 2025, "Evening", "Evening A"),
  ...group(["fakhar", "moueen", "kashif"], 3, 2025, "Evening", "Evening B"),

  ...group(["haithem", "omman", "abdulrehman"], 5, 2024, "Morning", "Morning A"),
  ...group(["hassnain", "hamza", "sajid"], 5, 2024, "Evening", "Evening A"),
  ...group(["abubakar", "zohaib", "ali asad"], 5, 2024, "Evening", "Evening B"),

  ...group(["sanaullah", "ashir", "noor"], 7, 2023, "Morning", "Morning A"),
  ...group(["akhtar", "ayesha", "iqra"], 7, 2023, "Evening", "Evening A"),
];

async function nextStudentId(year: number, taken: Set<string>): Promise<string> {
  const existing = await prisma.student.findMany({
    where: { studentId: { startsWith: `CS-${year}-` } },
    select: { studentId: true },
  });
  let seq =
    1 +
    existing.reduce((max, s) => {
      const n = parseInt(s.studentId.split("-")[2] ?? "0", 10);
      return Number.isNaN(n) ? max : Math.max(max, n);
    }, 0);
  let id = `CS-${year}-${String(seq).padStart(3, "0")}`;
  while (taken.has(id)) {
    seq++;
    id = `CS-${year}-${String(seq).padStart(3, "0")}`;
  }
  taken.add(id);
  return id;
}

async function main() {
  const department = await prisma.department.findFirst({ select: { id: true, name: true } });
  if (!department) throw new Error("No department found — cannot assign students.");

  const takenIds = new Set<string>();
  const rows: Array<RosterEntry & { studentId: string; email: string }> = [];
  for (const entry of ROSTER) {
    const studentId = await nextStudentId(entry.enrollmentYear, takenIds);
    rows.push({ ...entry, studentId, email: `${studentId.toLowerCase()}@student.csdept.edu` });
  }

  console.log(`Department: ${department.name}`);
  console.log(`Password for every new account: ${DEFAULT_PASSWORD}\n`);
  console.log(`${"Name".padEnd(16)} ${"Sem".padEnd(4)} ${"Section".padEnd(11)} ${"Student ID".padEnd(12)} Email`);
  for (const r of rows) {
    console.log(
      `${r.name.padEnd(16)} ${String(r.currentSemester).padEnd(4)} ${r.section.padEnd(11)} ${r.studentId.padEnd(12)} ${r.email}`
    );
  }
  console.log(`\n${rows.length} student(s) total.`);

  if (!APPLY) {
    console.log("\nDry run — nothing written. Re-run with --apply to create these accounts.");
    return;
  }

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  let created = 0;

  for (const r of rows) {
    const existingEmail = await prisma.user.findUnique({ where: { email: r.email } });
    if (existingEmail) {
      console.log(`  SKIP ${r.name} — ${r.email} already exists`);
      continue;
    }

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: r.email, password: hashedPassword, name: r.name, role: "STUDENT" },
      });
      await tx.student.create({
        data: {
          userId: user.id,
          studentId: r.studentId,
          departmentId: department.id,
          currentSemester: r.currentSemester,
          enrollmentYear: r.enrollmentYear,
          batch: `Batch-${r.enrollmentYear}`,
          program: "BS",
          shift: r.shift,
          section: r.section,
        },
      });
    });
    created++;
  }

  console.log(`\nCreated ${created} student account(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
