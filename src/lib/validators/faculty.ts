import { z } from "zod";

export const DESIGNATIONS = [
  "Professor",
  "Assoc Professor",
  "Asst Professor",
  "Lecturer",
  "Lab Engineer",
] as const;

export const designationSchema = z.enum(DESIGNATIONS);

export const createFacultySchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters"),
    facultyId: z
      .string()
      .min(1, "Faculty ID is required")
      .regex(/^[A-Za-z0-9-]+$/, "Only letters, numbers, and hyphens allowed"),
    designation: designationSchema,
    specialization: z.string().min(1, "Specialization is required"),
    highestDegree: z.string().min(1, "Highest degree is required"),
    departmentId: z.string().min(1, "Department is required"),
    officeRoom: z.string().optional().default(""),
    officeHours: z.string().optional().default(""),
    phone: z.string().optional().default(""),
    bio: z.string().optional().default(""),
    avatar: z.string().optional(),
  })
  .strict();

export const updateFacultySchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").optional(),
    email: z.string().email("Invalid email address").optional(),
    phone: z.string().optional(),
    bio: z.string().optional(),
    designation: designationSchema.optional(),
    specialization: z.string().min(1).optional(),
    highestDegree: z.string().min(1).optional(),
    departmentId: z.string().min(1).optional(),
    officeRoom: z.string().optional(),
    officeHours: z.string().optional(),
    isAvailable: z.boolean().optional(),
    avatar: z.string().optional(),
  })
  .strict();

export type CreateFacultyInput = z.infer<typeof createFacultySchema>;
export type UpdateFacultyInput = z.infer<typeof updateFacultySchema>;