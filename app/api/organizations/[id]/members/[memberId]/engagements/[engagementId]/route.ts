import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'
import { commonFields, validateUUID, engagementUpdateSchema } from '@/lib/validation-schemas'

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

// Helper function to validate engagement hours
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

  const totalHours = member.workingHoursPerWeek || 40
  const currentEngagedHours = member.engagements.reduce(
    (sum, engagement) => sum + engagement.hoursPerWeek,
    0
  )
  const newTotalHours = currentEngagedHours + hoursPerWeek

  if (newTotalHours > totalHours) {
    throw new Error(
      `Engagement hours (${hoursPerWeek}) would exceed available capacity. ` +
      `Available: ${totalHours - currentEngagedHours} hours, Total capacity: ${totalHours} hours`
    )
  }

  return member
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string; engagementId: string }> }
) {
  try {
    const { id: organizationId, memberId, engagementId  } = await params
    
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

    const engagementIdValidation = validateUUID(engagementId, 'Engagement ID')
    if (!engagementIdValidation.valid) {
      return NextResponse.json(
        { error: engagementIdValidation.error },
        { status: 400 }
      )
    }

    // Get current user
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)

    // Parse and validate request body
    const body = await req.json()
    const validationResult = engagementUpdateSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const updateData = validationResult.data

    // Check permissions - admin level required to manage engagements
    await checkOrganizationPermission(organizationId, user.id, 'admin')

    // Get the existing engagement
    const existingEngagement = await prisma.projectEngagement.findUnique({
      where: {
        id: engagementId,
        organizationMemberId: memberId,
      },
      include: {
        organizationMember: {
          where: {
            organizationId,
          },
        },
        project: {
          where: {
            organizationId,
          },
        },
      },
    })

    if (!existingEngagement || !existingEngagement.organizationMember.length || !existingEngagement.project) {
      return NextResponse.json(
        { error: 'Engagement not found' },
        { status: 404 }
      )
    }

    // If updating project, verify the new project exists and belongs to the organization
    if (updateData.projectId && updateData.projectId !== existingEngagement.projectId) {
      const project = await prisma.project.findUnique({
        where: {
          id: updateData.projectId,
          organizationId,
        },
      })

      if (!project) {
        return NextResponse.json(
          { error: 'Project not found or does not belong to this organization' },
          { status: 404 }
        )
      }
    }

    // If updating hours, validate they don't exceed capacity
    if (updateData.hoursPerWeek !== undefined) {
      await validateEngagementHours(memberId, updateData.hoursPerWeek, engagementId)
    }

    // Validate date range if dates are being updated
    let startDate = existingEngagement.startDate
    let endDate = existingEngagement.endDate

    if (updateData.startDate !== undefined) {
      startDate = new Date(updateData.startDate)
    }
    if (updateData.endDate !== undefined) {
      endDate = updateData.endDate ? new Date(updateData.endDate) : null
    }

    if (endDate && endDate <= startDate) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      )
    }

    // Check for overlapping engagements if project or dates are changing
    if (updateData.projectId || updateData.startDate || updateData.endDate) {
      const projectId = updateData.projectId || existingEngagement.projectId
      
      const overlappingEngagement = await prisma.projectEngagement.findFirst({
        where: {
          id: { not: engagementId },
          organizationMemberId: memberId,
          projectId,
          isActive: true,
          OR: [
            {
              endDate: null, // Ongoing engagement
            },
            {
              AND: [
                { startDate: { lte: endDate || new Date('2099-12-31') } },
                { endDate: { gte: startDate } },
              ],
            },
          ],
        },
      })

      if (overlappingEngagement) {
        return NextResponse.json(
          { error: 'Member already has an active or overlapping engagement on this project' },
          { status: 409 }
        )
      }
    }

    // Prepare update data
    const dataToUpdate: any = {}
    
    if (updateData.projectId !== undefined) {
      dataToUpdate.projectId = updateData.projectId
    }
    if (updateData.role !== undefined) {
      dataToUpdate.role = updateData.role
    }
    if (updateData.hoursPerWeek !== undefined) {
      dataToUpdate.hoursPerWeek = updateData.hoursPerWeek
    }
    if (updateData.startDate !== undefined) {
      dataToUpdate.startDate = startDate
    }
    if (updateData.endDate !== undefined) {
      dataToUpdate.endDate = endDate
    }
    if (updateData.isActive !== undefined) {
      dataToUpdate.isActive = updateData.isActive
    }

    // Update the engagement
    const updatedEngagement = await prisma.projectEngagement.update({
      where: {
        id: engagementId,
      },
      data: dataToUpdate,
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

    return NextResponse.json(updatedEngagement)
  } catch (error: unknown) {
    console.error('Error updating engagement:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: error instanceof Error && error.message.includes('Access denied') ? 403 : 
               error instanceof Error && error.message.includes('not found') ? 404 :
               error instanceof Error && error.message.includes('exceed') ? 400 :
               error instanceof Error && error.message.includes('overlapping') ? 409 : 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string; engagementId: string }> }
) {
  try {
    const { id: organizationId, memberId, engagementId  } = await params
    
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

    const engagementIdValidation = validateUUID(engagementId, 'Engagement ID')
    if (!engagementIdValidation.valid) {
      return NextResponse.json(
        { error: engagementIdValidation.error },
        { status: 400 }
      )
    }

    // Get current user
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)

    // Check permissions - admin level required to manage engagements
    await checkOrganizationPermission(organizationId, user.id, 'admin')

    // Get the existing engagement to verify it exists and belongs to the organization
    const existingEngagement = await prisma.projectEngagement.findUnique({
      where: {
        id: engagementId,
        organizationMemberId: memberId,
      },
      include: {
        organizationMember: {
          where: {
            organizationId,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!existingEngagement || !existingEngagement.organizationMember.length) {
      return NextResponse.json(
        { error: 'Engagement not found' },
        { status: 404 }
      )
    }

    // Delete the engagement
    await prisma.projectEngagement.delete({
      where: {
        id: engagementId,
      },
    })

    return NextResponse.json({
      message: 'Engagement deleted successfully',
      deletedEngagement: {
        id: existingEngagement.id,
        project: existingEngagement.project,
        role: existingEngagement.role,
        hoursPerWeek: existingEngagement.hoursPerWeek,
        startDate: existingEngagement.startDate,
        endDate: existingEngagement.endDate,
      },
    })
  } catch (error: unknown) {
    console.error('Error deleting engagement:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: error instanceof Error && error.message.includes('Access denied') ? 403 : 
               error instanceof Error && error.message.includes('not found') ? 404 : 500 }
    )
  }
}