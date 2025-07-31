import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { validateUUID, timelineEventCreateSchema } from '@/lib/validation-schemas'

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id: organizationId, memberId  } = await params
    
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

    // Check permissions - member level required to view timeline events
    const currentMember = await checkOrganizationPermission(organizationId, user.id, 'member')

    // Verify the target member exists and belongs to the organization
    const targetMember = await prisma.organizationMember.findUnique({
      where: {
        id: memberId,
        organizationId,
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
      },
    })

    if (!targetMember) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Check if current user can view timeline events for this member
    const isOwnProfile = targetMember.user.id === user.id
    const canViewTimeline = 
      currentMember.role === 'owner' || 
      currentMember.role === 'admin' || 
      isOwnProfile

    if (!canViewTimeline) {
      return NextResponse.json(
        { error: 'Access denied: Cannot view timeline events for this member' },
        { status: 403 }
      )
    }

    // Get timeline events for the member
    const timelineEvents = await prisma.timelineEvent.findMany({
      where: {
        organizationMemberId: memberId,
      },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        eventDate: 'desc',
      },
    })

    return NextResponse.json({
      member: {
        id: targetMember.id,
        user: targetMember.user,
      },
      timelineEvents,
    })
  } catch (error: unknown) {
    console.error('Error fetching timeline events:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: error instanceof Error && error.message.includes('Access denied') ? 403 : 
               error instanceof Error && error.message.includes('not found') ? 404 : 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id: organizationId, memberId  } = await params
    
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
    const validationResult = timelineEventCreateSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { eventName, eventDate, description } = validationResult.data

    // Check permissions - member level required to add timeline events
    const currentMember = await checkOrganizationPermission(organizationId, user.id, 'member')

    // Verify the target member exists and belongs to the organization
    const targetMember = await prisma.organizationMember.findUnique({
      where: {
        id: memberId,
        organizationId,
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
      },
    })

    if (!targetMember) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Check if current user can add timeline events for this member
    const isOwnProfile = targetMember.user.id === user.id
    const canAddTimeline = 
      currentMember.role === 'owner' || 
      currentMember.role === 'admin' || 
      isOwnProfile

    if (!canAddTimeline) {
      return NextResponse.json(
        { error: 'Access denied: Cannot add timeline events for this member' },
        { status: 403 }
      )
    }

    // Create the timeline event
    const timelineEvent = await prisma.timelineEvent.create({
      data: {
        organizationMemberId: memberId,
        eventName,
        eventDate: new Date(eventDate),
        description,
        createdBy: user.id,
      },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    })

    return NextResponse.json(timelineEvent, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating timeline event:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: error instanceof Error && error.message.includes('Access denied') ? 403 : 
               error instanceof Error && error.message.includes('not found') ? 404 : 500 }
    )
  }
}