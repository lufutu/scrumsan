import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { validateUUID, timeOffCreateSchema, parseQueryParams } from '@/lib/validation-schemas'
import { z } from 'zod'

// Helper function to check organization permissions
async function checkOrganizationPermission(
  organizationId: string, 
  userId: string, 
  requiredRole: 'owner' | 'admin' | 'member' = 'member'
) {
  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
    include: {
      permissionSet: true,
    },
  })

  if (!member) {
    throw new Error('Access denied: Not a member of this organization')
  }

  // Check role hierarchy: owner > admin > member
  const roleHierarchy = { owner: 3, admin: 2, member: 1 }
  const userRoleLevel = roleHierarchy[member.role as keyof typeof roleHierarchy] || 0
  const requiredRoleLevel = roleHierarchy[requiredRole]

  if (userRoleLevel < requiredRoleLevel) {
    throw new Error(`Access denied: ${requiredRole} role required`)
  }

  return member
}

// Helper function to check if user can manage time-off for a member
async function canManageTimeOff(
  organizationId: string,
  currentUserId: string,
  targetMemberId: string
): Promise<{ canManage: boolean; currentMember: any; targetMember: any }> {
  const [currentMember, targetMember] = await Promise.all([
    prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: currentUserId,
        },
      },
    }),
    prisma.organizationMember.findUnique({
      where: {
        id: targetMemberId,
        organizationId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    }),
  ])

  if (!currentMember || !targetMember) {
    throw new Error('Member not found')
  }

  // Users can manage their own time-off, or admins/owners can manage others
  const canManage = 
    targetMember.userId === currentUserId ||
    currentMember.role === 'owner' ||
    currentMember.role === 'admin'

  return { canManage, currentMember, targetMember }
}

// Query parameters schema for filtering time-off entries
const timeOffQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  type: z.enum(['vacation', 'parental_leave', 'sick_leave', 'paid_time_off', 'unpaid_time_off', 'other']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const { id: organizationId, memberId } = params
    
    // Validate IDs
    const orgIdValidation = validateUUID(organizationId, 'Organization ID')
    if (!orgIdValidation.valid) {
      return NextResponse.json(
        { error: orgIdValidation.error },
        { status: 400 }
      )
    }

    const memberIdValidation = validateUUID(memberId, 'Member ID')
    if (!memberIdValidation.valid) {
      return NextResponse.json(
        { error: memberIdValidation.error },
        { status: 400 }
      )
    }

    // Get current user
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)

    // Parse query parameters
    const queryResult = parseQueryParams(req.nextUrl.searchParams, timeOffQuerySchema)
    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryResult.error.errors },
        { status: 400 }
      )
    }

    const { status, type, startDate, endDate, page, limit } = queryResult.data

    // Check permissions
    const { canManage } = await canManageTimeOff(organizationId, user.id, memberId)
    if (!canManage) {
      return NextResponse.json(
        { error: 'Access denied: Cannot view time-off entries for this member' },
        { status: 403 }
      )
    }

    // Build where clause for filtering
    const whereClause: any = {
      organizationMemberId: memberId,
    }

    if (status) {
      whereClause.status = status
    }

    if (type) {
      whereClause.type = type
    }

    if (startDate || endDate) {
      whereClause.AND = []
      
      if (startDate) {
        whereClause.AND.push({
          endDate: {
            gte: new Date(startDate),
          },
        })
      }
      
      if (endDate) {
        whereClause.AND.push({
          startDate: {
            lte: new Date(endDate),
          },
        })
      }
    }

    // Get total count for pagination
    const totalCount = await prisma.timeOffEntry.count({
      where: whereClause,
    })

    // Get time-off entries with pagination
    const timeOffEntries = await prisma.timeOffEntry.findMany({
      where: whereClause,
      include: {
        approver: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: [
        { startDate: 'desc' },
        { createdAt: 'desc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
    })

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      timeOffEntries,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error: unknown) {
    console.error('Error fetching time-off entries:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: error instanceof Error && error.message.includes('Access denied') ? 403 : 
               error instanceof Error && error.message.includes('not found') ? 404 : 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const { id: organizationId, memberId } = params
    
    // Validate IDs
    const orgIdValidation = validateUUID(organizationId, 'Organization ID')
    if (!orgIdValidation.valid) {
      return NextResponse.json(
        { error: orgIdValidation.error },
        { status: 400 }
      )
    }

    const memberIdValidation = validateUUID(memberId, 'Member ID')
    if (!memberIdValidation.valid) {
      return NextResponse.json(
        { error: memberIdValidation.error },
        { status: 400 }
      )
    }

    // Get current user
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)

    // Parse and validate request body
    const body = await req.json()
    const validationResult = timeOffCreateSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { type, startDate, endDate, description } = validationResult.data

    // Check permissions
    const { canManage, targetMember } = await canManageTimeOff(organizationId, user.id, memberId)
    if (!canManage) {
      return NextResponse.json(
        { error: 'Access denied: Cannot create time-off entries for this member' },
        { status: 403 }
      )
    }

    // Additional validation: Check for overlapping time-off entries
    const overlappingEntries = await prisma.timeOffEntry.findMany({
      where: {
        organizationMemberId: memberId,
        status: {
          in: ['pending', 'approved'],
        },
        OR: [
          {
            AND: [
              { startDate: { lte: new Date(startDate) } },
              { endDate: { gte: new Date(startDate) } },
            ],
          },
          {
            AND: [
              { startDate: { lte: new Date(endDate) } },
              { endDate: { gte: new Date(endDate) } },
            ],
          },
          {
            AND: [
              { startDate: { gte: new Date(startDate) } },
              { endDate: { lte: new Date(endDate) } },
            ],
          },
        ],
      },
    })

    if (overlappingEntries.length > 0) {
      return NextResponse.json(
        { error: 'Time-off period overlaps with existing entries' },
        { status: 409 }
      )
    }

    // Create the time-off entry
    const timeOffEntry = await prisma.timeOffEntry.create({
      data: {
        organizationMemberId: memberId,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        description,
        status: 'pending', // Default status
      },
      include: {
        approver: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        organizationMember: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(timeOffEntry, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating time-off entry:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: error instanceof Error && error.message.includes('Access denied') ? 403 : 
               error instanceof Error && error.message.includes('not found') ? 404 : 500 }
    )
  }
}