import { z } from 'zod'
import { router, publicProcedure } from '../server'
import { CreateRubricInputSchema, UpdateRubricInputSchema } from '@/types/rubric'
import { llm } from '@/lib/openrouter'
import { getPlanningPrompt, getScriptGenerationPrompt, PLANNING_SYSTEM_PROMPT } from '@/lib/prompts'

export const rubricRouter = router({
  /**
   * Get all rubrics
   */
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.rubric.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { interviews: true },
        },
      },
    })
  }),

  /**
   * Get a single rubric by ID
   */
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const rubric = await ctx.db.rubric.findUnique({
        where: { id: input.id },
        include: {
          interviews: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          _count: {
            select: {
              interviews: true,
              analysisJobs: true,
            },
          },
        },
      })

      if (!rubric) {
        throw new Error('Rubric not found')
      }

      return rubric
    }),

  /**
   * Create a new rubric and generate questions
   */
  create: publicProcedure
    .input(CreateRubricInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Create the rubric first
      const rubric = await ctx.db.rubric.create({
        data: {
          title: input.title,
          researchGoals: input.researchGoals,
          hypotheses: input.hypotheses,
          audience: input.audience,
          questionCount: input.questionCount,
          questions: [],
          status: 'DRAFT',
        },
      })

      // Generate questions via LLM
      try {
        const prompt = getPlanningPrompt(input.researchGoals, input.questionCount, input.hypotheses, input.audience)
        const response = await llm(
          [
            { role: 'system', content: PLANNING_SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          { model: 'anthropic/claude-sonnet-4', temperature: 0.7 }
        )

        // Parse JSON response - clean up markdown code fences if present
        const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim()
        const questions = JSON.parse(cleanResponse)

        // Generate scripts
        const scriptPrompt = getScriptGenerationPrompt(
          input.researchGoals,
          JSON.stringify(questions, null, 2)
        )
        const scriptResponse = await llm(
          [
            { role: 'system', content: PLANNING_SYSTEM_PROMPT },
            { role: 'user', content: scriptPrompt },
          ],
          { model: 'anthropic/claude-sonnet-4', temperature: 0.7 }
        )

        const cleanScriptResponse = scriptResponse.replace(/```json\n?|\n?```/g, '').trim()
        const scripts = JSON.parse(cleanScriptResponse)

        // Update rubric with generated content
        const updatedRubric = await ctx.db.rubric.update({
          where: { id: rubric.id },
          data: {
            questions,
            openingScript: scripts.openingScript,
            closingScript: scripts.closingScript,
            status: 'ACTIVE',
          },
        })

        return updatedRubric
      } catch (error) {
        console.error('Failed to generate questions:', error)
        // Return rubric without questions - can regenerate later
        return rubric
      }
    }),

  /**
   * Update a rubric
   */
  update: publicProcedure
    .input(UpdateRubricInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      return ctx.db.rubric.update({
        where: { id },
        data,
      })
    }),

  /**
   * Delete a rubric
   */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.rubric.delete({
        where: { id: input.id },
      })
    }),

  /**
   * Regenerate questions for a rubric
   */
  regenerateQuestions: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const rubric = await ctx.db.rubric.findUnique({
        where: { id: input.id },
      })

      if (!rubric) {
        throw new Error('Rubric not found')
      }

      try {
        // Generate questions
        const prompt = getPlanningPrompt(rubric.researchGoals, rubric.questionCount, rubric.hypotheses, rubric.audience)
        const response = await llm(
          [
            { role: 'system', content: PLANNING_SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          { model: 'anthropic/claude-sonnet-4', temperature: 0.8 }
        )

        // Clean up response - sometimes LLMs wrap in markdown
        const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim()
        const questions = JSON.parse(cleanResponse)

        // Also regenerate scripts
        const scriptPrompt = getScriptGenerationPrompt(
          rubric.researchGoals,
          JSON.stringify(questions, null, 2)
        )
        const scriptResponse = await llm(
          [
            { role: 'system', content: PLANNING_SYSTEM_PROMPT },
            { role: 'user', content: scriptPrompt },
          ],
          { model: 'anthropic/claude-sonnet-4', temperature: 0.7 }
        )

        const cleanScriptResponse = scriptResponse.replace(/```json\n?|\n?```/g, '').trim()
        const scripts = JSON.parse(cleanScriptResponse)

        return ctx.db.rubric.update({
          where: { id: input.id },
          data: {
            questions,
            openingScript: scripts.openingScript,
            closingScript: scripts.closingScript,
            status: 'ACTIVE',
          },
        })
      } catch (error) {
        console.error('Failed to regenerate questions:', error)
        throw new Error(`Failed to regenerate questions: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),
})
