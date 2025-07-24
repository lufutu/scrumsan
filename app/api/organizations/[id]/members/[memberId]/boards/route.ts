import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { validateUUID } from '@/lib/validation-schemas'

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

    // Check permissions - admin level required to manage member board access
    const currentMember = await checkOrganizationPermission(organizationId, user.id, 'admin')

    // Get the target member
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
      },
    })

    if (!targetMember) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Get all boards in the organization where the current user has admin access
    // and the target member might have access through project memberships
    const boards = await prisma.board.findMany({
      where: {
        organizationId,
        OR: [
          // Boards created by current user
          { createdBy: user.id },
          // Boards in organization where current user is admin/owner
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
      include: {
        projectLinks: {
          include: {
            project: {
              include: {
                members: {
                  where: {
                    userId: targetMember.userId,
                  },
                  select: {
                    id: true,
                    role: true,
                    joinedAt: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            tasks: true,
            sprints: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Filter boards to only include those where the target member has access
    const accessibleBoards = boards.filter(board => {
      // Check if member has access through project membership
      return board.projectLinks.some(link => 
        link.project.members.length > 0
      )
    }).map(board => ({
      id: board.id,
      name: board.name,
      description: board.description,
      boardType: board.boardType,
      color: board.color,
      taskCount: board._count.tasks,
      sprintCount: board._count.sprints,
      projectAccess: board.projectLinks
        .filter(link => link.project.members.length > 0)
        .map(link => ({
          projectId: link.project.id,
          projectName: link.project.name,
          memberRole: link.project.members[0]?.role,
          joinedAt: link.project.members[0]?.joinedAt,
        })),
    }))

    return NextResponse.json({
      boards: accessibleBoards,
      targetMember: {
        id: targetMember.id,
        user: targetMember.user,
        role: targetMember.role,
      },
      canRemoveFrom: accessibleBoards.length,
    })
  } catch (error: unknown) {
    console.error('Error fetching member boards:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: error instanceof Error && error.message.includes('Access denied') ? 403 : 
               error instanceof Error && error.message.includes('not found') ? 404 : 500 }
    )
  }
}