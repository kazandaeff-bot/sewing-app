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
if (typeof process !== 'undefined') {
  const shutdown = async () => {
    try { await db.$disconnect() } catch {}
    process.exit(0)
  }
  process.on('beforeExit', shutdown)
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}