import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { ZodError } from 'zod'
import { prisma } from '@/lib/prisma'

/**
 * Context passed to all tRPC procedures
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  return {
    db: prisma,
    ...opts,
  }
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>

/**
 * Initialize tRPC
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

/**
 * Export reusable router and procedure helpers
 */
export const router = t.router
export const publicProcedure = t.procedure

/**
 * Protected procedure (add auth check here later)
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  // TODO: Add authentication check
  // For now, all requests are allowed
  return next({ ctx })
})

/**
 * Middleware for logging
 */
export const loggedProcedure = t.procedure.use(async ({ path, type, next }) => {
  const start = Date.now()
  const result = await next()
  const duration = Date.now() - start
  console.log(`[tRPC] ${type} ${path} - ${duration}ms`)
  return result
})
