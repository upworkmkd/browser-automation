import { z } from 'zod'
import { router, publicProcedure } from '../trpc'

const NodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: z.record(z.any()),
})

const EdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
})

const WorkflowSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
})

export const workflowRouter = router({
  // Get all workflows
  getAll: publicProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.workflow.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            executions: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })
  }),

  // Get workflow by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.workflow.findUnique({
        where: { id: input.id },
        include: {
          executions: {
            take: 10,
            orderBy: { startedAt: 'desc' },
          },
        },
      })
    }),

  // Create new workflow
  create: publicProcedure
    .input(WorkflowSchema)
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.workflow.create({
        data: {
          name: input.name,
          description: input.description,
          nodes: input.nodes,
          edges: input.edges,
        },
      })
    }),

  // Update workflow
  update: publicProcedure
    .input(z.object({
      id: z.string(),
      data: WorkflowSchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.workflow.update({
        where: { id: input.id },
        data: input.data,
      })
    }),

  // Delete workflow
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.workflow.delete({
        where: { id: input.id },
      })
    }),

  // Toggle workflow active status
  toggleActive: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const workflow = await ctx.prisma.workflow.findUnique({
        where: { id: input.id },
      })
      
      if (!workflow) {
        throw new Error('Workflow not found')
      }

      return await ctx.prisma.workflow.update({
        where: { id: input.id },
        data: { isActive: !workflow.isActive },
      })
    }),
})
