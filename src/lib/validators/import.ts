import { z } from 'zod'

/**
 * Bulk import payload. The size cap matters: the whole file is parsed into
 * memory and every row becomes a write.
 */
export const csvImportSchema = z.object({
  csvText: z
    .string()
    .min(1, 'CSV text is required')
    .max(2_000_000, 'CSV is too large (max ~2 MB)'),
})
