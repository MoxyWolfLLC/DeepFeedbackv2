import { z } from 'zod'

// ============================================
// QUESTION SCHEMA
// ============================================

export const QuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  probes: z.array(z.string()).default([]),
  followUps: z.array(z.string()).default([]),
  order: z.number(),
})

export type Question = z.infer<typeof QuestionSchema>

// ============================================
// RUBRIC SCHEMAS
// ============================================

export const RubricStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED'])
export type RubricStatus = z.infer<typeof RubricStatusSchema>

export const RubricSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required'),
  researchGoals: z.string().min(10, 'Research goals must be at least 10 characters'),
  hypotheses: z.string().nullable(),
  audience: z.string().nullable(),
  questionCount: z.number().min(3).max(15).default(5),
  questions: z.array(QuestionSchema).default([]),
  openingScript: z.string().nullable(),
  closingScript: z.string().nullable(),
  status: RubricStatusSchema.default('DRAFT'),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().nullable(),
})

export type Rubric = z.infer<typeof RubricSchema>

// ============================================
// INPUT SCHEMAS
// ============================================

export const CreateRubricInputSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  researchGoals: z.string().min(10, 'Research goals must be at least 10 characters'),
  hypotheses: z.string().optional(),
  audience: z.string().optional(),
  questionCount: z.number().min(3).max(15).default(5),
})

export const UpdateRubricInputSchema = z.object({
  id: z.string(),
  title: z.string().min(1).optional(),
  researchGoals: z.string().min(10).optional(),
  hypotheses: z.string().optional(),
  audience: z.string().optional(),
  questionCount: z.number().min(3).max(15).optional(),
  status: RubricStatusSchema.optional(),
})

export type CreateRubricInput = z.infer<typeof CreateRubricInputSchema>
export type UpdateRubricInput = z.infer<typeof UpdateRubricInputSchema>
