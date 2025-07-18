import { PrismaClient } from '@prisma/client'

// Global variable to prevent multiple instances of Prisma in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create a new Prisma client instance or use the existing one
export const prisma = globalForPrisma.prisma ?? new PrismaClient()

// In development, store the Prisma client instance globally
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Helper function to disconnect from database
export const disconnectPrisma = async () => {
  await prisma.$disconnect()
}

// Helper function to connect to database
export const connectPrisma = async () => {
  await prisma.$connect()
}