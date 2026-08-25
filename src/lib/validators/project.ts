import { z } from 'zod'
import { cuidSchema } from './request'

// Mirrors the ProjectStatus enum in prisma/schema.prisma.
export const PROJECT_STATUSES = [
  'PROPOSED',
  'APPROVED',
  'IN_PROGRESS',
  'SUBMITTED',
  'EVALUATED',
  'DEFENDED',
  'PASSED',
  'FAILED',
] as const

// Mirrors the EvaluationType enum in prisma/schema.prisma.
export const EVALUATION_TYPES = ['PROPOSAL', 'MID', 'FINAL', 'SUPERVISOR', 'EXTERNAL'] as const

export const createProjectSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300),
  description: z.string().min(1, 'Description is required').max(20000),
  semesterId: cuidSchema,
  supervisorId: cuidSchema,
  coSupervisorId: z.string().nullish(),
  domain: z.string().max(150).nullish(),
  methodology: z.string().max(5000).nullish(),
})

export const updateProjectSchema = createProjectSchema.partial().omit({ semesterId: true })

export const updateProjectStatusSchema = z.object({
  status: z.enum(PROJECT_STATUSES),
})

export const addProjectMemberSchema = z.object({
  studentId: cuidSchema,
  role: z.string().max(60).default('MEMBER'),
})

export const createMilestoneSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300),
  description: z.string().max(5000).nullish(),
  dueDate: z.coerce.date(),
})

/** ProjectMilestone.status is a free-text column defaulting to "PENDING". */
export const MILESTONE_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'] as const

export const updateMilestoneSchema = z.object({
  status: z.enum(MILESTONE_STATUSES).optional(),
  completedDate: z.coerce.date().nullish(),
  feedback: z.string().max(5000).nullish(),
})

export const createEvaluationSchema = z.object({
  evaluationType: z.enum(EVALUATION_TYPES),
  criteriaScores: z.record(z.string(), z.number()).nullish(),
  totalScore: z.coerce.number().min(0).max(100),
  comments: z.string().max(5000).nullish(),
  evaluatorId: cuidSchema,
})
