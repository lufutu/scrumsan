import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
// Real-time updates are handled automatically by Supabase
import { z } from 'zod'

const taskUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  taskType: z.string().optional(),
  priority: z.string().optional(),
  storyPoints: z.number().optional(),
  estimatedHours: z.number().optional(),
  labels: z.array(z.object({
    id: z.string(),
    name: z.string(),
    color: z.string()
  })).optional(),
  boardId: z.string().uuid().optional(),
  columnId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  epicId: z.string().uuid().optional(),
  dueDate: z.string().optional(),
  position: z.number().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
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
        },
        taskLabels: {
          include: {
            label: true
          }
        },
        board: {
          select: {
            id: true,
            name: true,
            organizationId: true
          }
        },
        column: {
          select: {
            id: true,
            name: true
          }
        },
        epic: {
          select: {
            id: true,
            title: true
          }
        },
        comments: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        attachments: {
          select: {
            id: true,
            url: true,
            name: true,
            size: true,
            type: true,
            uploadedAt: true,
            uploadedByUser: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true
              }
            }
          }
        },
        _count: {
          select: {
            comments: true,
            attachments: true
          }
        }
      }
    })
    
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }
    
    // Check user access through organization membership
    if (!task.board) {
      return NextResponse.json(
        { error: 'Task board not found' },
        { status: 404 }
      )
    }
    
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: task.board.organizationId,
        userId: user.id
      }
    })
    
    const hasAccess = !!orgMember
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(task)
  } catch (error: any) {
    console.error('Error fetching task:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch task' },
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
    const validatedData = taskUpdateSchema.parse(body)
    
    // Get current user
    const user = await getCurrentUser(supabase)
    
    // Get existing task to check permissions
    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: {
        board: {
          select: {
            organizationId: true
          }
        }
      }
    })
    
    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }
    
    // Check user access through organization membership
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: existingTask.board!.organizationId,
        userId: user.id
      }
    })
    
    const hasAccess = !!orgMember
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Prepare update data
    const updateData: any = {}
    if (validatedData.title !== undefined) updateData.title = validatedData.title
    if (validatedData.description !== undefined) updateData.description = validatedData.description
    if (validatedData.status !== undefined) updateData.status = validatedData.status
    if (validatedData.taskType !== undefined) updateData.taskType = validatedData.taskType
    if (validatedData.priority !== undefined) updateData.priority = validatedData.priority
    if (validatedData.storyPoints !== undefined) updateData.storyPoints = validatedData.storyPoints
    if (validatedData.estimatedHours !== undefined) updateData.estimatedHours = validatedData.estimatedHours
    if (validatedData.boardId !== undefined) updateData.boardId = validatedData.boardId
    if (validatedData.columnId !== undefined) updateData.columnId = validatedData.columnId
    if (validatedData.assigneeId !== undefined) updateData.assigneeId = validatedData.assigneeId
    if (validatedData.epicId !== undefined) updateData.epicId = validatedData.epicId
    if (validatedData.dueDate !== undefined) updateData.dueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null
    if (validatedData.position !== undefined) updateData.position = validatedData.position

    // Handle labels separately using transaction
    if (validatedData.labels !== undefined) {
      // Delete existing label associations
      await prisma.taskLabel.deleteMany({
        where: { taskId: id }
      })
      
      // Create new label associations
      if (validatedData.labels.length > 0) {
        await prisma.taskLabel.createMany({
          data: validatedData.labels.map(label => ({
            taskId: id,
            labelId: label.id
          }))
        })
      }
    }
    
    // Update task
    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
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
        },
        taskLabels: {
          include: {
            label: true
          }
        },
        board: {
          select: {
            id: true,
            name: true
          }
        },
        column: {
          select: {
            id: true,
            name: true
          }
        },
        epic: {
          select: {
            id: true,
            title: true
          }
        },
        _count: {
          select: {
            comments: true,
            attachments: true
          }
        }
      }
    })
    
    // Real-time updates are automatically handled by Supabase when data changes
    
    return NextResponse.json(task)
  } catch (error: any) {
    console.error('Error updating task:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update task' },
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
    
    // Get existing task to check permissions
    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: {
        board: {
          select: {
            organizationId: true
          }
        }
      }
    })
    
    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }
    
    // Check user access through organization membership
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: existingTask.board!.organizationId,
        userId: user.id
      }
    })
    
    const hasAccess = !!orgMember
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Delete task (cascade will handle related data)
    await prisma.task.delete({
      where: { id }
    })
    
    // Real-time updates are automatically handled by Supabase when data changes
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting task:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete task' },
      { status: 500 }
    )
  }
}