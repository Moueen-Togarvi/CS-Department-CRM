-- Add facultyId column to Document for linking documents to faculty members
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "facultyId" TEXT;

-- Add foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Document_facultyId_fkey'
        AND table_name = 'Document'
    ) THEN
        ALTER TABLE "Document" ADD CONSTRAINT "Document_facultyId_fkey"
            FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE SET NULL;
    END IF;
END $$;

-- Add index on facultyId
CREATE INDEX IF NOT EXISTS "Document_facultyId_idx" ON "Document"("facultyId");
