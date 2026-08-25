import { z } from 'zod'

export const updateOwnProfileSchema = z
  .object({
    name: z.string().min(1).max(150).optional(),
    phone: z.string().max(40).nullish(),
    avatar: z.string().max(2000).nullish(),
    address: z.string().max(500).nullish(),
    mobileNumber: z.string().max(40).nullish(),
    oldPassword: z.string().max(200).optional(),
    newPassword: z.string().min(8, 'Password must be at least 8 characters').max(200).optional(),
    confirmPassword: z.string().max(200).optional(),
  })
  .refine(
    (d) => !d.newPassword || d.newPassword === d.confirmPassword,
    { message: 'Passwords do not match', path: ['confirmPassword'] }
  )
