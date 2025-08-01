import { PrismaClient } from '@prisma/client'

// Global variable to prevent multiple instances of Prisma in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Optimized Prisma client configuration
const createPrismaClient = () => {
  return new PrismaClient({
    // Disable all Prisma logging to reduce noise
    log: [],
    
    // Connection pool and timeout settings
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })
}

// Create a new Prisma client instance or use the existing one
export const prisma = globalForPrisma.prisma ?? createPrismaClient()

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

// Query optimization utilities
export const optimizedQueries = {
  // Batch multiple queries for better performance
  batch: async <T>(queries: Promise<T>[]): Promise<T[]> => {
    return Promise.all(queries)
  },

  // Transaction wrapper for multiple operations
  transaction: async <T>(callback: (tx: any) => Promise<T>): Promise<T> => {
    return prisma.$transaction(callback, {
      maxWait: 5000, // 5 seconds max wait
      timeout: 10000, // 10 seconds timeout
      isolationLevel: 'ReadCommitted'
    })
  },

  // Optimized board with tasks query to reduce N+1
  getBoardWithTasks: async (boardId: string, userId: string) => {
    return prisma.board.findUnique({
      where: { id: boardId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            members: {
              where: { userId }, // Only get current user's membership
              select: {
                userId: true,
                role: true,
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    avatarUrl: true,
                    email: true
                  }
                }
              }
            }
          }
        },
        columns: {
          orderBy: { position: 'asc' },
          include: {
            tasks: {
              orderBy: { createdAt: 'asc' },
              include: {
                taskAssignees: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        fullName: true,
                        avatarUrl: true
                      }
                    }
                  }
                },
                taskLabels: {
                  include: {
                    label: true
                  }
                },
                _count: {
                  select: {
                    comments: true,
                    attachments: true
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            tasks: true,
            sprints: true
          }
        }
      }
    })
  }
}

// Connection pool health check
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database health check failed:', error)
    return false
  }
}