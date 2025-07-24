import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { validateUUID, timelineEventUpdateSchema } from '@/lib/validation-schemas'

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

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; memberId: string; eventId: string } }
) {
  try {
    const { id: organizationId, memberId, eventId } = params
    
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

    const eventIdValidation = validateUUID(eventId, 'Event ID')
    if (!eventIdValidation.valid) {
      return NextResponse.json(
        { error: eventIdValidation.error },
        { status: 400 }
      )
    }

    // Get current user
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)

    // Parse and validate request body
    const body = await req.json()
    const validationResult = timelineEventUpdateSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const updateData = validationResult.data

    // Check permissions
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

    // Get the timeline event to verify it exists and belongs to the member
    const existingEvent = await prisma.timelineEvent.findUnique({
      where: {
        id: eventId,
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

    if (!existingEvent || existingEvent.organizationMemberId !== memberId) {
      return NextResponse.json(
        { error: 'Timeline event not found' },
        { status: 404 }
      )
    }

    // Check if current user can edit this timeline event
    const isOwnProfile = targetMember.user.id === user.id
    const isEventCreator = existingEvent.createdBy === user.id
    const canEditEvent = 
      currentMember.role === 'owner' || 
      currentMember.role === 'admin' || 
      (isOwnProfile && isEventCreator)

    if (!canEditEvent) {
      return NextResponse.json(
        { error: 'Access denied: Cannot edit this timeline event' },
        { status: 403 }
      )
    }

    // Prepare update data, converting date strings to Date objects
    const dataToUpdate: Record<string, unknown> = {}
    
    Object.keys(updateData).forEach(key => {
      const value = updateData[key as keyof typeof updateData]
      if (key === 'eventDate' && value) {
        dataToUpdate[key] = new Date(value as string)
      } else {
        dataToUpdate[key] = value
      }
    })

    // Update the timeline event
    const updatedEvent = await prisma.timelineEvent.update({
      where: {
        id: eventId,
      },
      data: dataToUpdate,
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

    return NextResponse.json(updatedEvent)
  } catch (error: unknown) {
    console.error('Error updating timeline event:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: error instanceof Error && error.message.includes('Access denied') ? 403 : 
               error instanceof Error && error.message.includes('not found') ? 404 : 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; memberId: string; eventId: string } }
) {
  try {
    const { id: organizationId, memberId, eventId } = params
    
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

    const eventIdValidation = validateUUID(eventId, 'Event ID')
    if (!eventIdValidation.valid) {
      return NextResponse.json(
        { error: eventIdValidation.error },
        { status: 400 }
      )
    }

    // Get current user
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)

    // Check permissions
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

    // Get the timeline event to verify it exists and belongs to the member
    const existingEvent = await prisma.timelineEvent.findUnique({
      where: {
        id: eventId,
      },
    })

    if (!existingEvent || existingEvent.organizationMemberId !== memberId) {
      return NextResponse.json(
        { error: 'Timeline event not found' },
        { status: 404 }
      )
    }

    // Check if current user can delete this timeline event
    const isOwnProfile = targetMember.user.id === user.id
    const isEventCreator = existingEvent.createdBy === user.id
    const canDeleteEvent = 
      currentMember.role === 'owner' || 
      currentMember.role === 'admin' || 
      (isOwnProfile && isEventCreator)

    if (!canDeleteEvent) {
      return NextResponse.json(
        { error: 'Access denied: Cannot delete this timeline event' },
        { status: 403 }
      )
    }

    // Delete the timeline event
    await prisma.timelineEvent.delete({
      where: {
        id: eventId,
      },
    })

    return NextResponse.json({ message: 'Timeline event deleted successfully' })
  } catch (error: unknown) {
    console.error('Error deleting timeline event:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: error instanceof Error && error.message.includes('Access denied') ? 403 : 
               error instanceof Error && error.message.includes('not found') ? 404 : 500 }
    )
  }
}