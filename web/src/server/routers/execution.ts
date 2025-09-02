import { z } from 'zod'
import { router, publicProcedure } from '../trpc'

export const executionRouter = router({
  // Get executions for a workflow
  getByWorkflow: publicProcedure
    .input(z.object({ workflowId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.workflowExecution.findMany({
        where: { workflowId: input.workflowId },
        include: {
          logs: {
            orderBy: { timestamp: 'asc' },
          },
        },
        orderBy: { startedAt: 'desc' },
      })
    }),

  // Get execution by ID with logs
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.workflowExecution.findUnique({
        where: { id: input.id },
        include: {
          workflow: true,
          logs: {
            orderBy: { timestamp: 'asc' },
          },
        },
      })
    }),

  // Create new execution
  create: publicProcedure
    .input(z.object({ workflowId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.workflowExecution.create({
        data: {
          workflowId: input.workflowId,
          status: 'PENDING',
        },
      })
    }),

  // Update execution status
  updateStatus: publicProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(['PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED']),
      error: z.string().optional(),
      results: z.record(z.any()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.workflowExecution.update({
        where: { id: input.id },
        data: {
          status: input.status,
          error: input.error,
          results: input.results,
          completedAt: ['SUCCESS', 'FAILED', 'CANCELLED'].includes(input.status) 
            ? new Date() 
            : undefined,
        },
      })
    }),

  // Add execution log
  addLog: publicProcedure
    .input(z.object({
      executionId: z.string(),
      nodeId: z.string(),
      level: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']),
      message: z.string(),
      data: z.record(z.any()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.executionLog.create({
        data: input,
      })
    }),
})
