import { z } from 'zod'

export const createStudentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  studentId: z.string().min(1, 'Student ID is required').max(50),
  departmentId: z.string().min(1, 'Department is required'),
  currentSemester: z.coerce.number().int().min(1).max(12),
  enrollmentYear: z.coerce.number().int().min(2000).max(2100),
  batch: z.string().optional(),
  program: z.string().default('BS'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  dateOfBirth: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  emergencyContact: z.string().optional(),
})

export type CreateStudentInput = z.infer<typeof createStudentSchema>

export const updateStudentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  currentSemester: z.coerce.number().int().min(1).max(12).optional(),
  enrollmentYear: z.coerce.number().int().min(2000).max(2100).optional(),
  batch: z.string().optional(),
  program: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  dateOfBirth: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  emergencyContact: z.string().optional(),
})

export type UpdateStudentInput = z.infer<typeof updateStudentSchema>

export const studentFiltersSchema = z.object({
  search: z.string().optional(),
  batch: z.string().optional(),
  semester: z.string().optional(),
  status: z.string().optional(),
})

export type StudentFilters = z.infer<typeof studentFiltersSchema>