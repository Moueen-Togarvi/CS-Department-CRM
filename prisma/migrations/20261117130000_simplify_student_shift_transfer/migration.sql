ALTER TABLE "Student" ADD COLUMN "shiftedFrom" TEXT;

-- Move students already marked as Evening-to-Morning transfers onto the single
-- active shift/section fields before removing the temporary class-placement fields.
UPDATE "Student"
SET
  "shiftedFrom" = 'Evening',
  "shift" = 'Morning',
  "section" = COALESCE("classSection", "section")
WHERE LOWER(COALESCE("shift", '')) = 'evening'
  AND LOWER(COALESCE("classShift", '')) = 'morning';

ALTER TABLE "Student" DROP COLUMN "classShift";
ALTER TABLE "Student" DROP COLUMN "classSection";
