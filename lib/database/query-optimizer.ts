/**
 * Query Optimizer Utilities
 * Provides optimized Prisma queries with proper indexing and pagination
 */

import { Prisma } from '@prisma/client'
import { logger } from '@/lib/logger'

// Default pagination settings
export const DEFAULT_PAGE_SIZE = 50
export const MAX_PAGE_SIZE = 100

export interface PaginationParams {
  page?: number
  pageSize?: number
  cursor?: string
}

export interface PaginatedResult<T> {
  data: T[]
  meta: {
    total?: number
    page: number
    pageSize: number
    hasMore: boolean
    cursor?: string
  }
}

/**
 * Optimized query for fetching board tasks with all relations
 * Uses proper indexes and selective loading
 */
export const getBoardTasksOptimized = {
  // Only include necessary fields for initial render
  select: {
    id: true,
    title: true,
    description: true,
    itemCode: true,
    taskType: true,
    priority: true,
    storyPoints: true,
    position: true,
    columnId: true,
    sprintId: true,
    sprintColumnId: true,
    boardId: true,
    parentId: true,
    epicId: true,
    dueDate: true,
    createdAt: true,
    updatedAt: true,
    // Only include counts for relations to avoid loading all data
    _count: {
      select: {
        subtasks: true,
        comments: true,
        attachments: true,
        assignees: true,
        reviewers: true,
        labels: true,
      }
    },
    // Only load essential relations
    assignees: {
      select: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          }
        }
      },
      take: 5 // Limit assignees shown on cards
    },
    labels: {
      select: {
        label: {
          select: {
            id: true,
            name: true,
            color: true,
          }
        }
      },
      take: 3 // Limit labels shown on cards
    }
  }
} satisfies Prisma.TaskFindManyArgs['select']

/**
 * Optimized query for fetching single task with full details
 * Used when opening task modal
 */
export const getTaskDetailsOptimized = {
  include: {
    assignees: {
      include: {
        user: true
      }
    },
    reviewers: {
      include: {
        user: true
      }
    },
    labels: {
      include: {
        label: true
      }
    },
    comments: {
      include: {
        user: true
      },
      orderBy: {
        createdAt: 'desc' as const
      },
      take: 20 // Initial load of recent comments
    },
    attachments: {
      orderBy: {
        uploadedAt: 'desc' as const
      }
    },
    subtasks: {
      select: getBoardTasksOptimized.select,
      orderBy: {
        position: 'asc' as const
      }
    },
    parent: {
      select: {
        id: true,
        title: true,
        itemCode: true,
      }
    },
    sourceRelations: {
      include: {
        targetTask: {
          select: {
            id: true,
            title: true,
            itemCode: true,
          }
        }
      }
    },
    targetRelations: {
      include: {
        sourceTask: {
          select: {
            id: true,
            title: true,
            itemCode: true,
          }
        }
      }
    }
  }
} satisfies Prisma.TaskFindUniqueArgs['include']

/**
 * Optimized query for organization data
 * Reduces nested loading
 */
export const getOrganizationDataOptimized = {
  select: {
    id: true,
    name: true,
    slug: true,
    logo: true,
    createdAt: true,
    _count: {
      select: {
        projects: true,
        boards: true,
        members: true,
      }
    },
    // Load minimal member data
    members: {
      select: {
        id: true,
        role: true,
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
          }
        }
      },
      take: 10, // Limit initial member load
      orderBy: {
        createdAt: 'desc' as const
      }
    }
  }
} satisfies Prisma.OrganizationFindManyArgs['select']

/**
 * Create paginated query with cursor-based pagination
 * More efficient than offset pagination for large datasets
 */
export function createPaginatedQuery<T>(
  baseQuery: any,
  params: PaginationParams
): any {
  const pageSize = Math.min(params.pageSize || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
  
  const query = {
    ...baseQuery,
    take: pageSize + 1, // Take one extra to check if there's more
  }

  if (params.cursor) {
    query.cursor = { id: params.cursor }
    query.skip = 1 // Skip the cursor item
  }

  return query
}

/**
 * Process paginated results
 */
export function processPaginatedResults<T extends { id: string }>(
  results: T[],
  params: PaginationParams
): PaginatedResult<T> {
  const pageSize = Math.min(params.pageSize || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
  const hasMore = results.length > pageSize
  
  if (hasMore) {
    results.pop() // Remove the extra item
  }

  const lastItem = results[results.length - 1]
  
  return {
    data: results,
    meta: {
      page: params.page || 1,
      pageSize,
      hasMore,
      cursor: lastItem?.id
    }
  }
}

/**
 * Batch load users to avoid N+1 queries
 */
export async function batchLoadUsers(
  prisma: any,
  userIds: string[]
): Promise<Map<string, any>> {
  if (userIds.length === 0) return new Map()
  
  const uniqueIds = [...new Set(userIds)]
  
  const users = await prisma.user.findMany({
    where: {
      id: { in: uniqueIds }
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
    }
  })
  
  return new Map(users.map(user => [user.id, user]))
}

/**
 * Query performance monitor
 */
export async function measureQueryPerformance<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const startTime = performance.now()
  
  try {
    const result = await queryFn()
    const duration = performance.now() - startTime
    
    logger.db.query('PERFORMANCE', queryName, {
      duration: `${duration.toFixed(2)}ms`,
      slow: duration > 1000
    })
    
    // Log slow queries for optimization
    if (duration > 1000) {
      logger.warn(`Slow query detected: ${queryName} took ${duration.toFixed(2)}ms`)
    }
    
    return result
  } catch (error) {
    const duration = performance.now() - startTime
    logger.db.error('PERFORMANCE', queryName, {
      duration: `${duration.toFixed(2)}ms`,
      error
    })
    throw error
  }
}

/**
 * Optimize board query with selective loading
 */
export function createOptimizedBoardQuery(boardId: string, options?: {
  includeTasks?: boolean
  includeMembers?: boolean
  taskLimit?: number
}) {
  const query: any = {
    where: { id: boardId },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      boardType: true,
      logo: true,
      organizationId: true,
      createdAt: true,
      columns: {
        orderBy: { position: 'asc' }
      },
      sprints: {
        orderBy: { createdAt: 'desc' },
        include: {
          sprintColumns: {
            orderBy: { position: 'asc' }
          }
        }
      }
    }
  }

  if (options?.includeTasks) {
    query.select.tasks = {
      select: getBoardTasksOptimized.select,
      take: options.taskLimit || 100,
      orderBy: { position: 'asc' }
    }
  }

  if (options?.includeMembers) {
    query.select.members = {
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          }
        }
      },
      take: 20
    }
  }

  return query
}