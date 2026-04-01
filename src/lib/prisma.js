import { PrismaPg } from '@prisma/adapter-pg'

const { PrismaClient } = await import('@prisma/client')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })

const globalForPrisma = globalThis
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma