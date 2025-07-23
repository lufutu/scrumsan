import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'

const subtaskSchema = z.object({
  title: z.string().min(1).max(500),
  taskType: z.enum(['story', 'improvement', 'bug', 'task', 'note', 'idea']).default('task'),
  description: z.string().optional(),
  assigneeId: z.string().uuid().optional(),
  priority: z.string().optional(),
  storyPoints: z.number().optional()
})

// POST /api/tasks/[id]/subtasks - Create a new subtask
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { id: parentTaskId } = await params
    const body = await req.json()
    
    const validatedData = subtaskSchema.parse(body)

    // Verify parent task exists and user has access
    const parentTask = await prisma.task.findUnique({
      where: { id: parentTaskId },
      include: {
        board: {
          select: {
            id: true,
            name: true,
            organizationId: true,
            columns: {
              orderBy: { position: 'asc' },
              take: 1
            }
          }
        },
        sprint: {
          select: {
            id: true,
            status: true
          }
        }
      }
    })

    if (!parentTask) {
      return NextResponse.json(
        { error: 'Parent task not found' },
        { status: 404 }
      )
    }

    // Check access to organization
    if (parentTask.board?.organizationId) {
      const orgMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId: parentTask.board.organizationId,
          userId: user.id
        }
      })
      
      if (!orgMember) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get next item code for this board
    const boardTasksCount = await prisma.task.count({
      where: {
        boardId: parentTask.boardId
      }
    })
    
    // Use board name initials or default to 'TASK'
    const boardName = parentTask.board?.name || 'Task'
    const prefix = boardName
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 4) || 'TASK'
    
    const itemCode = `${prefix}-${boardTasksCount + 1}`

    // Get the max position in the parent's column
    const maxPositionTask = await prisma.task.findFirst({
      where: {
        boardId: parentTask.boardId,
        columnId: parentTask.columnId,
        sprintColumnId: parentTask.sprintColumnId
      },
      orderBy: { position: 'desc' },
      select: { position: true }
    })
    
    const newPosition = (maxPositionTask?.position ?? -1) + 1

    // Create the subtask with same column and sprint column as parent
    const subtask = await prisma.task.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        taskType: validatedData.taskType,
        boardId: parentTask.boardId,
        columnId: parentTask.columnId,
        sprintColumnId: parentTask.sprintColumnId,
        sprintId: parentTask.sprintId, // Include sprint ID from parent
        parentId: parentTaskId,
        priority: validatedData.priority,
        storyPoints: validatedData.storyPoints,
        itemCode,
        createdBy: user.id,
        position: newPosition
      },
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
        }
      }
    })

    // Create assignee relationship if provided
    if (validatedData.assigneeId) {
      await prisma.taskAssignee.create({
        data: {
          taskId: subtask.id,
          userId: validatedData.assigneeId
        }
      })
      
      // Refetch the subtask with assignee data
      const updatedSubtask = await prisma.task.findUnique({
        where: { id: subtask.id },
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
          }
        }
      })
      
      return NextResponse.json(updatedSubtask)
    }

    return NextResponse.json(subtask)
  } catch (error: unknown) {
    console.error('Error creating subtask:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create subtask' },
      { status: 500 }
    )
  }
}