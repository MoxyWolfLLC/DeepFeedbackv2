import { z } from 'zod'
import { router, publicProcedure } from '../server'
import { StartInterviewInputSchema, SendMessageInputSchema } from '@/types/interview'
import { llm } from '@/lib/openrouter'
import { getInterviewSystemPrompt } from '@/lib/prompts'

export const interviewRouter = router({
  /**
   * Create a shareable interview link for a rubric
   */
  createLink: publicProcedure
    .input(z.object({
      rubricId: z.string(),
      email: z.string().email().optional(),
      name: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // First check if the rubric exists
      const rubric = await ctx.db.rubric.findUnique({
        where: { id: input.rubricId },
      })

      if (!rubric) {
        throw new Error('Survey not found')
      }

      const interview = await ctx.db.interview.create({
        data: {
          rubricId: input.rubricId,
          participantEmail: input.email,
          participantName: input.name,
          status: 'NOT_STARTED',
        },
      })
      return {
        token: interview.accessToken,
        id: interview.id,
      }
    }),

  /**
   * Get interview by access token (public link)
   */
  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const interview = await ctx.db.interview.findUnique({
        where: { accessToken: input.token },
        include: {
          rubric: true,
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      })

      if (!interview) {
        throw new Error('Interview not found')
      }

      return interview
    }),

  /**
   * Get interview by ID (internal)
   */
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.interview.findUnique({
        where: { id: input.id },
        include: {
          rubric: true,
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      })
    }),

  /**
   * List interviews for a rubric
   */
  listByRubric: publicProcedure
    .input(z.object({ rubricId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.interview.findMany({
        where: { rubricId: input.rubricId },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { messages: true },
          },
        },
      })
    }),

  /**
   * Start a new interview
   */
  start: publicProcedure
    .input(StartInterviewInputSchema)
    .mutation(async ({ ctx, input }) => {
      // First check if the rubric exists
      const rubric = await ctx.db.rubric.findUnique({
        where: { id: input.rubricId },
      })

      if (!rubric) {
        throw new Error('Survey not found. It may have been deleted or the link is invalid.')
      }

      // Create the interview
      const interview = await ctx.db.interview.create({
        data: {
          rubricId: input.rubricId,
          participantName: input.participantName,
          participantEmail: input.participantEmail,
          status: 'IN_PROGRESS',
          startedAt: new Date(),
        },
        include: {
          rubric: true,
        },
      })

      // Get first question from rubric for fallback greeting
      const questions = (interview.rubric.questions as any[]) || []
      const firstQuestion = questions[0]?.text || 'Tell me about your experience.'

      // Create opening message - use openingScript if available, otherwise generate a default
      const openingMessage = interview.rubric.openingScript ||
        `Hi! Thank you for participating in this research interview about "${interview.rubric.title}".\n\nI'll be asking you a few questions, and there are no right or wrong answers — I'm just interested in hearing your thoughts and experiences.\n\nLet's start with the first question:\n\n${firstQuestion}`

      await ctx.db.message.create({
        data: {
          interviewId: interview.id,
          role: 'ASSISTANT',
          content: openingMessage,
        },
      })

      return interview
    }),

  /**
   * Send a message in an interview
   */
  sendMessage: publicProcedure
    .input(SendMessageInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Get interview with context
      const interview = await ctx.db.interview.findUnique({
        where: { id: input.interviewId },
        include: {
          rubric: true,
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      })

      if (!interview) {
        throw new Error('Interview not found')
      }

      if (interview.status === 'COMPLETED') {
        throw new Error('Interview is already completed')
      }

      // Save user message
      await ctx.db.message.create({
        data: {
          interviewId: interview.id,
          role: 'USER',
          content: input.content,
        },
      })

      // Build conversation for LLM
      const systemPrompt = getInterviewSystemPrompt(
        JSON.stringify(interview.rubric.questions, null, 2),
        interview.currentQuestion,
        interview.rubric.openingScript,
        interview.rubric.closingScript
      )

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...interview.messages.map((m) => ({
          role: m.role.toLowerCase() as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content: input.content },
      ]

      // Generate response
      const response = await llm(messages, {
        model: 'anthropic/claude-sonnet-4',
        temperature: 0.7,
      })

      // Detect ARP phase and completion
      const arpPhase = detectARPPhase(response)
      const isComplete = response.includes('[INTERVIEW_COMPLETE]')

      // Clean response (remove markers)
      const cleanResponse = response
        .replace(/\[(ACKNOWLEDGMENT|REFLECTION|PROBE|TRANSITION|INTERVIEW_COMPLETE)\]/g, '')
        .trim()

      // Save assistant message
      const assistantMessage = await ctx.db.message.create({
        data: {
          interviewId: interview.id,
          role: 'ASSISTANT',
          content: cleanResponse,
          arpPhase,
        },
      })

      // Update interview state
      const newTurnCount = interview.turnCount + 1
      const updateData: any = {
        turnCount: newTurnCount,
      }

      if (isComplete || newTurnCount >= interview.maxTurns) {
        updateData.status = 'COMPLETED'
        updateData.completedAt = new Date()
      }

      await ctx.db.interview.update({
        where: { id: interview.id },
        data: updateData,
      })

      return {
        message: assistantMessage,
        isComplete: isComplete || newTurnCount >= interview.maxTurns,
      }
    }),

  /**
   * Pause an interview
   */
  pause: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.interview.update({
        where: { id: input.id },
        data: {
          status: 'PAUSED',
          pausedAt: new Date(),
        },
      })
    }),

  /**
   * Resume a paused interview
   */
  resume: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.interview.update({
        where: { id: input.id },
        data: {
          status: 'IN_PROGRESS',
          pausedAt: null,
        },
      })
    }),
})

function detectARPPhase(
  response: string
): 'ACKNOWLEDGMENT' | 'REFLECTION' | 'PROBE' | 'TRANSITION' | null {
  if (response.includes('[ACKNOWLEDGMENT]')) return 'ACKNOWLEDGMENT'
  if (response.includes('[REFLECTION]')) return 'REFLECTION'
  if (response.includes('[PROBE]')) return 'PROBE'
  if (response.includes('[TRANSITION]')) return 'TRANSITION'
  return null
}
