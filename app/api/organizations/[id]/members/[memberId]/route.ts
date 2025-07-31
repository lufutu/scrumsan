import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'
import { commonFields, validateUUID } from '@/lib/validation-schemas'

// Validation schemas
const memberUpdateSchema = z.object({
  role: z.enum(['admin', 'member']).optional(),
  permissionSetId: commonFields.uuid.optional().nullable(),
  jobTitle: z.string().max(255).optional().nullable(),
  workingHoursPerWeek: z.number().int().min(1).max(168).optional(),
  joinDate: z.string().datetime().optional().nullable(),
})

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

// Helper function to get member with full details
async function getMemberWithDetails(organizationId: string, memberId: string) {
  const member = await prisma.organizationMember.findUnique({
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
        orderBy: {
          startDate: 'desc',
        },
      },
      timeOffEntries: {
        where: {
          status: 'approved',
        },
        select: {
          id: true,
          type: true,
          startDate: true,
          endDate: true,
          description: true,
        },
        orderBy: {
          startDate: 'desc',
        },
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
        },
      },
      timelineEvents: {
        select: {
          id: true,
          eventName: true,
          eventDate: true,
          description: true,
          createdAt: true,
        },
        orderBy: {
          eventDate: 'desc',
        },
      },
    },
  })

  if (!member) {
    throw new Error('Member not found')
  }

  // Calculate availability
  const totalHours = member.workingHoursPerWeek || 40
  const engagedHours = member.engagements.reduce(
    (sum, engagement) => sum + engagement.hoursPerWeek,
    0
  )
  const availableHours = Math.max(0, totalHours - engagedHours)

  return {
    ...member,
    availableHours,
    totalEngagedHours: engagedHours,
  }
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

    // Check permissions - member level required to view member details
    const currentMember = await checkOrganizationPermission(organizationId, user.id, 'member')

    // Get member details
    const member = await getMemberWithDetails(organizationId, memberId)

    // Check if current user can view sensitive profile information
    const canViewSensitiveInfo = 
      currentMember.role === 'owner' || 
      currentMember.role === 'admin' || 
      member.user.id === user.id

    // Filter profile data based on visibility settings and permissions
    if (member.profileData && !canViewSensitiveInfo) {
      const visibility = member.profileData.visibility as Record<string, string>
      const filteredProfileData = { ...member.profileData }
      
      // Apply visibility filters
      Object.keys(filteredProfileData).forEach(key => {
        if (key !== 'id' && key !== 'visibility') {
          const fieldVisibility = visibility[key] || 'admin'
          if (fieldVisibility === 'admin' && currentMember.role === 'member') {
            delete (filteredProfileData as any)[key]
          }
        }
      })
      
      member.profileData = filteredProfileData
    }

    return NextResponse.json(member)
  } catch (error: unknown) {
    console.error('Error fetching member details:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: error instanceof Error && error.message.includes('Access denied') ? 403 : 
               error instanceof Error && error.message.includes('not found') ? 404 : 500 }
    )
  }
}

