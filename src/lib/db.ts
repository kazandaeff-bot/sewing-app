import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

// Always reuse the same PrismaClient instance to prevent SQLite connection exhaustion
globalForPrisma.prisma = db

// Graceful shutdown — close Prisma connection pool on process exit
// NOTE: We only listen for SIGINT/SIGTERM, NOT beforeExit.
// beforeExit fires when the event loop is empty, which can happen
// between requests and would kill the server prematurely.
if (typeof process !== 'undefined') {
  const shutdown = async () => {
    try { await db.$disconnect() } catch {}
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

/**
 * Reusable Prisma select object for Employee — ALWAYS exclude password.
 * Use this wherever you include employee data in API responses.
 */
export const EMPLOYEE_PUBLIC_SELECT = {
  id: true,
  name: true,
  code: true,
  role: true,
  username: true,
  customerId: true,
  createdAt: true,
  updatedAt: true,
} as const

/**
 * Reusable Prisma include object for Employee — ALWAYS exclude password.
 * Use this wherever you include employee data in nested queries.
 */
export const EMPLOYEE_PUBLIC_INCLUDE = {
  select: EMPLOYEE_PUBLIC_SELECT,
} as const
