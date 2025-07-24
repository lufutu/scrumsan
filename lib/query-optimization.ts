/**
 * Database query optimization utilities for team management
 */

import { Prisma } from '@prisma/client'

// Optimized includes for team member queries
export const optimizedMemberIncludes = {
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
      avatarUrl: true,
    }
  },
  permissionSet: {
    select: {
      id: true,
      name: true,
      permissions: true,
    }
  },
  engagements: {
    select: {
      id: true,
      projectId: true,
      role: true,
      hoursPerWeek: true,
      startDate: true,
      endDate: true,
      isActive: true,
      project: {
        select: {
          id: true,
          name: true,
        }
      }
    },
    where: {
      isActive: true, // Only fetch active engagements by default
    },
    orderBy: {
      startDate: 'desc' as const,
    }
  },
  timeOffEntries: {
    select: {
      id: true,
      type: true,
      startDate: true,
      endDate: true,
      description: true,
      status: true,
    },
    where: {
      status: 'approved', // Only fetch approved time-off by default
      endDate: {
        gte: new Date(), // Only future/current time-off
      }
    },
    orderBy: {
      startDate: 'asc' as const,
    }
  },
  profileData: {
    select: {
      id: true,
      secondaryEmail: true,
      address: true,
      phone: true,
      linkedin: true,
      skype: true,
      twitter: true,
      birthday: true,
      maritalStatus: true,
      family: true,
      other: true,
      visibility: true,
    }
  }
} satisfies Prisma.OrganizationMemberInclude

// Lightweight member includes for list views
export const lightweightMemberIncludes = {
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
      avatarUrl: true,
    }
  },
  permissionSet: {
    select: {
      id: true,
      name: true,
    }
  },
  engagements: {
    select: {
      id: true,
      projectId: true,
      hoursPerWeek: true,
      isActive: true,
      project: {
        select: {
          id: true,
          name: true,
        }
      }
    },
    where: {
      isActive: true,
    }
  },
  timeOffEntries: {
    select: {
      id: true,
      type: true,
      startDate: true,
      endDate: true,
      status: true,
    },
    where: {
      status: 'approved',
      startDate: {
        lte: new Date(),
      },
      endDate: {
        gte: new Date(),
      }
    }
  }
} satisfies Prisma.OrganizationMemberInclude

// Build optimized where clause for member filtering
export function buildMemberWhereClause(filters: {
  roles?: string[]
  projects?: string[]
  totalHours?: { min: number; max: number }
  availabilityHours?: { min: number; max: number }
  permissions?: string[]
  search?: string
}, organizationId: string): Prisma.OrganizationMemberWhereInput {
  const where: Prisma.OrganizationMemberWhereInput = {
    organizationId,
  }

  // Role filtering
  if (filters.roles?.length) {
    where.OR = [
      {
        role: {
          in: filters.roles.filter(role => ['owner', 'admin', 'member'].includes(role)) as ('owner' | 'admin' | 'member')[],
        }
      },
      {
        permissionSet: {
          name: {
            in: filters.roles,
            mode: 'insensitive',
          }
        }
      }
    ]
  }

  // Project filtering
  if (filters.projects?.length) {
    where.engagements = {
      some: {
        projectId: {
          in: filters.projects,
        },
        isActive: true,
      }
    }
  }

  // Hours filtering (requires computed fields, handled in application layer)
  if (filters.totalHours) {
    where.workingHoursPerWeek = {
      gte: filters.totalHours.min,
      lte: filters.totalHours.max,
    }
  }

  // Search filtering
  if (filters.search) {
    const searchTerm = filters.search.toLowerCase()
    where.OR = [
      ...(where.OR || []),
      {
        user: {
          OR: [
            {
              fullName: {
                contains: searchTerm,
                mode: 'insensitive',
              }
            },
            {
              email: {
                contains: searchTerm,
                mode: 'insensitive',
              }
            }
          ]
        }
      },
      {
        jobTitle: {
          contains: searchTerm,
          mode: 'insensitive',
        }
      }
    ]
  }

  return where
}

// Optimized pagination parameters
export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export function buildPaginationClause(params: PaginationParams) {
  const page = Math.max(1, params.page || 1)
  const limit = Math.min(100, Math.max(1, params.limit || 25)) // Max 100 items per page
  const skip = (page - 1) * limit

  let orderBy: Prisma.OrganizationMemberOrderByWithRelationInput = {
    createdAt: 'desc',
  }

  if (params.sortBy) {
    switch (params.sortBy) {
      case 'name':
        orderBy = {
          user: {
            fullName: params.sortOrder || 'asc',
          }
        }
        break
      case 'role':
        orderBy = {
          role: params.sortOrder || 'asc',
        }
        break
      case 'joinDate':
        orderBy = {
          joinDate: params.sortOrder || 'desc',
        }
        break
      case 'totalHours':
        orderBy = {
          workingHoursPerWeek: params.sortOrder || 'desc',
        }
        break
      default:
        orderBy = {
          createdAt: 'desc',
        }
    }
  }

  return {
    skip,
    take: limit,
    orderBy,
  }
}

// Cache key generators for consistent caching
export const cacheKeys = {
  teamMembers: (organizationId: string, filters?: any) => 
    ['teamMembers', organizationId, filters ? JSON.stringify(filters) : 'all'],
  teamMember: (organizationId: string, memberId: string) => 
    ['teamMember', organizationId, memberId],
  permissionSets: (organizationId: string) => 
    ['permissionSets', organizationId],
  customRoles: (organizationId: string) => 
    ['customRoles', organizationId],
  memberProfile: (organizationId: string, memberId: string) => 
    ['memberProfile', organizationId, memberId],
  memberEngagements: (organizationId: string, memberId: string) => 
    ['memberEngagements', organizationId, memberId],
  memberTimeOff: (organizationId: string, memberId: string) => 
    ['memberTimeOff', organizationId, memberId],
  memberTimeline: (organizationId: string, memberId: string) => 
    ['memberTimeline', organizationId, memberId],
}

// Query invalidation helpers
export const invalidationPatterns = {
  allTeamData: (organizationId: string) => [
    ['teamMembers', organizationId],
    ['teamMember', organizationId],
    ['memberProfile', organizationId],
    ['memberEngagements', organizationId],
    ['memberTimeOff', organizationId],
    ['memberTimeline', organizationId],
  ],
  memberSpecific: (organizationId: string, memberId: string) => [
    ['teamMember', organizationId, memberId],
    ['memberProfile', organizationId, memberId],
    ['memberEngagements', organizationId, memberId],
    ['memberTimeOff', organizationId, memberId],
    ['memberTimeline', organizationId, memberId],
  ],
  teamMembersOnly: (organizationId: string) => [
    ['teamMembers', organizationId],
  ],
}