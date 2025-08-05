import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'
import { commonFields, parseQueryParams, permissionSetCreateSchema } from '@/lib/validation-schemas'
import { resolveOrganization } from '@/lib/slug-resolver'
import { createErrorResponse } from '@/lib/api-auth-utils'
import { validatePermissionDependencies } from '@/lib/permission-utils'

const permissionSetFilterSchema = z.object({
  search: z.string().optional(),
  includeDefault: z.coerce.boolean().default(true),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organizationSlugOrId } = await params
    
    // Resolve organization by slug or UUID
    const orgResult = await resolveOrganization(organizationSlugOrId)
    if (!orgResult.success) {
      return createErrorResponse(orgResult.error, orgResult.status)
    }
    
    const organizationId = orgResult.entity.id

    // Get current user
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)

    // Check permissions - admin level required to view permission sets
    await checkOrganizationPermission(organizationId, user.id, 'admin')

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams
    const filterResult = parseQueryParams(searchParams, permissionSetFilterSchema)
    
    if (!filterResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: filterResult.error.errors },
        { status: 400 }
      )
    }

    const { search, includeDefault, page, limit } = filterResult.data

    // Build where clause for filtering
    const where: unknown = {
      organizationId,
    }

    if (!includeDefault) {
      where.isDefault = false
    }

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      }
    }

    // Get total count for pagination
    const totalCount = await prisma.permissionSet.count({ where })

    // Get permission sets with pagination
    const permissionSets = await prisma.permissionSet.findMany({
      where,
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
      orderBy: [
        { isDefault: 'desc' }, // Default sets first
        { name: 'asc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
    })

    return NextResponse.json({
      permissionSets,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error: unknown) {
    console.error('Error fetching permission sets:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: error instanceof Error && error.message.includes('Access denied') ? 403 : 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organizationSlugOrId } = await params
    
    // Resolve organization by slug or UUID
    const orgResult = await resolveOrganization(organizationSlugOrId)
    if (!orgResult.success) {
      return createErrorResponse(orgResult.error, orgResult.status)
    }
    
    const organizationId = orgResult.entity.id

    // Get current user
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)

    // Check permissions - admin level required to create permission sets
    await checkOrganizationPermission(organizationId, user.id, 'admin')

    // Parse and validate request body
    const body = await req.json()
    const validationResult = permissionSetCreateSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { name, permissions } = validationResult.data

    // Validate permission dependencies
    const dependencyErrors = validatePermissionDependencies(permissions)
    if (dependencyErrors.length > 0) {
      return NextResponse.json(
        { error: 'Permission dependency validation failed', details: dependencyErrors },
        { status: 400 }
      )
    }

    // Check if permission set name already exists in the organization
    const existingPermissionSet = await prisma.permissionSet.findFirst({
      where: {
        organizationId,
        name,
      },
    })

    if (existingPermissionSet) {
      return NextResponse.json(
        { error: 'A permission set with this name already exists' },
        { status: 409 }
      )
    }

    // Create permission set
    const newPermissionSet = await prisma.permissionSet.create({
      data: {
        organizationId,
        name,
        permissions,
        isDefault: false,
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

    return NextResponse.json(newPermissionSet, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating permission set:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: error instanceof Error && error.message.includes('Access denied') ? 403 : 500 }
    )
  }
}