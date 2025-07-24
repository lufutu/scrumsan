import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'
import { commonFields, validateUUID, engagementCreateSchema } from '@/lib/validation-schemas'
import { 
  calculateMemberAvailability, 
  validateEngagementCapacity, 
  validateEngagementDates,
  hasOverlappingEngagement 
} from '@/lib/engagement-utils'

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

// Helper function to validate engagement hours using utility
async function validateEngagementHours(
  organizationMemberId: string,
  hoursPerWeek: number,
  excludeEngagementId?: string
) {
  const member = await prisma.organizationMember.findUnique({
    where: { id: organizationMemberId },
    include: {
      engagements: {
        where: {
          isActive: true,
          ...(excludeEngagementId && { id: { not: excludeEngagementId } }),
        },
      },
    },
  })

  if (!member) {
    throw new Error('Member not found')
  }

  const validation = validateEngagementCapacity(
    member.workingHoursPerWeek,
    member.engagements.map(e => ({
      hoursPerWeek: e.hoursPerWeek,
      isActive: e.isActive,
      startDate: e.startDate,
      endDate: e.endDate,
    })),
    hoursPerWeek
  )

  if (!validation.valid) {
    throw new Error(validation.error!)
  }

  return member
}

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

    // Check permissions - member level required to view engagements
    await checkOrganizationPermission(organizationId, user.id, 'member')

    // Verify the member exists and belongs to the organization
    const member = await prisma.organizationMember.findUnique({
      where: {
        id: memberId,
        organizationId,
      },
    })

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Get engagements with project details
    const engagements = await prisma.projectEngagement.findMany({
      where: {
        organizationMemberId: memberId,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            startDate: true,
            endDate: true,
          },
        },
      },
      orderBy: [
        { isActive: 'desc' },
        { startDate: 'desc' },
      ],
    })

    // Calculate availability using utility function
    const availability = calculateMemberAvailability(
      member.workingHoursPerWeek,
      engagements.map(e => ({
        hoursPerWeek: e.hoursPerWeek,
        isActive: e.isActive,
        startDate: e.startDate,
        endDate: e.endDate,
      }))
    )

    return NextResponse.json({
      engagements,
      summary: {
        ...availability,
        totalEngagementsCount: engagements.length,
      },
    })
  } catch (error: unknown) {
    console.error('Error fetching engagements:', error)
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
    const validationResult = engagementCreateSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const engagementData = validationResult.data

    // Check permissions - admin level required to manage engagements
    const currentMember = await checkOrganizationPermission(organizationId, user.id, 'admin')

    // Verify the member exists and belongs to the organization
    const targetMember = await prisma.organizationMember.findUnique({
      where: {
        id: memberId,
        organizationId,
      },
    })

    if (!targetMember) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Verify the project exists and belongs to the organization
    const project = await prisma.project.findUnique({
      where: {
        id: engagementData.projectId,
        organizationId,
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or does not belong to this organization' },
        { status: 404 }
      )
    }

    // Validate engagement hours don't exceed capacity
    await validateEngagementHours(memberId, engagementData.hoursPerWeek)

    // Validate date range using utility function
    const startDate = new Date(engagementData.startDate)
    const endDate = engagementData.endDate ? new Date(engagementData.endDate) : null

    const dateValidation = validateEngagementDates(startDate, endDate)
    if (!dateValidation.valid) {
      return NextResponse.json(
        { error: dateValidation.error },
        { status: 400 }
      )
    }

    // Check for overlapping engagements on the same project
    const existingEngagements = await prisma.projectEngagement.findMany({
      where: {
        organizationMemberId: memberId,
        isActive: true,
      },
      select: {
        id: true,
        projectId: true,
        startDate: true,
        endDate: true,
        isActive: true,
        hoursPerWeek: true,
      },
    })

    const hasOverlap = hasOverlappingEngagement(
      existingEngagements,
      engagementData.projectId,
      startDate,
      endDate
    )

    if (hasOverlap) {
      return NextResponse.json(
        { error: 'Member already has an active or overlapping engagement on this project' },
        { status: 409 }
      )
    }

    // Create the engagement
    const newEngagement = await prisma.projectEngagement.create({
      data: {
        organizationMemberId: memberId,
        projectId: engagementData.projectId,
        role: engagementData.role,
        hoursPerWeek: engagementData.hoursPerWeek,
        startDate,
        endDate,
        isActive: true,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    })

    return NextResponse.json(newEngagement, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating engagement:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: error instanceof Error && error.message.includes('Access denied') ? 403 : 
               error instanceof Error && error.message.includes('not found') ? 404 :
               error instanceof Error && error.message.includes('exceed') ? 400 :
               error instanceof Error && error.message.includes('overlapping') ? 409 : 500 }
    )
  }
}