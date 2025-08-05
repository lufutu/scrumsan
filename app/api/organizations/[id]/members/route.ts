import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { commonFields, validateUUID, parseQueryParams } from '@/lib/validation-schemas'
import { 
  withSecureAuth, 
  createErrorResponse, 
  validateAndSanitizeRequestBody 
} from '@/lib/api-auth-utils'
import { 
  buildMemberWhereClause, 
  buildPaginationClause, 
  optimizedMemberIncludes, 
  lightweightMemberIncludes 
} from '@/lib/query-optimization'
import { sendInvitationEmail } from '@/lib/email-utils'
import { generateSecureToken } from '@/lib/crypto-utils'
import { resolveOrganization } from '@/lib/slug-resolver'

// Validation schemas
const memberCreateSchema = z.object({
  email: commonFields.email,
  role: z.enum(['admin', 'member']).default('member'),
  permissionSetId: commonFields.uuid.optional(),
  jobTitle: z.string().max(255).optional(),
  workingHoursPerWeek: z.number().int().min(1).max(168).default(40),
  joinDate: z.string().datetime().optional(),
})

const memberFilterSchema = z.object({
  roles: z.array(z.string()).optional(),
  projects: z.array(z.string()).optional(),
  minHours: z.coerce.number().int().min(0).max(168).optional(),
  maxHours: z.coerce.number().int().min(0).max(168).optional(),
  minAvailability: z.coerce.number().int().min(0).max(168).optional(),
  maxAvailability: z.coerce.number().int().min(0).max(168).optional(),
  permissions: z.array(z.string()).optional(),
  search: z.string().optional().or(z.literal('')),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z.enum(['name', 'role', 'joinDate', 'totalHours', 'availableHours']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  lightweight: z.coerce.boolean().default(false), // For faster loading with minimal data
})

/**
 * GET /api/organizations/[id]/members
 * List organization members with filtering
 */
export const GET = withSecureAuth(
  'teamMembers.viewAll',
  {
    action: 'list_members',
    resourceType: 'member',
    logRequest: false,
    logResponse: false,
  }
)(async (req: NextRequest, { params }, authContext) => {
  try {
    const { id: organizationSlugOrId } = await params
    
    // Resolve organization by slug or UUID
    const orgResult = await resolveOrganization(organizationSlugOrId)
    if (!orgResult.success) {
      return createErrorResponse(orgResult.error, orgResult.status)
    }
    
    const organizationId = orgResult.entity.id
    const searchParams = req.nextUrl.searchParams
    
    // Parse array parameters manually (Next.js doesn't handle arrays well)
    const rolesArray = searchParams.getAll('roles')
    const projectsArray = searchParams.getAll('projects')
    const permissionsArray = searchParams.getAll('permissions')
    
    // Helper function to get non-null query parameter
    const getParam = (key: string) => {
      const value = searchParams.get(key)
      return value === null || value === '' ? undefined : value
    }

    // Build query object with arrays, filtering out null values
    const queryObject = {
      roles: rolesArray.length > 0 ? rolesArray : undefined,
      projects: projectsArray.length > 0 ? projectsArray : undefined,
      permissions: permissionsArray.length > 0 ? permissionsArray : undefined,
      minHours: getParam('minHours'),
      maxHours: getParam('maxHours'),
      minAvailability: getParam('minAvailability'),
      maxAvailability: getParam('maxAvailability'),
      search: getParam('search'),
      page: getParam('page'),
      limit: getParam('limit'),
      sortBy: getParam('sortBy'),
      sortOrder: getParam('sortOrder'),
      lightweight: getParam('lightweight'),
    }
    
    // Validate query parameters
    const queryResult = memberFilterSchema.safeParse(queryObject)
    if (!queryResult.success) {
      return createErrorResponse('Invalid query parameters', 400, queryResult.error.errors)
    }

    const { 
      roles: filterRoles, 
      projects: filterProjects, 
      minHours, 
      maxHours, 
      minAvailability, 
      maxAvailability, 
      permissions: filterPermissions, 
      search, 
      page, 
      limit, 
      sortBy, 
      sortOrder, 
      lightweight 
    } = queryResult.data

    // Build optimized filters
    const filters = {
      roles: filterRoles,
      projects: filterProjects,
      totalHours: minHours !== undefined || maxHours !== undefined ? {
        min: minHours || 0,
        max: maxHours || 168
      } : undefined,
      availabilityHours: minAvailability !== undefined || maxAvailability !== undefined ? {
        min: minAvailability || 0,
        max: maxAvailability || 168
      } : undefined,
      permissions: filterPermissions,
      search,
    }

    // Build optimized where clause
    const where = buildMemberWhereClause(filters, organizationId)
    
    // Build pagination and sorting
    const paginationClause = buildPaginationClause({
      page,
      limit,
      sortBy,
      sortOrder,
    })

    // Choose appropriate includes based on lightweight flag
    const includes = lightweight ? lightweightMemberIncludes : optimizedMemberIncludes

    // Fetch members and pending invitations
    const [members, total, pendingInvitations] = await Promise.all([
      prisma.organizationMember.findMany({
        where,
        include: includes,
        ...paginationClause,
      }),
      prisma.organizationMember.count({ where }),
      prisma.teamInvitation.findMany({
        where: {
          organizationId,
          acceptedAt: null, // Only pending invitations
        },
        include: {
          inviter: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          permissionSet: {
            select: {
              id: true,
              name: true,
              permissions: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ])

    // Calculate availability for members if needed (for availability filtering)
    let filteredMembers = members
    if (filters.availabilityHours) {
      filteredMembers = members.filter(member => {
        const totalHours = member.workingHoursPerWeek
        const engagedHours = member.engagements
          .filter(e => e.isActive)
          .reduce((sum, e) => sum + e.hoursPerWeek, 0)
        const availability = Math.max(0, totalHours - engagedHours)
        
        return availability >= filters.availabilityHours!.min && 
               availability <= filters.availabilityHours!.max
      })
    }

    return Response.json({
      members: filteredMembers,
      pendingInvitations,
      pagination: {
        page,
        limit,
        total: filteredMembers.length,
        totalUnfiltered: total,
        hasMore: paginationClause.skip + limit < total,
      },
      performance: {
        lightweight,
        virtualScrollingRecommended: total > 100,
        cacheKey: `members-${organizationId}-${JSON.stringify(filters)}-${page}-${limit}`,
      },
    })
  } catch (error) {
    console.error('Error fetching organization members:', error)
    return createErrorResponse('Failed to fetch members', 500)
  }
})

/**
 * POST /api/organizations/[id]/members
 * Add a new member to the organization
 */
export const POST = withSecureAuth(
  'teamMembers.manageAll',
  {
    action: 'create_member',
    resourceType: 'member',
    logRequest: true,
    logResponse: true,
  }
)(async (req: NextRequest, { params }, authContext) => {
  try {
    const { id: organizationSlugOrId } = await params
    
    // Resolve organization by slug or UUID
    const orgResult = await resolveOrganization(organizationSlugOrId)
    if (!orgResult.success) {
      return createErrorResponse(orgResult.error, orgResult.status)
    }
    
    const organizationId = orgResult.entity.id
    
    // Validate and sanitize request body
    const bodyResult = await validateAndSanitizeRequestBody(req, memberCreateSchema)
    if ('error' in bodyResult) {
      return bodyResult.error
    }

    const { email, role, permissionSetId, jobTitle, workingHoursPerWeek, joinDate } = bodyResult.data

    // Check if user exists in the system
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (!existingUser) {
      // User doesn't exist - create an invitation
      return await createInvitation(organizationId, email, role, permissionSetId, jobTitle, workingHoursPerWeek, authContext.user.id)
    }

    // Check if user is already a member
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: existingUser.id,
        },
      },
    })

    if (existingMember) {
      return createErrorResponse('User is already a member of this organization', 409)
    }

    // Validate permission set if provided
    if (permissionSetId) {
      const permissionSet = await prisma.permissionSet.findFirst({
        where: {
          id: permissionSetId,
          organizationId,
        },
      })

      if (!permissionSet) {
        return createErrorResponse('Permission set not found', 404)
      }
    }

    // Create the organization member
    const member = await prisma.organizationMember.create({
      data: {
        organizationId,
        userId: existingUser.id,
        role,
        permissionSetId,
        jobTitle,
        workingHoursPerWeek,
        joinDate: joinDate ? new Date(joinDate) : new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        permissionSet: {
          select: {
            id: true,
            name: true,
            permissions: true,
          },
        },
        engagements: {
          where: {
            isActive: true,
          },
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    return Response.json(member, { status: 201 })
  } catch (error) {
    console.error('Error creating organization member:', error)
    return createErrorResponse('Failed to add member', 500)
  }
})
/*
*
 * Create a team invitation for a user who doesn't exist yet
 */
async function createInvitation(
  organizationId: string,
  email: string,
  role: 'admin' | 'member',
  permissionSetId?: string,
  jobTitle?: string,
  workingHoursPerWeek?: number,
  invitedBy: string
) {
  // Import prisma within the function to ensure it's available
  const { prisma } = await import('@/lib/prisma')
  
  try {
    // Check if there's already a pending invitation
    const existingInvitation = await prisma.teamInvitation.findUnique({
      where: {
        organizationId_email: {
          organizationId,
          email,
        },
      },
    })

    if (existingInvitation && !existingInvitation.acceptedAt) {
      // Check if invitation is expired
      const isExpired = existingInvitation.expiresAt < new Date()
      
      if (isExpired) {
        // Delete expired invitation and create a new one
        await prisma.teamInvitation.delete({
          where: { id: existingInvitation.id }
        })
      } else {
        return createErrorResponse(
          'An invitation has already been sent to this email address. You can resend it from the Members tab using the dropdown menu.',
          409
        )
      }
    }

    // Generate secure token for invitation
    const token = generateSecureToken()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Create the invitation
    const invitation = await prisma.teamInvitation.create({
      data: {
        organizationId,
        email,
        role,
        permissionSetId,
        jobTitle,
        workingHoursPerWeek: workingHoursPerWeek || 40,
        invitedBy,
        token,
        expiresAt,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        inviter: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        permissionSet: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Send invitation email
    try {
      await sendInvitationEmail({
        to: email,
        organizationName: invitation.organization.name,
        inviterName: invitation.inviter.fullName || invitation.inviter.email || 'Someone',
        role,
        token,
        expiresAt,
      })
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError)
      // Don't fail the request if email fails, but log it
    }

    return Response.json({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: 'invited',
      invitedAt: invitation.createdAt,
      expiresAt: invitation.expiresAt,
      organization: invitation.organization,
      inviter: invitation.inviter,
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating invitation:', error)
    return createErrorResponse('Failed to send invitation', 500)
  }
}