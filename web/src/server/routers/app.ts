import { router } from '../trpc'
import { workflowRouter } from './workflow'
import { executionRouter } from './execution'
import { nodeRouter } from './node'

export const appRouter = router({
  workflow: workflowRouter,
  execution: executionRouter,
  node: nodeRouter,
})

export type AppRouter = typeof appRouter
