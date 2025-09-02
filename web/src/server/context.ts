import { type NextRequest } from 'next/server'
import { prisma } from './db'

export interface CreateContextOptions {
  headers: Headers
}

export const createTRPCContext = (opts: { req: Request }) => {
  const req = opts.req

  return {
    prisma,
    headers: req.headers,
  }
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>
