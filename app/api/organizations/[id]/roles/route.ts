import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { customRoleCreateSchema, validateUUID } from '@/lib/validation-schemas'
import { checkOrganizationPermission } from '@/lib/permission-utils'

/**
 * GET /api/organizations/[id]/roles
 * List all custom roles for an organization
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organizationId } = await params

    // Validate organization ID format
    const uuidValidation = validateUUID(organizationId, 'Organization ID')
    if (!uuidValidation.valid) {
      return NextResponse.json(
        { error: uuidValidation.error },
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

    // Fetch custom roles for the organization
    const customRoles = await prisma.customRole.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return NextResponse.json(customRoles)
  } catch (error) {
    console.error('Error fetching custom roles:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/organizations/[id]/roles
 * Create a new custom role for an organization
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organizationId } = await params

    // Validate organization ID format
    const uuidValidation = validateUUID(organizationId, 'Organization ID')
    if (!uuidValidation.valid) {
      return NextResponse.json(
        { error: uuidValidation.error },
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
        { error: 'Insufficient permissions to create custom roles' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = customRoleCreateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors
        },
        { status: 400 }
      )
    }

    const { name, color } = validation.data

    // Check if role name already exists in this organization
    const existingRole = await prisma.customRole.findFirst({
      where: {
        organizationId,
        name,
      },
    })

    if (existingRole) {
      return NextResponse.json(
        { error: 'A role with this name already exists in the organization' },
        { status: 409 }
      )
    }

    // Create the custom role
    const customRole = await prisma.customRole.create({
      data: {
        organizationId,
        name,
        color,
      },
    })

    return NextResponse.json(customRole, { status: 201 })
  } catch (error) {
    console.error('Error creating custom role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}