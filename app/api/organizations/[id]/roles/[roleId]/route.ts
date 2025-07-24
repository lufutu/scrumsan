import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { customRoleUpdateSchema, validateUUID } from '@/lib/validation-schemas'
import { checkOrganizationPermission } from '@/lib/permission-utils'

/**
 * GET /api/organizations/[id]/roles/[roleId]
 * Get a specific custom role
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; roleId: string } }
) {
  try {
    const { id: organizationId, roleId } = params

    // Validate UUIDs
    const orgValidation = validateUUID(organizationId, 'Organization ID')
    const roleValidation = validateUUID(roleId, 'Role ID')
    
    if (!orgValidation.valid) {
      return NextResponse.json(
        { error: orgValidation.error },
        { status: 400 }
      )
    }
    
    if (!roleValidation.valid) {
      return NextResponse.json(
        { error: roleValidation.error },
        { status: 400 }
      )
    }

    // Get current user
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)

    // Check if user has permission to view organization members
    const hasPermission = await checkOrganizationPermission(
      user.id,
      organizationId,
      'teamMembers',
      'viewAll'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view custom roles' },
        { status: 403 }
      )
    }

    // Fetch the custom role
    const customRole = await prisma.customRole.findFirst({
      where: {
        id: roleId,
        organizationId,
      },
    })

    if (!customRole) {
      return NextResponse.json(
        { error: 'Custom role not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(customRole)
  } catch (error) {
    console.error('Error fetching custom role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/organizations/[id]/roles/[roleId]
 * Update a custom role
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; roleId: string } }
) {
  try {
    const { id: organizationId, roleId } = params

    // Validate UUIDs
    const orgValidation = validateUUID(organizationId, 'Organization ID')
    const roleValidation = validateUUID(roleId, 'Role ID')
    
    if (!orgValidation.valid) {
      return NextResponse.json(
        { error: orgValidation.error },
        { status: 400 }
      )
    }
    
    if (!roleValidation.valid) {
      return NextResponse.json(
        { error: roleValidation.error },
        { status: 400 }
      )
    }

    // Get current user
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)

    // Check if user has permission to manage organization members
    const hasPermission = await checkOrganizationPermission(
      user.id,
      organizationId,
      'teamMembers',
      'manageAll'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update custom roles' },
        { status: 403 }
      )
    }

    // Check if role exists
    const existingRole = await prisma.customRole.findFirst({
      where: {
        id: roleId,
        organizationId,
      },
    })

    if (!existingRole) {
      return NextResponse.json(
        { error: 'Custom role not found' },
        { status: 404 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = customRoleUpdateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors
        },
        { status: 400 }
      )
    }

    const updateData = validation.data

    // If name is being updated, check for conflicts
    if (updateData.name && updateData.name !== existingRole.name) {
      const nameConflict = await prisma.customRole.findFirst({
        where: {
          organizationId,
          name: updateData.name,
          id: { not: roleId },
        },
      })

      if (nameConflict) {
        return NextResponse.json(
          { error: 'A role with this name already exists in the organization' },
          { status: 409 }
        )
      }
    }

    // Update the custom role
    const updatedRole = await prisma.customRole.update({
      where: {
        id: roleId,
      },
      data: updateData,
    })

    return NextResponse.json(updatedRole)
  } catch (error) {
    console.error('Error updating custom role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/organizations/[id]/roles/[roleId]
 * Delete a custom role
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; roleId: string } }
) {
  try {
    const { id: organizationId, roleId } = params

    // Validate UUIDs
    const orgValidation = validateUUID(organizationId, 'Organization ID')
    const roleValidation = validateUUID(roleId, 'Role ID')
    
    if (!orgValidation.valid) {
      return NextResponse.json(
        { error: orgValidation.error },
        { status: 400 }
      )
    }
    
    if (!roleValidation.valid) {
      return NextResponse.json(
        { error: roleValidation.error },
        { status: 400 }
      )
    }

    // Get current user
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)

    // Check if user has permission to manage organization members
    const hasPermission = await checkOrganizationPermission(
      user.id,
      organizationId,
      'teamMembers',
      'manageAll'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete custom roles' },
        { status: 403 }
      )
    }

    // Check if role exists
    const existingRole = await prisma.customRole.findFirst({
      where: {
        id: roleId,
        organizationId,
      },
    })

    if (!existingRole) {
      return NextResponse.json(
        { error: 'Custom role not found' },
        { status: 404 }
      )
    }

    // Delete the custom role
    await prisma.customRole.delete({
      where: {
        id: roleId,
      },
    })

    return NextResponse.json(
      { message: 'Custom role deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting custom role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}