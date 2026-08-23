/**
 * One-off backfill: replace the legacy `Enrollment.section` default of "A" with
 * the student's real section ("Morning A", "Evening B", ...).
 *
 * The column defaults to "A", so rows created before sections were shift-scoped
 * still hold that value. Any filter comparing section strings silently misses
 * them.
 *
 * Usage:
 *   npx tsx scripts/backfill-enrollment-sections.ts            # dry run
 *   npx tsx scripts/backfill-enrollment-sections.ts --apply    # write
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

async function main() {
  const stale = await prisma.enrollment.findMany({
    where: { section: "A" },
    select: {
      id: true,
      section: true,
      student: { select: { section: true, user: { select: { name: true } } } },
      course: { select: { code: true } },
    },
  });

  console.log(`Found ${stale.length} enrollment(s) still on the legacy "A" section.`);

  const fixable = stale.filter((e) => e.student.section && e.student.section !== "A");
  const skipped = stale.filter((e) => !e.student.section || e.student.section === "A");

  for (const e of fixable) {
    console.log(`  ${e.course.code.padEnd(8)} ${e.student.user.name.padEnd(24)} A -> ${e.student.section}`);
  }
  for (const e of skipped) {
    console.log(`  SKIP ${e.course.code} ${e.student.user.name} — student has no section set`);
  }

  if (!APPLY) {
    console.log(`\nDry run. ${fixable.length} row(s) would be updated. Re-run with --apply to write.`);
    return;
  }

  let updated = 0;
  for (const e of fixable) {
    await prisma.enrollment.update({
      where: { id: e.id },
      data: { section: e.student.section as string },
    });
    updated++;
  }
  console.log(`\nUpdated ${updated} enrollment(s). Skipped ${skipped.length}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
