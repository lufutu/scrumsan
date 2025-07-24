import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'

const updateSprintSchema = z.object({
  name: z.string().min(1).optional(),
  goal: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['planning', 'active', 'completed']).optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { id: sprintId } = await params

    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        board: {
          select: {
            id: true,
            name: true,
            organizationId: true
          }
        },
        tasks: {
          include: {
            taskAssignees: {
              select: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    avatarUrl: true
                  }
                }
              }
            },
            taskLabels: {
              select: {
                label: {
                  select: {
                    id: true,
                    color: true,
                    name: true
                  }
                }
              }
            }
          }
        },
        sprintColumns: {
          orderBy: { position: 'asc' }
        },
        _count: {
          select: {
            tasks: true
          }
        }
      }
    })

    if (!sprint) {
      return NextResponse.json(
        { error: 'Sprint not found' },
        { status: 404 }
      )
    }

    // Check if user is a member of the organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: sprint.board.organizationId,
        userId: user.id
      }
    })

    if (!orgMember) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    return NextResponse.json(sprint)
  } catch (error: unknown) {
    console.error('Error fetching sprint:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch sprint' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { id: sprintId } = await params
    const body = await req.json()

    // Validate input
    const validatedData = updateSprintSchema.parse(body)

    // Get the sprint and verify access
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        board: {
          include: {
            organization: true
          }
        }
      }
    })

    if (!sprint) {
      return NextResponse.json(
        { error: 'Sprint not found' },
        { status: 404 }
      )
    }

    // Check if user is a member of the organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: sprint.board.organizationId,
        userId: user.id
      }
    })

    if (!orgMember) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Update the sprint
    const updatedSprint = await prisma.sprint.update({
      where: { id: sprintId },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.goal !== undefined && { goal: validatedData.goal }),
        ...(validatedData.startDate && { startDate: new Date(validatedData.startDate) }),
        ...(validatedData.endDate && { endDate: new Date(validatedData.endDate) }),
        ...(validatedData.status && { status: validatedData.status }),
      },
      include: {
        board: {
          select: {
            id: true,
            name: true,
            organizationId: true
          }
        },
        tasks: {
          include: {
            taskAssignees: {
              select: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    avatarUrl: true
                  }
                }
              }
            },
            taskLabels: {
              select: {
                label: {
                  select: {
                    id: true,
                    color: true,
                    name: true
                  }
                }
              }
            }
          }
        },
        sprintColumns: {
          orderBy: { position: 'asc' }
        },
        _count: {
          select: {
            tasks: true
          }
        }
      }
    })

    return NextResponse.json(updatedSprint)
  } catch (error: unknown) {
    console.error('Error updating sprint:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update sprint' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { id: sprintId } = await params

    // Get the sprint and verify access
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        board: {
          include: {
            organization: true
          }
        }
      }
    })

    if (!sprint) {
      return NextResponse.json(
        { error: 'Sprint not found' },
        { status: 404 }
      )
    }

    // Check if user is a member of the organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: sprint.board.organizationId,
        userId: user.id
      }
    })

    if (!orgMember) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Soft delete the sprint
    await prisma.sprint.update({
      where: { id: sprintId },
      data: { isDeleted: true }
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error deleting sprint:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete sprint' },
      { status: 500 }
    )
  }
}