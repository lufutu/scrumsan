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
    
    // Handle single task addition
    if (validatedData.taskId) {
      // Check if task is already in sprint
      const existingSprintTask = await prisma.sprintTask.findFirst({
        where: {
          sprintId: id,
          taskId: validatedData.taskId
        }
      })
      
      if (existingSprintTask) {
        return NextResponse.json({ error: 'Task already in sprint' }, { status: 400 })
      }
      
      // Verify task belongs to the same project
      const task = await prisma.task.findUnique({
        where: { id: validatedData.taskId },
        select: { projectId: true }
      })
      
      if (!task || task.projectId !== existingSprint.projectId) {
        return NextResponse.json(
          { error: 'Task does not belong to this project' },
          { status: 400 }
        )
      }
      
      // Add task to sprint
      await prisma.sprintTask.create({
        data: {
          sprintId: id,
          taskId: validatedData.taskId
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
          projectId: true
        }
      })
      
      const invalidTasks = tasks.filter(task => task.projectId !== existingSprint.projectId)
      if (invalidTasks.length > 0) {
        return NextResponse.json(
          { error: 'Some tasks do not belong to this project' },
          { status: 400 }
        )
      }
      
      // Remove existing sprint tasks and add new ones
      await prisma.$transaction(async (tx) => {
        // Remove existing tasks from sprint
        await tx.sprintTask.deleteMany({
          where: {
            sprintId: id
          }
        })
        
        // Add new tasks to sprint
        if (validatedData.taskIds!.length > 0) {
          await tx.sprintTask.createMany({
            data: validatedData.taskIds!.map(taskId => ({
              sprintId: id,
              taskId: taskId
            }))
          })
        }
      })
    }
    
    // Return updated sprint with tasks
    const sprint = await prisma.sprint.findUnique({
      where: { id },
      include: {
        sprintTasks: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
                description: true,
                status: true,
                priority: true,
                storyPoints: true,
                estimatedHours: true,
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
      select: { projectId: true }
    })
    
    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
    }
    
    if (sprint.projectId) {
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId: sprint.projectId,
          userId: user.id
        }
      })
      
      if (!projectMember) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }
    
    // Remove task from sprint
    await prisma.sprintTask.deleteMany({
      where: {
        sprintId: sprintId,
        taskId: taskId
      }
    })
    
    // Clear sprint column assignment
    await prisma.task.update({
      where: { id: taskId },
      data: {
        sprintColumnId: null,
        status: 'todo'
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