import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'

const sprintTaskSchema = z.object({
  taskIds: z.array(z.string().uuid()).optional(),
  taskId: z.string().uuid().optional(),
}).refine(data => data.taskIds || data.taskId, {
  message: "Either taskIds array or single taskId must be provided"
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await req.json()
    
    // Validate input
    const validatedData = sprintTaskSchema.parse(body)
    
    // Get current user
    const user = await getCurrentUser(supabase)
    
    // Get existing sprint to check permissions
    const existingSprint = await prisma.sprint.findUnique({
      where: { id },
      select: {
        boardId: true
      }
    })
    
    if (!existingSprint) {
      return NextResponse.json(
        { error: 'Sprint not found' },
        { status: 404 }
      )
    }
    
    // Check if user has access to the board through organization membership
    const board = await prisma.board.findUnique({
      where: { id: existingSprint.boardId },
      select: { organizationId: true }
    })
    
    if (board) {
      const orgMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId: board.organizationId,
          userId: user.id
        }
      })
      
      if (!orgMember) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
    }
    
    // Handle single task addition
    if (validatedData.taskId) {
      // Verify task belongs to the same board as the sprint
      const task = await prisma.task.findUnique({
        where: { id: validatedData.taskId },
        select: { boardId: true, sprintId: true }
      })
      
      if (!task || task.boardId !== existingSprint.boardId) {
        return NextResponse.json(
          { error: 'Task does not belong to this board' },
          { status: 400 }
        )
      }
      
      // Check if task is already in sprint
      if (task.sprintId === id) {
        return NextResponse.json({ error: 'Task already in sprint' }, { status: 400 })
      }
      
      // Get first sprint column to assign task to
      const firstSprintColumn = await prisma.sprintColumn.findFirst({
        where: { sprintId: id },
        orderBy: { position: 'asc' }
      })

      // Add task to sprint by updating task.sprintId and sprintColumnId
      await prisma.task.update({
        where: { id: validatedData.taskId },
        data: {
          sprintId: id,
          sprintColumnId: firstSprintColumn?.id || null
        }
      })
    } else if (validatedData.taskIds) {
      // Handle bulk task replacement (existing logic)
      const tasks = await prisma.task.findMany({
        where: {
          id: {
            in: validatedData.taskIds
          }
        },
        select: {
          id: true,
          boardId: true
        }
      })
      
      const invalidTasks = tasks.filter(task => task.boardId !== existingSprint.boardId)
      if (invalidTasks.length > 0) {
        return NextResponse.json(
          { error: 'Some tasks do not belong to this board' },
          { status: 400 }
        )
      }
      
      // Get first sprint column to assign tasks to
      const firstSprintColumn = await prisma.sprintColumn.findFirst({
        where: { sprintId: id },
        orderBy: { position: 'asc' }
      })

      // Replace sprint tasks using direct sprintId updates
      await prisma.$transaction(async (tx) => {
        // Remove existing tasks from sprint
        await tx.task.updateMany({
          where: {
            sprintId: id
          },
          data: {
            sprintId: null,
            sprintColumnId: null
          }
        })
        
        // Add new tasks to sprint
        if (validatedData.taskIds!.length > 0) {
          await tx.task.updateMany({
            where: {
              id: { in: validatedData.taskIds! }
            },
            data: {
              sprintId: id,
              sprintColumnId: firstSprintColumn?.id || null
            }
          })
        }
      })
    }
    
    // Return updated sprint with tasks
    const sprint = await prisma.sprint.findUnique({
      where: { id },
      include: {
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
            taskLabels: {
              include: {
                label: true
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
    console.error('Error updating sprint tasks:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update sprint tasks' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sprintId } = await params
    const { searchParams } = new URL(req.url)
    const taskId = searchParams.get('taskId')
    
    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })
    }
    
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    // Check if user has access to the sprint
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      select: { boardId: true }
    })
    
    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
    }
    
    // Check if user has access to the board through organization membership
    const board = await prisma.board.findUnique({
      where: { id: sprint.boardId },
      select: { organizationId: true }
    })
    
    if (board) {
      const orgMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId: board.organizationId,
          userId: user.id
        }
      })
      
      if (!orgMember) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }
    
    // Remove task from sprint by clearing sprintId
    await prisma.task.update({
      where: { id: taskId },
      data: {
        sprintId: null,
        sprintColumnId: null
      }
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error removing task from sprint:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to remove task from sprint' },
      { status: 500 }
    )
  }
}