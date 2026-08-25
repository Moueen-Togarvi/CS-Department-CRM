import { z } from 'zod'

/**
 * Payload posted by the Google Apps Script bridge. Every field is a string in
 * transit, so numbers are coerced. The secret is checked separately, before
 * this runs, so probing without it reveals nothing about the shape.
 */
export const googleFormStudentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(150),
  email: z.string().min(1, 'Email is required').max(320),
  studentId: z.string().max(60).nullish(),
  program: z.string().max(40).nullish(),
  currentSemester: z.coerce.number().int().min(1).max(8).nullish(),
  enrollmentYear: z.coerce.number().int().min(1990).max(2100).nullish(),
  session: z.string().max(60).nullish(),
  batch: z.string().max(60).nullish(),
  mobileNumber: z.string().max(40).nullish(),
  address: z.string().max(500).nullish(),
  cnic: z.string().max(40).nullish(),
  fatherName: z.string().max(150).nullish(),
  fatherPhone: z.string().max(40).nullish(),
  departmentCode: z.string().max(40).nullish(),
})
