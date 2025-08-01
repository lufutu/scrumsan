import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
// Real-time updates are handled automatically by Supabase
import { z } from 'zod'
import { TaskNotificationTriggers } from '@/lib/notification-triggers'
import { TaskActivityTriggers } from '@/lib/activity-service'

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  taskType: z.string().optional(),
  priority: z.string().optional(),
  storyPoints: z.number().optional(),
  effortUnits: z.number().optional(),
  estimationType: z.enum(['story_points', 'effort_units']).optional(),
  itemValue: z.string().optional(),
  estimatedHours: z.number().optional(),
  labels: z.array(z.string()).optional(), // Array of label IDs for junction table
  assignees: z.array(z.object({
    id: z.string()
  })).optional(),
  reviewers: z.array(z.object({
    id: z.string()
  })).optional(),
  customFieldValues: z.array(z.object({
    customFieldId: z.string(),
    value: z.string()
  })).optional(),
  boardId: z.string().uuid().optional(),
  columnId: z.string().uuid().optional().nullable(), // Allow null
  sprintId: z.string().uuid().optional(), // Add sprint ID support
  sprintColumnId: z.string().uuid().optional(), // Add sprint column ID support
  epicId: z.string().uuid().optional(),
  dueDate: z.string().optional(),
  position: z.number().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    const url = new URL(req.url)
    const boardId = url.searchParams.get('boardId')
    const assigneeId = url.searchParams.get('assigneeId')
    
    const whereClause: any = {}
    
    // Filter by board if provided
    if (boardId) {
      whereClause.boardId = boardId
    }
    
    // Filter by assignee if provided (using junction table)
    if (assigneeId) {
      whereClause.taskAssignees = {
        some: {
          userId: assigneeId
        }
      }
    }
    
    // Add user access check - user must be member of organization
    if (boardId) {
      // Check board access
      const board = await prisma.board.findUnique({
        where: { id: boardId },
        select: {
          organizationId: true
        }
      })
      
      if (!board) {
        return NextResponse.json(
          { error: 'Board not found' },
          { status: 404 }
        )
      }
      
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
    
    const tasks = await prisma.task.findMany({
      where: whereClause,
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
        },
        creator: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true
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
        sprintColumn: {
          select: {
            id: true,
            name: true,
            isDone: true
          }
        },
        epic: {
          select: {
            id: true,
            title: true
          }
        },
        subtasks: {
          select: {
            id: true,
            title: true
          }
        },
        // Include relation data to avoid separate API calls
        parent: {
          select: {
            id: true,
            title: true,
            taskType: true,
            itemCode: true
          }
        },
        relationsAsTarget: {
          where: {
            relationType: 'blocks'
          },
          select: {
            sourceTask: {
              select: {
                id: true,
                title: true,
                taskType: true,
                itemCode: true
              }
            }
          }
        },
        relationsAsSource: {
          where: {
            relationType: 'blocks'
          },
          select: {
            targetTask: {
              select: {
                id: true,
                title: true,
                taskType: true,
                itemCode: true
              }
            }
          }
        },
        _count: {
          select: {
            comments: true,
            attachments: true,
            subtasks: true,
            relationsAsSource: true,
            relationsAsTarget: true
          }
        }
      },
      orderBy: [
        { position: 'asc' },
        { createdAt: 'desc' }
      ]
    })
    
    // Map tasks to include the 'done' attribute based on sprint column isDone
    const tasksWithDoneStatus = tasks.map(task => ({
      ...task,
      done: task.sprintColumn?.isDone || false
    }))
    
    return NextResponse.json(tasksWithDoneStatus)
  } catch (error: unknown) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await req.json()
    
    // Validate input
    const validatedData = taskSchema.parse(body)
    
    // Get current user
    const user = await getCurrentUser(supabase)
    
    // Check user access based on board/project
    if (validatedData.boardId) {
      const board = await prisma.board.findUnique({
        where: { id: validatedData.boardId },
        select: {
          organizationId: true
        }
      })
      
      if (!board) {
        return NextResponse.json(
          { error: 'Board not found' },
          { status: 404 }
        )
      }
      
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
    
    // If task is assigned to a sprint but no sprint column specified, assign to first sprint column
    let sprintColumnId = validatedData.sprintColumnId
    if (validatedData.sprintId && !sprintColumnId) {
      const firstSprintColumn = await prisma.sprintColumn.findFirst({
        where: { sprintId: validatedData.sprintId },
        orderBy: { position: 'asc' }
      })
      if (firstSprintColumn) {
        sprintColumnId = firstSprintColumn.id
      }
    }
    
    // Create task
    const task = await prisma.task.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        taskType: validatedData.taskType || 'story',
        priority: validatedData.priority,
        storyPoints: validatedData.storyPoints,
        effortUnits: validatedData.effortUnits,
        estimationType: validatedData.estimationType || 'story_points',
        itemValue: validatedData.itemValue,
        estimatedHours: validatedData.estimatedHours || 0,
        boardId: validatedData.boardId,
        columnId: validatedData.columnId,
        sprintColumnId: sprintColumnId, // Use calculated sprint column ID
        sprintId: validatedData.sprintId, // Add sprint ID
        epicId: validatedData.epicId,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        position: validatedData.position,
        createdBy: user.id
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
        },
        taskLabels: {
          select: {
            label: {
              select: {
                id: true,
                name: true,
                color: true
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
        sprintColumn: {
          select: {
            id: true,
            name: true,
            isDone: true
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
            attachments: true,
            subtasks: true
          }
        }
      }
    })

    // Handle multiple assignees
    if (validatedData.assignees && validatedData.assignees.length > 0) {
      await prisma.taskAssignee.createMany({
        data: validatedData.assignees.map(assignee => ({
          taskId: task.id,
          userId: assignee.id
        })),
        skipDuplicates: true
      })
    }

    // Handle multiple reviewers
    if (validatedData.reviewers && validatedData.reviewers.length > 0) {
      await prisma.taskReviewer.createMany({
        data: validatedData.reviewers.map(reviewer => ({
          taskId: task.id,
          userId: reviewer.id
        })),
        skipDuplicates: true
      })
    }

    // Handle labels via junction table
    if (validatedData.labels && validatedData.labels.length > 0) {
      await prisma.taskLabel.createMany({
        data: validatedData.labels.map(labelId => ({
          taskId: task.id,
          labelId: labelId
        })),
        skipDuplicates: true
      })
    }

    // Handle custom field values
    if (validatedData.customFieldValues && validatedData.customFieldValues.length > 0) {
      await prisma.taskCustomFieldValue.createMany({
        data: validatedData.customFieldValues.map(fieldValue => ({
          taskId: task.id,
          customFieldId: fieldValue.customFieldId,
          value: fieldValue.value
        })),
        skipDuplicates: true
      })
    }

    // Sprint assignment is already handled by the sprintId field in the task creation above

    // Trigger notifications and activities for task creation and assignments
    try {
      // Get the board's organization ID for notifications
      const taskBoard = await prisma.board.findUnique({
        where: { id: task.boardId },
        select: { organizationId: true }
      })

      if (taskBoard) {
        // Record task creation activity
        await TaskActivityTriggers.onTaskCreated(task.id, user.id)

        // Notify about task creation
        await TaskNotificationTriggers.onTaskCreated(
          task.id,
          user.id,
          taskBoard.organizationId
        )

        // Handle assignees
        if (validatedData.assignees && validatedData.assignees.length > 0) {
          for (const assignee of validatedData.assignees) {
            // Record assignment activity
            await TaskActivityTriggers.onTaskAssigned(
              task.id,
              assignee.id,
              user.id,
              task.title,
              true
            )

            // Send assignment notification
            await TaskNotificationTriggers.onTaskAssigned(
              task.id,
              assignee.id,
              user.id,
              taskBoard.organizationId,
              task.title
            )
          }
        }

        // Record label activities
        if (validatedData.labels && validatedData.labels.length > 0) {
          const labelData = await prisma.label.findMany({
            where: { id: { in: validatedData.labels } },
            select: { name: true, color: true }
          })
          
          for (const label of labelData) {
            await TaskActivityTriggers.onLabelAdded(
              task.id,
              user.id,
              label.name,
              label.color || undefined
            )
          }

          // Send label notification
          await TaskNotificationTriggers.onTaskLabeled(
            task.id,
            labelData.map(l => l.name),
            user.id,
            taskBoard.organizationId,
            task.title
          )
        }

        // Check for mentions in title or description
        const textToCheck = `${task.title} ${task.description || ''}`
        if (textToCheck.includes('@')) {
          await TaskNotificationTriggers.onTaskCommented(
            task.id,
            textToCheck,
            user.id,
            taskBoard.organizationId,
            task.title
          )
        }
      }
    } catch (error) {
      // Don't fail the task creation if notifications/activities fail
      console.error('Error sending task creation notifications/activities:', error)
    }

    // Real-time updates are automatically handled by Supabase when data changes

    // Add done attribute based on sprint column isDone status
    const taskWithDoneStatus = {
      ...task,
      done: task.sprintColumn?.isDone || false
    }

    return NextResponse.json(taskWithDoneStatus)
  } catch (error: unknown) {
    console.error('Error creating task:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create task' },
      { status: 500 }
    )
  }
}