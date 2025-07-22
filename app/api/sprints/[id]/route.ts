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
        sprintTasks: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
                description: true,
                priority: true,
                storyPoints: true,
                estimatedHours: true,
                assignee: {
                  select: {
                    id: true,
                    fullName: true,
                    avatarUrl: true
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
            }
          }
        },
        sprintColumns: {
          orderBy: { position: 'asc' }
        },
        _count: {
          select: {
            sprintTasks: true
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
        projectId: true
      }
    })
    
    if (!existingSprint) {
      return NextResponse.json(
        { error: 'Sprint not found' },
        { status: 404 }
      )
    }
    
    // Check if user is a member of the project (only if sprint has projectId)
    if (existingSprint.projectId) {
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId: existingSprint.projectId,
          userId: user.id
        }
      })
      
      if (!projectMember) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
    }
    
    // Prepare update data
    const updateData: any = {}
    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.goal !== undefined) updateData.goal = validatedData.goal
    if (validatedData.startDate !== undefined) updateData.startDate = validatedData.startDate ? new Date(validatedData.startDate) : null
    if (validatedData.endDate !== undefined) updateData.endDate = validatedData.endDate ? new Date(validatedData.endDate) : null
    
    // Update sprint
    const sprint = await prisma.sprint.update({
      where: { id },
      data: updateData,
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        sprintTasks: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
                storyPoints: true,
                assignee: {
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
            sprintTasks: true
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
        projectId: true
      }
    })
    
    if (!existingSprint) {
      return NextResponse.json(
        { error: 'Sprint not found' },
        { status: 404 }
      )
    }
    
    // Check if user is a member of the project (only if sprint has projectId)
    if (existingSprint.projectId) {
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId: existingSprint.projectId,
          userId: user.id
        }
      })
      
      if (!projectMember) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
    }
    
    // Delete sprint (cascade will handle related data)
    await prisma.sprint.delete({
      where: { id }
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