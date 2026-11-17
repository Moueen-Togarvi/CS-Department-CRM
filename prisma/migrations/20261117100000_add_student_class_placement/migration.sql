ALTER TABLE "Student"
  ADD COLUMN "classShift" TEXT,
  ADD COLUMN "classSection" TEXT;

-- Existing students keep their current placement until explicitly transferred.
UPDATE "Student"
SET
  "classSection" = CASE
    WHEN UPPER(COALESCE("section", '')) IN ('A', 'B') AND LOWER(COALESCE("shift", '')) IN ('morning', 'evening')
      THEN INITCAP(LOWER("shift")) || ' ' || UPPER("section")
    ELSE "section"
  END,
  "classShift" = CASE
    WHEN LOWER(COALESCE("section", '')) LIKE 'evening%' THEN 'Evening'
    WHEN LOWER(COALESCE("section", '')) LIKE 'morning%' THEN 'Morning'
    WHEN LOWER(COALESCE("shift", '')) = 'evening' THEN 'Evening'
    WHEN LOWER(COALESCE("shift", '')) = 'morning' THEN 'Morning'
    ELSE NULL
  END;
