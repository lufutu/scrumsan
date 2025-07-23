import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'

const sprintUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  goal: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['planning', 'active', 'completed']).optional(),
  position: z.number().optional(),
  maxColumns: z.number().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    const sprint = await prisma.sprint.findUnique({
      where: { id },
      include: {
        board: {
          select: {
            id: true,
            name: true,
            organizationId: true
          }
        },
        tasks: {
          select: {
            id: true,
            title: true,
            description: true,
            priority: true,
            storyPoints: true,
            estimatedHours: true,
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
            creator: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true
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
    
    // Check if user has access to the sprint's board organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: sprint.board.organizationId,
        userId: user.id
      }
    })
    
    if (!orgMember) {
      return NextResponse.json({ error: 'Not authorized to access this sprint' }, { status: 403 })
    }
    
    return NextResponse.json(sprint)
  } catch (error: any) {
    console.error('Error fetching sprint:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sprint' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await req.json()
    
    // Validate input
    const validatedData = sprintUpdateSchema.parse(body)
    
    // Get current user
    const user = await getCurrentUser(supabase)
    
    // Get existing sprint to check permissions
    const existingSprint = await prisma.sprint.findUnique({
      where: { id },
      select: {
        boardId: true,
        isBacklog: true,
        status: true,
        board: {
          select: {
            organizationId: true
          }
        }
      }
    })
    
    if (!existingSprint) {
      return NextResponse.json(
        { error: 'Sprint not found' },
        { status: 404 }
      )
    }
    
    // Check if user is a member of the organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: existingSprint.board.organizationId,
        userId: user.id
      }
    })
    
    if (!orgMember) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Prevent updating backlog sprint
    if (existingSprint.isBacklog && (validatedData.name || validatedData.status)) {
      return NextResponse.json(
        { error: 'Cannot modify the Backlog sprint' },
        { status: 400 }
      )
    }
    
    // Check if trying to start a sprint when another is active
    if (validatedData.status === 'active' && existingSprint.status !== 'active') {
      const activeSprint = await prisma.sprint.findFirst({
        where: {
          boardId: existingSprint.boardId,
          status: 'active',
          isDeleted: false
        }
      })
      
      if (activeSprint) {
        return NextResponse.json(
          { error: 'Another sprint is already active. Please finish it before starting a new one.' },
          { status: 400 }
        )
      }
    }
    
    // Prepare update data
    const updateData: any = {}
    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.goal !== undefined) updateData.goal = validatedData.goal
    if (validatedData.startDate !== undefined) updateData.startDate = validatedData.startDate ? new Date(validatedData.startDate) : null
    if (validatedData.endDate !== undefined) updateData.endDate = validatedData.endDate ? new Date(validatedData.endDate) : null
    if (validatedData.status !== undefined) updateData.status = validatedData.status
    if (validatedData.position !== undefined) updateData.position = validatedData.position
    if (validatedData.maxColumns !== undefined) updateData.maxColumns = validatedData.maxColumns
    
    // Update sprint
    const sprint = await prisma.sprint.update({
      where: { id },
      data: updateData,
      include: {
        board: {
          select: {
            id: true,
            name: true
          }
        },
        sprintColumns: {
          orderBy: { position: 'asc' }
        },
        tasks: {
          select: {
            id: true,
            title: true,
            storyPoints: true,
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
            }
          }
        },
        _count: {
          select: {
            tasks: true
          }
        }
      }
    })
    
    return NextResponse.json(sprint)
  } catch (error: any) {
    console.error('Error updating sprint:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update sprint' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    // Get existing sprint to check permissions
    const existingSprint = await prisma.sprint.findUnique({
      where: { id },
      select: {
        boardId: true,
        isBacklog: true,
        board: {
          select: {
            organizationId: true
          }
        }
      }
    })
    
    if (!existingSprint) {
      return NextResponse.json(
        { error: 'Sprint not found' },
        { status: 404 }
      )
    }
    
    // Prevent deleting backlog sprint
    if (existingSprint.isBacklog) {
      return NextResponse.json(
        { error: 'Cannot delete the Backlog sprint' },
        { status: 400 }
      )
    }
    
    // Check if user is a member of the organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: existingSprint.board.organizationId,
        userId: user.id
      }
    })
    
    if (!orgMember) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Soft delete sprint
    await prisma.sprint.update({
      where: { id },
      data: { isDeleted: true }
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting sprint:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete sprint' },
      { status: 500 }
    )
  }
}