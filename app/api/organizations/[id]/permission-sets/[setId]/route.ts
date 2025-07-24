import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'
import { commonFields, validateUUID, permissionSetUpdateSchema } from '@/lib/validation-schemas'
import { validatePermissionDependencies } from '@/lib/permission-utils'

const permissionSetDeleteSchema = z.object({
  reassignToPermissionSetId: commonFields.uuid.optional(),
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



export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; setId: string } }
) {
  try {
    const { id: organizationId, setId } = params
    
    // Validate IDs
    const orgIdValidation = validateUUID(organizationId, 'Organization ID')
    if (!orgIdValidation.valid) {
      return NextResponse.json(
        { error: orgIdValidation.error },
        { status: 400 }
      )
    }

    const setIdValidation = validateUUID(setId, 'Permission Set ID')
    if (!setIdValidation.valid) {
      return NextResponse.json(
        { error: setIdValidation.error },
        { status: 400 }
      )
    }

    // Get current user
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)

    // Check permissions - admin level required to view permission sets
    await checkOrganizationPermission(organizationId, user.id, 'admin')

    // Get permission set
    const permissionSet = await prisma.permissionSet.findFirst({
      where: {
        id: setId,
        organizationId,
      },
      include: {
        members: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    })

    if (!permissionSet) {
      return NextResponse.json(
        { error: 'Permission set not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(permissionSet)
  } catch (error: unknown) {
    console.error('Error fetching permission set:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: error instanceof Error && error.message.includes('Access denied') ? 403 : 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; setId: string } }
) {
  try {
    const { id: organizationId, setId } = params
    
    // Validate IDs
    const orgIdValidation = validateUUID(organizationId, 'Organization ID')
    if (!orgIdValidation.valid) {
      return NextResponse.json(
        { error: orgIdValidation.error },
        { status: 400 }
      )
    }

    const setIdValidation = validateUUID(setId, 'Permission Set ID')
    if (!setIdValidation.valid) {
      return NextResponse.json(
        { error: setIdValidation.error },
        { status: 400 }
      )
    }

    // Get current user
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)

    // Check permissions - admin level required to update permission sets
    await checkOrganizationPermission(organizationId, user.id, 'admin')

    // Check if permission set exists and belongs to organization
    const existingPermissionSet = await prisma.permissionSet.findFirst({
      where: {
        id: setId,
        organizationId,
      },
    })

    if (!existingPermissionSet) {
      return NextResponse.json(
        { error: 'Permission set not found' },
        { status: 404 }
      )
    }

    // Prevent updating default permission sets
    if (existingPermissionSet.isDefault) {
      return NextResponse.json(
        { error: 'Cannot update default permission sets' },
        { status: 400 }
      )
    }

    // Parse and validate request body
    const body = await req.json()
    const validationResult = permissionSetUpdateSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const updateData = validationResult.data

    // Validate permission dependencies if permissions are being updated
    if (updateData.permissions) {
      const dependencyErrors = validatePermissionDependencies(updateData.permissions)
      if (dependencyErrors.length > 0) {
        return NextResponse.json(
          { error: 'Permission dependency validation failed', details: dependencyErrors },
          { status: 400 }
        )
      }
    }

    // Check if name already exists (if name is being updated)
    if (updateData.name && updateData.name !== existingPermissionSet.name) {
      const nameExists = await prisma.permissionSet.findFirst({
        where: {
          organizationId,
          name: updateData.name,
          id: { not: setId },
        },
      })

      if (nameExists) {
        return NextResponse.json(
          { error: 'A permission set with this name already exists' },
          { status: 409 }
        )
      }
    }

    // Update permission set
    const updatedPermissionSet = await prisma.permissionSet.update({
      where: { id: setId },
      data: updateData,
      include: {
        members: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    })

    return NextResponse.json(updatedPermissionSet)
  } catch (error: unknown) {
    console.error('Error updating permission set:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: error instanceof Error && error.message.includes('Access denied') ? 403 : 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; setId: string } }
) {
  try {
    const { id: organizationId, setId } = params
    
    // Validate IDs
    const orgIdValidation = validateUUID(organizationId, 'Organization ID')
    if (!orgIdValidation.valid) {
      return NextResponse.json(
        { error: orgIdValidation.error },
        { status: 400 }
      )
    }

    const setIdValidation = validateUUID(setId, 'Permission Set ID')
    if (!setIdValidation.valid) {
      return NextResponse.json(
        { error: setIdValidation.error },
        { status: 400 }
      )
    }

    // Get current user
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)

    // Check permissions - admin level required to delete permission sets
    await checkOrganizationPermission(organizationId, user.id, 'admin')

    // Check if permission set exists and belongs to organization
    const existingPermissionSet = await prisma.permissionSet.findFirst({
      where: {
        id: setId,
        organizationId,
      },
      include: {
        members: true,
      },
    })

    if (!existingPermissionSet) {
      return NextResponse.json(
        { error: 'Permission set not found' },
        { status: 404 }
      )
    }

    // Prevent deleting default permission sets
    if (existingPermissionSet.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete default permission sets' },
        { status: 400 }
      )
    }

    // Parse request body for reassignment logic
    let reassignToPermissionSetId: string | undefined
    try {
      const body = await req.json()
      const validationResult = permissionSetDeleteSchema.safeParse(body)
      
      if (!validationResult.success) {
        return NextResponse.json(
          { error: 'Validation error', details: validationResult.error.errors },
          { status: 400 }
        )
      }

      reassignToPermissionSetId = validationResult.data.reassignToPermissionSetId
    } catch {
      // Body is optional for DELETE, ignore parsing errors
    }

    // If there are members assigned to this permission set, handle reassignment
    if (existingPermissionSet.members.length > 0) {
      if (!reassignToPermissionSetId) {
        return NextResponse.json(
          { 
            error: 'Cannot delete permission set with assigned members. Please provide reassignToPermissionSetId.',
            assignedMembers: existingPermissionSet.members.length,
          },
          { status: 400 }
        )
      }

      // Validate the reassignment permission set exists
      const reassignmentSet = await prisma.permissionSet.findFirst({
        where: {
          id: reassignToPermissionSetId,
          organizationId,
        },
      })

      if (!reassignmentSet) {
        return NextResponse.json(
          { error: 'Invalid reassignment permission set' },
          { status: 400 }
        )
      }

      // Reassign all members to the new permission set
      await prisma.organizationMember.updateMany({
        where: {
          permissionSetId: setId,
        },
        data: {
          permissionSetId: reassignToPermissionSetId,
        },
      })
    }

    // Delete the permission set
    await prisma.permissionSet.delete({
      where: { id: setId },
    })

    return NextResponse.json(
      { 
        message: 'Permission set deleted successfully',
        reassignedMembers: existingPermissionSet.members.length,
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error('Error deleting permission set:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: error instanceof Error && error.message.includes('Access denied') ? 403 : 500 }
    )
  }
}