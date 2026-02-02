import { router } from '../server'
import { rubricRouter } from './rubric'
import { interviewRouter } from './interview'
import { analysisRouter } from './analysis'

export const appRouter = router({
  rubric: rubricRouter,
  interview: interviewRouter,
  analysis: analysisRouter,
})

export type AppRouter = typeof appRouter
