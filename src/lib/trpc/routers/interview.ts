import { z } from 'zod'
import { router, publicProcedure } from '../server'
import { StartInterviewInputSchema, SendMessageInputSchema } from '@/types/interview'
import { llm } from '@/lib/openrouter'
import { getInterviewSystemPrompt, getSingleInterviewSummaryPrompt, getRevisedSummaryPrompt } from '@/lib/prompts'

export const interviewRouter = router({
  createLink: publicProcedure
    .input(z.object({
      rubricId: z.string(),
      email: z.string().email().optional(),
      name: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
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

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const interview = await ctx.db.interview.findUnique({
        where: { id: input.id },
        include: {
          rubric: {
            select: {
              id: true,
              title: true,
              questions: true,
            },
          },
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

  initialize: publicProcedure
    .input(z.object({ interviewId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const interview = await ctx.db.interview.findUnique({
        where: { id: input.interviewId },
        include: {
          rubric: true,
          messages: true,
        },
      })

      if (!interview) {
        throw new Error('Interview not found')
      }

      if (interview.messages.length > 0) {
        return interview
      }

      const questions = (interview.rubric.questions as any[]) || []
      const firstQuestion = questions[0]?.text || 'Tell me about your experience.'

      let openingMessage = interview.rubric.openingScript ||
        `Hi! Thank you for participating in this research interview about "${interview.rubric.title}".\n\nI'll be asking you a few questions, and there are no right or wrong answers — I'm just interested in hearing your thoughts and experiences.\n\nLet's start with the first question:\n\n${firstQuestion}`

      openingMessage = processNamePlaceholder(openingMessage, interview.participantName)

      await ctx.db.message.create({
        data: {
          interviewId: interview.id,
          role: 'ASSISTANT',
          content: openingMessage,
        },
      })

      if (interview.status === 'NOT_STARTED') {
        await ctx.db.interview.update({
          where: { id: interview.id },
          data: {
            status: 'IN_PROGRESS',
            startedAt: new Date(),
            questionsAsked: 1,
          },
        })
      }

      return interview
    }),

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

  start: publicProcedure
    .input(StartInterviewInputSchema)
    .mutation(async ({ ctx, input }) => {
      const rubric = await ctx.db.rubric.findUnique({
        where: { id: input.rubricId },
      })

      if (!rubric) {
        throw new Error('Survey not found. It may have been deleted or the link is invalid.')
      }

      const interview = await ctx.db.interview.create({
        data: {
          rubricId: input.rubricId,
          participantName: input.participantName,
          participantEmail: input.participantEmail,
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          questionsAsked: 1,
        },
        include: {
          rubric: true,
        },
      })

      const questions = (interview.rubric.questions as any[]) || []
      const firstQuestion = questions[0]?.text || 'Tell me about your experience.'

      let openingMessage = interview.rubric.openingScript ||
        `Hi! Thank you for participating in this research interview about "${interview.rubric.title}".\n\nI'll be asking you a few questions, and there are no right or wrong answers — I'm just interested in hearing your thoughts and experiences.\n\nLet's start with the first question:\n\n${firstQuestion}`

      openingMessage = processNamePlaceholder(openingMessage, interview.participantName)

      await ctx.db.message.create({
        data: {
          interviewId: interview.id,
          role: 'ASSISTANT',
          content: openingMessage,
        },
      })

      return interview
    }),

  sendMessage: publicProcedure
    .input(SendMessageInputSchema)
    .mutation(async ({ ctx, input }) => {
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

      if (interview.phase !== 'QUESTIONS') {
        throw new Error('Interview is not in questions phase')
      }

      await ctx.db.message.create({
        data: {
          interviewId: interview.id,
          role: 'USER',
          content: input.content,
        },
      })

      const isLastQuestion = interview.questionsAsked >= interview.rubric.questionCount

      if (isLastQuestion) {
        const closingMessage = interview.rubric.closingScript || 
          "Thank you so much for sharing your thoughts with me! I really appreciate your openness and the time you've taken. Let me take a moment to summarize what I heard..."

        await ctx.db.message.create({
          data: {
            interviewId: interview.id,
            role: 'ASSISTANT',
            content: closingMessage,
          },
        })

        const updatedInterview = await ctx.db.interview.update({
          where: { id: interview.id },
          data: {
            turnCount: interview.turnCount + 1,
            phase: 'SUMMARIZING',
          },
          include: {
            rubric: true,
            messages: {
              orderBy: { createdAt: 'asc' },
            },
          },
        })

        const transcript = updatedInterview.messages
          .map((m) => `${m.role}: ${m.content}`)
          .join('\n\n')

        const summaryPrompt = getSingleInterviewSummaryPrompt(
          updatedInterview.rubric.researchGoals,
          transcript
        )

        const summary = await llm(
          [{ role: 'user', content: summaryPrompt }],
          { model: 'anthropic/claude-sonnet-4', temperature: 0.7 }
        )

        await ctx.db.interview.update({
          where: { id: interview.id },
          data: {
            summary,
            phase: 'REVIEWING',
          },
        })

        return {
          message: { content: closingMessage },
          isComplete: false,
          phase: 'REVIEWING',
        }
      }

      const systemPrompt = getInterviewSystemPrompt(
        JSON.stringify(interview.rubric.questions, null, 2),
        interview.currentQuestion,
        interview.rubric.openingScript,
        interview.rubric.closingScript,
        interview.rubric.questionCount,
        interview.questionsAsked,
        interview.turnCount,
        interview.maxTurns
      )

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...interview.messages.map((m) => ({
          role: m.role.toLowerCase() as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content: input.content },
      ]

      const response = await llm(messages, {
        model: 'anthropic/claude-sonnet-4',
        temperature: 0.7,
      })

      const arpPhase = detectARPPhase(response)
      const hasQuestionsComplete = response.includes('[QUESTIONS_COMPLETE]')

      const cleanResponse = response
        .replace(/\[(ACKNOWLEDGMENT|REFLECTION|PROBE|TRANSITION|QUESTIONS_COMPLETE|NEXT_QUESTION)\]/g, '')
        .trim()

      await ctx.db.message.create({
        data: {
          interviewId: interview.id,
          role: 'ASSISTANT',
          content: cleanResponse,
          arpPhase,
        },
      })

      const newTurnCount = interview.turnCount + 1
      const newQuestionsAsked = interview.questionsAsked + 1

      const shouldTransitionToSummary = 
        hasQuestionsComplete || 
        newQuestionsAsked >= interview.rubric.questionCount

      const updateData: any = {
        turnCount: newTurnCount,
        questionsAsked: newQuestionsAsked,
      }

      if (shouldTransitionToSummary) {
        updateData.phase = 'SUMMARIZING'

        const updatedInterview = await ctx.db.interview.update({
          where: { id: interview.id },
          data: updateData,
          include: {
            rubric: true,
            messages: {
              orderBy: { createdAt: 'asc' },
            },
          },
        })

        const transcript = updatedInterview.messages
          .map((m) => `${m.role}: ${m.content}`)
          .join('\n\n')

        const summaryPrompt = getSingleInterviewSummaryPrompt(
          updatedInterview.rubric.researchGoals,
          transcript
        )

        const summary = await llm(
          [{ role: 'user', content: summaryPrompt }],
          { model: 'anthropic/claude-sonnet-4', temperature: 0.7 }
        )

        await ctx.db.interview.update({
          where: { id: interview.id },
          data: {
            summary,
            phase: 'REVIEWING',
          },
        })

        return {
          message: { content: cleanResponse },
          isComplete: false,
          phase: 'REVIEWING',
        }
      }

      await ctx.db.interview.update({
        where: { id: interview.id },
        data: updateData,
      })

      return {
        message: { content: cleanResponse },
        isComplete: false,
        phase: 'QUESTIONS',
      }
    }),

  generateSummary: publicProcedure
    .input(z.object({ interviewId: z.string() }))
    .mutation(async ({ ctx, input }) => {
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

      if (interview.summary) {
        return { summary: interview.summary }
      }

      const transcript = interview.messages
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n\n')

      const prompt = getSingleInterviewSummaryPrompt(
        interview.rubric.researchGoals,
        transcript
      )

      const summary = await llm(
        [{ role: 'user', content: prompt }],
        { model: 'anthropic/claude-sonnet-4', temperature: 0.7 }
      )

      await ctx.db.interview.update({
        where: { id: interview.id },
        data: {
          summary,
          phase: 'REVIEWING',
        },
      })

      return { summary }
    }),

  submitSummaryFeedback: publicProcedure
    .input(z.object({
      interviewId: z.string(),
      feedback: z.string(),
      isCorrect: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const interview = await ctx.db.interview.findUnique({
        where: { id: input.interviewId },
      })

      if (!interview) {
        throw new Error('Interview not found')
      }

      if (input.isCorrect) {
        await ctx.db.interview.update({
          where: { id: interview.id },
          data: {
            phase: 'ATTRIBUTION',
          },
        })
        return { summary: interview.summary, revised: false, phase: 'ATTRIBUTION' }
      }

      const revisedPrompt = getRevisedSummaryPrompt(
        interview.summary || '',
        input.feedback
      )

      const revisedSummary = await llm(
        [{ role: 'user', content: revisedPrompt }],
        { model: 'anthropic/claude-sonnet-4', temperature: 0.7 }
      )

      await ctx.db.interview.update({
        where: { id: interview.id },
        data: {
          summary: revisedSummary,
          summaryFeedback: input.feedback,
          phase: 'ATTRIBUTION',
        },
      })

      return { summary: revisedSummary, revised: true, phase: 'ATTRIBUTION' }
    }),

  confirmSummary: publicProcedure
    .input(z.object({ interviewId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.interview.update({
        where: { id: input.interviewId },
        data: {
          phase: 'ATTRIBUTION',
        },
      })
      return { success: true }
    }),

  submitAttribution: publicProcedure
    .input(z.object({
      interviewId: z.string(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email().optional(),
      stayAnonymous: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const updateData: any = {
        phase: 'DONE',
        status: 'COMPLETED',
        completedAt: new Date(),
      }

      if (!input.stayAnonymous && input.firstName && input.lastName) {
        updateData.participantName = `${input.firstName} ${input.lastName}`
        if (input.email) {
          updateData.participantEmail = input.email
          updateData.wantsResults = true
        }
      }

      await ctx.db.interview.update({
        where: { id: input.interviewId },
        data: updateData,
      })

      return { success: true }
    }),

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

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.interview.delete({
        where: { id: input.id },
      })
    }),

  optInForResults: publicProcedure
    .input(z.object({
      interviewId: z.string(),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.interview.update({
        where: { id: input.interviewId },
        data: {
          participantName: `${input.firstName} ${input.lastName}`,
          participantEmail: input.email,
          wantsResults: true,
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

function processNamePlaceholder(script: string, participantName: string | null): string {
  if (participantName) {
    return script.replace(/\[Name\]/gi, participantName)
  } else {
    return script
      .replace(/^(Hi|Hello|Hey)\s*\[Name\][,!]?\s*/i, '')
      .replace(/\[Name\]/gi, '')
      .trim()
  }
}
