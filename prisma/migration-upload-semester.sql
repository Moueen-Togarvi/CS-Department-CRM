-- Create Upload table for storing files in PostgreSQL (Vercel read-only FS workaround)
CREATE TABLE IF NOT EXISTS "Upload" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- Add semesterNumber column to Document for program semester (1-8)
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "semesterNumber" INTEGER;
