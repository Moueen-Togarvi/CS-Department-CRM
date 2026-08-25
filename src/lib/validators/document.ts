import { z } from 'zod'

// Mirrors the DocumentCategory enum in prisma/schema.prisma.
export const DOCUMENT_CATEGORIES = [
  'SYLLABUS',
  'NOTES',
  'ASSIGNMENT',
  'PAPER',
  'REFERENCE',
  'OTHER',
] as const

const base = z.object({
  title: z.string().min(1, 'Title is required').max(300),
  description: z.string().max(5000).nullish(),
  category: z.enum(DOCUMENT_CATEGORIES).default('OTHER'),
  courseId: z.string().nullish(),
  semesterNumber: z.coerce.number().int().min(1).max(8).nullish(),
  facultyId: z.string().nullish(),
  fileUrl: z.string().min(1, 'File URL is required').max(2000),
  fileType: z.string().max(150).nullish(),
  fileSize: z.coerce.number().int().min(0).nullish(),
})

export const createDocumentSchema = base
export const updateDocumentSchema = base.partial()
