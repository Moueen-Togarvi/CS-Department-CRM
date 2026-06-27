import { z } from "zod";

export const COURSE_TYPES = ["THEORY", "LAB", "PROJECT", "SEMINAR"] as const;
export const courseTypeSchema = z.enum(COURSE_TYPES);

export const createCourseSchema = z
  .object({
    code: z
      .string()
      .min(2, "Code must be at least 2 characters")
      .max(20, "Code must be at most 20 characters")
      .regex(/^[A-Za-z]{2,4}\d{3,4}$/, "Format: e.g., CS101, MTH201"),
    name: z.string().min(3, "Name must be at least 3 characters").max(200),
    departmentId: z.string().min(1, "Department is required"),
    creditHours: z.coerce.number().int().min(1, "Min 1 credit").max(6, "Max 6 credits"),
    labCreditHours: z.coerce.number().int().min(0, "Min 0").max(4, "Max 4 lab credits").default(0),
    courseType: courseTypeSchema.default("THEORY"),
    semesterOffered: z.coerce.number().int().min(1).max(12).optional().nullable(),
    description: z.string().optional().default(""),
    prerequisites: z.string().optional().default(""),
    objectives: z.string().optional().default(""),
    instructorId: z.string().optional().nullable(),
  })
  .strict();

export const updateCourseSchema = z
  .object({
    name: z.string().min(3).max(200).optional(),
    departmentId: z.string().min(1).optional(),
    creditHours: z.coerce.number().int().min(1).max(6).optional(),
    labCreditHours: z.coerce.number().int().min(0).max(4).optional(),
    courseType: courseTypeSchema.optional(),
    semesterOffered: z.coerce.number().int().min(1).max(12).optional().nullable(),
    description: z.string().optional(),
    prerequisites: z.string().optional(),
    objectives: z.string().optional(),
    instructorId: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const enrollStudentsSchema = z.object({
  studentIds: z.array(z.string().min(1)).min(1, "Select at least one student"),
  semesterId: z.string().min(1, "Semester is required"),
  section: z.string().min(1, "Section is required").default("A"),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type EnrollStudentsInput = z.infer<typeof enrollStudentsSchema>;