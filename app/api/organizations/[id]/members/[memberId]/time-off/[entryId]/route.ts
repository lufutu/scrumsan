import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { validateUUID, timeOffUpdateSchema } from '@/lib/validation-schemas'

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

// Helper function to get time-off entry with validation
async function getTimeOffEntry(entryId: string, memberId: string, organizationId: string) {
  const timeOffEntry = await prisma.timeOffEntry.findUnique({
    where: {
      id: entryId,
    },
    include: {
      organizationMember: {
        where: {
          id: memberId,
          organizationId,
        },
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
      approver: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  })

  if (!timeOffEntry || !timeOffEntry.organizationMember) {
    throw new Error('Time-off entry not found')
  }

  return timeOffEntry
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; memberId: string; entryId: string } }
) {
  try {
    const { id: organizationId, memberId, entryId } = params
    
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

    const entryIdValidation = validateUUID(entryId, 'Entry ID')
    if (!entryIdValidation.valid) {
      return NextResponse.json(
        { error: entryIdValidation.error },
        { status: 400 }
      )
    }

    // Get current user
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)

    // Check permissions
    const { canManage } = await canManageTimeOff(organizationId, user.id, memberId)
    if (!canManage) {
      return NextResponse.json(
        { error: 'Access denied: Cannot view time-off entry for this member' },
        { status: 403 }
      )
    }

    // Get the time-off entry
    const timeOffEntry = await getTimeOffEntry(entryId, memberId, organizationId)

    return NextResponse.json(timeOffEntry)
  } catch (error: unknown) {
    console.error('Error fetching time-off entry:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: error instanceof Error && error.message.includes('Access denied') ? 403 : 
               error instanceof Error && error.message.includes('not found') ? 404 : 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; memberId: string; entryId: string } }
) {
  try {
    const { id: organizationId, memberId, entryId } = params
    
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

    const entryIdValidation = validateUUID(entryId, 'Entry ID')
    if (!entryIdValidation.valid) {
      return NextResponse.json(
        { error: entryIdValidation.error },
        { status: 400 }
      )
    }

    // Get current user
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)

    // Parse and validate request body
    const body = await req.json()
    const validationResult = timeOffUpdateSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const updateData = validationResult.data

    // Check permissions
    const { canManage, currentMember } = await canManageTimeOff(organizationId, user.id, memberId)
    if (!canManage) {
      return NextResponse.json(
        { error: 'Access denied: Cannot update time-off entry for this member' },
        { status: 403 }
      )
    }

    // Get the existing time-off entry
    const existingEntry = await getTimeOffEntry(entryId, memberId, organizationId)

    // Check if dates are being updated and validate for overlaps
    if (updateData.startDate || updateData.endDate) {
      const newStartDate = updateData.startDate ? new Date(updateData.startDate) : existingEntry.startDate
      const newEndDate = updateData.endDate ? new Date(updateData.endDate) : existingEntry.endDate

      // Validate date range
      if (newStartDate > newEndDate) {
        return NextResponse.json(
          { error: 'Start date must be before or equal to end date' },
          { status: 400 }
        )
      }

      // Check for overlapping entries (excluding the current entry)
      const overlappingEntries = await prisma.timeOffEntry.findMany({
        where: {
          organizationMemberId: memberId,
          id: { not: entryId },
          status: {
            in: ['pending', 'approved'],
          },
          OR: [
            {
              AND: [
                { startDate: { lte: newStartDate } },
                { endDate: { gte: newStartDate } },
              ],
            },
            {
              AND: [
                { startDate: { lte: newEndDate } },
                { endDate: { gte: newEndDate } },
              ],
            },
            {
              AND: [
                { startDate: { gte: newStartDate } },
                { endDate: { lte: newEndDate } },
              ],
            },
          ],
        },
      })

      if (overlappingEntries.length > 0) {
        return NextResponse.json(
          { error: 'Updated time-off period overlaps with existing entries' },
          { status: 409 }
        )
      }
    }

    // Prepare update data
    const dataToUpdate: any = {}
    
    if (updateData.type !== undefined) {
      dataToUpdate.type = updateData.type
    }
    
    if (updateData.startDate !== undefined) {
      dataToUpdate.startDate = new Date(updateData.startDate)
    }
    
    if (updateData.endDate !== undefined) {
      dataToUpdate.endDate = new Date(updateData.endDate)
    }
    
    if (updateData.description !== undefined) {
      dataToUpdate.description = updateData.description
    }

    // Only admins/owners can change status and approver
    if (currentMember.role === 'owner' || currentMember.role === 'admin') {
      if (updateData.status !== undefined) {
        dataToUpdate.status = updateData.status
        
        // Set approver when approving/rejecting
        if (updateData.status === 'approved' || updateData.status === 'rejected') {
          dataToUpdate.approvedBy = user.id
        } else if (updateData.status === 'pending') {
          dataToUpdate.approvedBy = null
        }
      }
      
      if (updateData.approvedBy !== undefined) {
        dataToUpdate.approvedBy = updateData.approvedBy
      }
    }

    // Update the time-off entry
    const updatedEntry = await prisma.timeOffEntry.update({
      where: {
        id: entryId,
      },
      data: dataToUpdate,
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

    return NextResponse.json(updatedEntry)
  } catch (error: unknown) {
    console.error('Error updating time-off entry:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: error instanceof Error && error.message.includes('Access denied') ? 403 : 
               error instanceof Error && error.message.includes('not found') ? 404 : 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; memberId: string; entryId: string } }
) {
  try {
    const { id: organizationId, memberId, entryId } = params
    
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

    const entryIdValidation = validateUUID(entryId, 'Entry ID')
    if (!entryIdValidation.valid) {
      return NextResponse.json(
        { error: entryIdValidation.error },
        { status: 400 }
      )
    }

    // Get current user
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)

    // Check permissions
    const { canManage } = await canManageTimeOff(organizationId, user.id, memberId)
    if (!canManage) {
      return NextResponse.json(
        { error: 'Access denied: Cannot delete time-off entry for this member' },
        { status: 403 }
      )
    }

    // Get the time-off entry to verify it exists and belongs to the member
    const timeOffEntry = await getTimeOffEntry(entryId, memberId, organizationId)

    // Delete the time-off entry
    await prisma.timeOffEntry.delete({
      where: {
        id: entryId,
      },
    })

    return NextResponse.json({
      message: 'Time-off entry deleted successfully',
      deletedEntry: {
        id: timeOffEntry.id,
        type: timeOffEntry.type,
        startDate: timeOffEntry.startDate,
        endDate: timeOffEntry.endDate,
        status: timeOffEntry.status,
      },
    })
  } catch (error: unknown) {
    console.error('Error deleting time-off entry:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: error instanceof Error && error.message.includes('Access denied') ? 403 : 
               error instanceof Error && error.message.includes('not found') ? 404 : 500 }
    )
  }
}