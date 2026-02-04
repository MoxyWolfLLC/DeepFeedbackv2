import { z } from 'zod'
import { router, publicProcedure } from '../server'
import { RunAnalysisInputSchema } from '@/types/analysis'
import { llm } from '@/lib/openrouter'
import { getAnalysisPrompt } from '@/lib/prompts'

export const analysisRouter = router({
  /**
   * Get analysis job by ID
   */
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.analysisJob.findUnique({
        where: { id: input.id },
        include: {
          rubric: true,
        },
      })
    }),

  /**
   * List analysis jobs for a rubric
   */
  listByRubric: publicProcedure
    .input(z.object({ rubricId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.analysisJob.findMany({
        where: { rubricId: input.rubricId },
        orderBy: { createdAt: 'desc' },
      })
    }),

  /**
   * Get the latest completed analysis for a rubric
   */
  getLatest: publicProcedure
    .input(z.object({ rubricId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.analysisJob.findFirst({
        where: {
          rubricId: input.rubricId,
          status: 'COMPLETED',
        },
        orderBy: { completedAt: 'desc' },
      })
    }),

  /**
   * Run analysis on interviews
   */
  run: publicProcedure
    .input(RunAnalysisInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Get the rubric
      const rubric = await ctx.db.rubric.findUnique({
        where: { id: input.rubricId },
      })

      if (!rubric) {
        throw new Error('Rubric not found')
      }

      // Get the interviews with messages
      const interviews = await ctx.db.interview.findMany({
        where: {
          id: { in: input.interviewIds },
          status: 'COMPLETED',
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      })

      if (interviews.length < 5) {
        throw new Error('At least 5 completed interviews required for analysis')
      }

      // Create analysis job
      const job = await ctx.db.analysisJob.create({
        data: {
          rubricId: input.rubricId,
          interviewIds: input.interviewIds,
          interviewCount: interviews.length,
          useCouncil: input.useCouncil,
          status: 'PENDING',
        },
      })

      // Compile transcripts
      const transcripts = interviews.map((interview) => {
        return interview.messages
          .map((m) => `${m.role}: ${m.content}`)
          .join('\n\n')
      })

      // Update status
      await ctx.db.analysisJob.update({
        where: { id: job.id },
        data: { status: 'COLLECTING_RESPONSES', progress: 20 },
      })

      try {
        const startTime = Date.now()

        // For now, use single model analysis
        // TODO: Integrate Council MCP for multi-model deliberation
        const prompt = getAnalysisPrompt(
          rubric.researchGoals,
          transcripts,
          interviews.length
        )

        const response = await llm(
          [
            {
              role: 'system',
              content:
                'You are an expert qualitative researcher analyzing interview data. Be specific, use direct quotes, and provide actionable insights. Return ONLY valid JSON with no markdown formatting or code blocks.',
            },
            { role: 'user', content: prompt },
          ],
          { model: 'anthropic/claude-sonnet-4', maxTokens: 8000 }
        )

        // Extract JSON from response (handles markdown code blocks)
        let jsonStr = response.trim()
        
        // Remove markdown code blocks if present
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (jsonMatch) {
          jsonStr = jsonMatch[1].trim()
        }
        
        // Parse response
        const results = JSON.parse(jsonStr)

        const processingTime = Date.now() - startTime

        // Update job with results
        const completedJob = await ctx.db.analysisJob.update({
          where: { id: job.id },
          data: {
            status: 'COMPLETED',
            progress: 100,
            themes: results.themes,
            insights: results.insights,
            recommendations: results.recommendations,
            confidence: results.overallConfidence,
            processingTime,
            completedAt: new Date(),
          },
        })

        return completedJob
      } catch (error) {
        console.error('Analysis failed:', error)

        await ctx.db.analysisJob.update({
          where: { id: job.id },
          data: { status: 'FAILED' },
        })

        throw new Error('Analysis failed. Please try again.')
      }
    }),
})