export async function PUT(
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
    const validationResult = memberUpdateSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const updateData = validationResult.data

    // Get the member to be updated
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

    // Check permissions
    const currentMember = await checkOrganizationPermission(organizationId, user.id, 'member')

    // Determine what the user can update
    const canUpdateRole = currentMember.role === 'owner' || currentMember.role === 'admin'
    const canUpdateOwnProfile = targetMember.userId === user.id
    const canUpdateOtherProfiles = currentMember.role === 'owner' || currentMember.role === 'admin'

    if (!canUpdateOwnProfile && !canUpdateOtherProfiles) {
      return NextResponse.json(
        { error: 'Access denied: Cannot update this member' },
        { status: 403 }
      )
    }

    // Prevent non-owners from changing owner roles
    if (updateData.role && targetMember.role === 'owner' && currentMember.role !== 'owner') {
      return NextResponse.json(
        { error: 'Access denied: Cannot change owner role' },
        { status: 403 }
      )
    }

    // Prevent role changes if user doesn't have permission
    if (updateData.role && !canUpdateRole) {
      return NextResponse.json(
        { error: 'Access denied: Cannot change member roles' },
        { status: 403 }
      )
    }

    // Validate permission set if provided
    if (updateData.permissionSetId) {
      const permissionSet = await prisma.permissionSet.findFirst({
        where: {
          id: updateData.permissionSetId,
          organizationId,
        },
      })

      if (!permissionSet) {
        return NextResponse.json(
          { error: 'Invalid permission set' },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const dataToUpdate: unknown = {}
    
    if (updateData.role !== undefined && canUpdateRole) {
      dataToUpdate.role = updateData.role
    }
    
    if (updateData.permissionSetId !== undefined && canUpdateOtherProfiles) {
      dataToUpdate.permissionSetId = updateData.permissionSetId
    }
    
    if (updateData.jobTitle !== undefined) {
      dataToUpdate.jobTitle = updateData.jobTitle
    }
    
    if (updateData.workingHoursPerWeek !== undefined) {
      dataToUpdate.workingHoursPerWeek = updateData.workingHoursPerWeek
    }
    
    if (updateData.joinDate !== undefined) {
      dataToUpdate.joinDate = updateData.joinDate ? new Date(updateData.joinDate as string) : null
    }

    // Update the member
    const updatedMember = await prisma.organizationMember.update({
      where: {
        id: memberId,
      },
      data: dataToUpdate,
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
        timeOffEntries: {
          where: {
            status: 'approved',
            startDate: {
              lte: new Date(),
            },
            endDate: {
              gte: new Date(),
            },
          },
          select: {
            id: true,
            type: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    })

    // Calculate availability
    const totalHours = updatedMember.workingHoursPerWeek || 40
    const engagedHours = updatedMember.engagements.reduce(
      (sum, engagement) => sum + engagement.hoursPerWeek,
      0
    )
    const availableHours = Math.max(0, totalHours - engagedHours)

    return NextResponse.json({
      ...updatedMember,
      availableHours,
      totalEngagedHours: engagedHours,
    })
  } catch (error: unknown) {
    console.error('Error updating member:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: error instanceof Error && error.message.includes('Access denied') ? 403 : 
               error instanceof Error && error.message.includes('not found') ? 404 : 500 }
    )
  }
}

// Validation schema for member removal
const memberRemovalSchema = z.object({
  boardsToRemoveFrom: z.array(commonFields.uuid).optional(),
  transferOwnership: z.object({
    newOwnerId: commonFields.uuid,
  }).optional(),
  isVoluntaryLeave: z.boolean().optional().default(false),
})

export async function DELETE(
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

    // Parse request body for removal options
    const body = await req.json().catch(() => ({}))
    const validationResult = memberRemovalSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { boardsToRemoveFrom, transferOwnership, isVoluntaryLeave } = validationResult.data

    // Get current user
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)

    // Get the member to be removed with full details
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
          },
        },
        engagements: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        timeOffEntries: true,
        profileData: true,
        timelineEvents: true,
      },
    })

    if (!targetMember) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const isOwnAccount = targetMember.userId === user.id
    const currentMember = isOwnAccount 
      ? targetMember 
      : await checkOrganizationPermission(organizationId, user.id, 'admin')

    // Handle voluntary leave vs admin removal
    if (isVoluntaryLeave && !isOwnAccount) {
      return NextResponse.json(
        { error: 'Cannot perform voluntary leave for another member' },
        { status: 403 }
      )
    }

    if (!isVoluntaryLeave && !isOwnAccount) {
      // Admin removal - check permissions
      if (currentMember.role !== 'admin' && currentMember.role !== 'owner') {
        return NextResponse.json(
          { error: 'Access denied: Admin role required to remove members' },
          { status: 403 }
        )
      }

      // Prevent non-owners from removing admins
      if (targetMember.role === 'admin' && currentMember.role !== 'owner') {
        return NextResponse.json(
          { error: 'Access denied: Only owners can remove admins' },
          { status: 403 }
        )
      }
    }

    // Handle organization owner scenarios
    if (targetMember.role === 'owner') {
      if (!isOwnAccount) {
        return NextResponse.json(
          { error: 'Cannot remove organization owner' },
          { status: 403 }
        )
      }

      // Owner leaving - require ownership transfer
      if (!transferOwnership?.newOwnerId) {
        return NextResponse.json(
          { error: 'Ownership transfer required when owner leaves organization' },
          { status: 400 }
        )
      }

      // Validate new owner exists and is a member
      const newOwner = await prisma.organizationMember.findUnique({
        where: {
          id: transferOwnership.newOwnerId,
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
      })

      if (!newOwner) {
        return NextResponse.json(
          { error: 'New owner must be an existing organization member' },
          { status: 400 }
        )
      }

      // Transfer ownership
      await prisma.organizationMember.update({
        where: {
          id: transferOwnership.newOwnerId,
        },
        data: {
          role: 'owner',
        },
      })
    }

    // Handle board removal if specified
    if (boardsToRemoveFrom && boardsToRemoveFrom.length > 0) {
      // Get boards where the current user has admin/owner permissions
      const accessibleBoards = await prisma.board.findMany({
        where: {
          id: { in: boardsToRemoveFrom },
          organizationId,
          OR: [
            { createdBy: user.id },
            {
              organization: {
                members: {
                  some: {
                    userId: user.id,
                    role: { in: ['owner', 'admin'] },
                  },
                },
              },
            },
          ],
        },
        select: {
          id: true,
          name: true,
        },
      })

      // Remove member from project boards (if they exist in the schema)
      // Note: Based on the schema, boards are linked to organizations, not individual members
      // So we don't need to remove board memberships directly
      
      // However, we should remove any project memberships that might affect board access
      const projectsToUpdate = await prisma.project.findMany({
        where: {
          organizationId,
          boardLinks: {
            some: {
              boardId: { in: boardsToRemoveFrom },
            },
          },
          members: {
            some: {
              userId: targetMember.userId,
            },
          },
        },
        include: {
          members: {
            where: {
              userId: targetMember.userId,
            },
          },
        },
      })

      // Remove from project memberships for specified boards
      for (const project of projectsToUpdate) {
        await prisma.projectMember.deleteMany({
          where: {
            projectId: project.id,
            userId: targetMember.userId,
          },
        })
      }
    }

    // Start transaction for member removal and cleanup
    const result = await prisma.$transaction(async (tx) => {
      // Clean up related data
      const cleanupSummary = {
        engagements: targetMember.engagements.length,
        timeOffEntries: targetMember.timeOffEntries.length,
        timelineEvents: targetMember.timelineEvents.length,
        profileData: targetMember.profileData ? 1 : 0,
      }

      // Remove the member (cascade deletes will handle related records)
      await tx.organizationMember.delete({
        where: {
          id: memberId,
        },
      })

      return {
        message: isVoluntaryLeave ? 'Successfully left organization' : 'Member removed successfully',
        removedMember: {
          id: targetMember.id,
          user: targetMember.user,
          role: targetMember.role,
        },
        cleanupSummary,
        boardsRemovedFrom: boardsToRemoveFrom || [],
        ownershipTransferred: transferOwnership ? {
          newOwnerId: transferOwnership.newOwnerId,
        } : null,
      }
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Error removing member:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: error instanceof Error && error.message.includes('Access denied') ? 403 : 
               error instanceof Error && error.message.includes('not found') ? 404 : 500 }
    )
  }
}