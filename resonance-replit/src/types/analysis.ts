import { z } from 'zod'

// ============================================
// THEME SCHEMA
// ============================================

export const ThemeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  prevalence: z.number().min(0).max(100),
  supportingQuotes: z.array(
    z.object({
      interviewId: z.string(),
      quote: z.string(),
      context: z.string().optional(),
    })
  ),
  sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']).optional(),
})

export type Theme = z.infer<typeof ThemeSchema>

// ============================================
// INSIGHT SCHEMA
// ============================================

export const InsightSchema = z.object({
  id: z.string(),
  text: z.string(),
  confidence: z.number().min(0).max(100).default(75),
  supportingInterviewCount: z.number(),
  relatedThemes: z.array(z.string()),
  goalAlignment: z.string().optional(),
})

export type Insight = z.infer<typeof InsightSchema>

// ============================================
// RECOMMENDATION SCHEMA
// ============================================

export const RecommendationSchema = z.object({
  id: z.string(),
  text: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  impact: z.string().optional(),
  effort: z.enum(['low', 'medium', 'high']).optional(),
  relatedInsights: z.array(z.string()),
})

export type Recommendation = z.infer<typeof RecommendationSchema>

// ============================================
// ANALYSIS STATUS
// ============================================

export const AnalysisStatusSchema = z.enum([
  'PENDING',
  'COLLECTING_RESPONSES',
  'PEER_REVIEW',
  'SYNTHESIZING',
  'HITL_REVIEW',
  'COMPLETED',
  'FAILED',
])

export type AnalysisStatus = z.infer<typeof AnalysisStatusSchema>

// ============================================
// ANALYSIS JOB SCHEMA
// ============================================

export const AnalysisJobSchema = z.object({
  id: z.string(),
  rubricId: z.string(),
  status: AnalysisStatusSchema,
  progress: z.number().min(0).max(100),
  interviewIds: z.array(z.string()),
  interviewCount: z.number(),
  councilSessionId: z.string().nullable(),
  useCouncil: z.boolean(),
  themes: z.array(ThemeSchema).nullable(),
  insights: z.array(InsightSchema).nullable(),
  recommendations: z.array(RecommendationSchema).nullable(),
  confidence: z.number().nullable(),
  processingTime: z.number().nullable(),
  tokenUsage: z.number().nullable(),
  createdAt: z.date(),
  completedAt: z.date().nullable(),
})

export type AnalysisJob = z.infer<typeof AnalysisJobSchema>

// ============================================
// INPUT SCHEMAS
// ============================================

export const RunAnalysisInputSchema = z.object({
  rubricId: z.string(),
  interviewIds: z.array(z.string()).min(3, 'At least 3 interviews required'),
  useCouncil: z.boolean().default(true),
})

export type RunAnalysisInput = z.infer<typeof RunAnalysisInputSchema>

// ============================================
// STREAM TYPES
// ============================================

export interface AnalysisStreamData {
  status: AnalysisStatus
  progress: number
  stage: string
  currentModel?: string
}
