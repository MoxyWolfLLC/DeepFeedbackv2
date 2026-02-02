import { z } from 'zod'

// ============================================
// ENUMS
// ============================================

export const MessageRoleSchema = z.enum(['SYSTEM', 'USER', 'ASSISTANT'])
export type MessageRole = z.infer<typeof MessageRoleSchema>

export const ARPPhaseSchema = z.enum(['ACKNOWLEDGMENT', 'REFLECTION', 'PROBE', 'TRANSITION'])
export type ARPPhase = z.infer<typeof ARPPhaseSchema>

export const InterviewStatusSchema = z.enum([
  'NOT_STARTED',
  'IN_PROGRESS',
  'PAUSED',
  'COMPLETED',
  'ABANDONED',
])
export type InterviewStatus = z.infer<typeof InterviewStatusSchema>

// ============================================
// MESSAGE SCHEMA
// ============================================

export const MessageSchema = z.object({
  id: z.string(),
  interviewId: z.string(),
  role: MessageRoleSchema,
  content: z.string(),
  arpPhase: ARPPhaseSchema.nullable(),
  questionRef: z.number().nullable(),
  tokenCount: z.number().nullable(),
  createdAt: z.date(),
})

export type Message = z.infer<typeof MessageSchema>

// ============================================
// INTERVIEW SCHEMA
// ============================================

export const InterviewSchema = z.object({
  id: z.string(),
  rubricId: z.string(),
  participantName: z.string().nullable(),
  participantEmail: z.string().email().nullable().or(z.literal('')).nullable(),
  status: InterviewStatusSchema,
  currentQuestion: z.number(),
  turnCount: z.number(),
  maxTurns: z.number(),
  startedAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  pausedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  accessToken: z.string(),
})

export type Interview = z.infer<typeof InterviewSchema>

// ============================================
// INPUT SCHEMAS
// ============================================

export const StartInterviewInputSchema = z.object({
  rubricId: z.string(),
  participantName: z.string().optional(),
  participantEmail: z.string().email().optional(),
})

export const SendMessageInputSchema = z.object({
  interviewId: z.string(),
  content: z.string().min(1, 'Message cannot be empty'),
})

export type StartInterviewInput = z.infer<typeof StartInterviewInputSchema>
export type SendMessageInput = z.infer<typeof SendMessageInputSchema>

// ============================================
// STREAM TYPES
// ============================================

export interface InterviewStreamData {
  status: InterviewStatus
  currentQuestion: number
  turnCount: number
  latestMessage?: {
    role: 'assistant'
    content: string
    isStreaming: boolean
  }
}
