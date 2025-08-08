import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { TaskNotificationTriggers } from '@/lib/notification-triggers'
import { TaskActivityTriggers } from '@/lib/activity-service'

const createTasksFromAISchema = z.object({
  tasks: z.array(z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    taskType: z.string().default('story'),
    priority: z.string().default('medium'),
    storyPoints: z.number().nullable().optional(),
    estimatedHours: z.number().nullable().optional(),
    labels: z.array(z.string()).optional(),
    assigneeId: z.string().uuid().nullable().optional(),
    acceptanceCriteria: z.array(z.string()).optional(),
    sprintRecommendation: z.string().optional(),
    reasoning: z.string().optional()
  })),
  boardId: z.string().uuid(),
  columnId: z.string().uuid().optional(),
  sprintId: z.string().uuid().optional(),
  sprintColumnId: z.string().uuid().optional(),
  position: z.number().optional()
})

export async function POST(req: NextRequest) {
  try {
    // Authentication
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request
    const body = await req.json()
    const { tasks, boardId, columnId, sprintId, sprintColumnId, position } = createTasksFromAISchema.parse(body)

    logger.log('AI Create Tasks API: Request received', {
      userId: user.id,
      taskCount: tasks.length,
      boardId,
      columnId,
      sprintId
    })

    // Verify board access
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        organization: {
          members: {
            some: { userId: user.id }
          }
        }
      },
      select: {
        id: true,
        organizationId: true,
        boardType: true
      }
    })

    if (!board) {
      return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 })
    }

    // Get next position for tasks if not specified
    let nextPosition = position
    if (nextPosition === undefined) {
      const lastTask = await prisma.task.findFirst({
        where: {
          boardId,
          ...(columnId ? { columnId } : {}),
          ...(sprintId ? { sprintId } : {}),
          ...(sprintColumnId ? { sprintColumnId } : {})
        },
        orderBy: { position: 'desc' },
        select: { position: true }
      })
      nextPosition = (lastTask?.position || 0) + 1
    }

    // Create tasks in database
    const createdTasks = []
    
    for (let i = 0; i < tasks.length; i++) {
      const taskData = tasks[i]
      
      // Generate item code
      const boardInitials = board.organizationId.substring(0, 2).toUpperCase()
      const taskCount = await prisma.task.count({ where: { boardId } })
      const itemCode = `${boardInitials}-${taskCount + i + 1}`

      // Create task
      const task = await prisma.task.create({
        data: {
          title: taskData.title,
          description: taskData.description || '',
          itemCode,
          taskType: taskData.taskType,
          priority: taskData.priority,
          storyPoints: taskData.storyPoints,
          estimatedHours: taskData.estimatedHours,
          boardId,
          columnId,
          sprintId,
          sprintColumnId,
          position: nextPosition + i,
          createdBy: user.id,
          acceptanceCriteria: taskData.acceptanceCriteria || [],
          // Store AI reasoning in metadata for now
          metadata: {
            aiGenerated: true,
            reasoning: taskData.reasoning,
            sprintRecommendation: taskData.sprintRecommendation
          }
        },
        include: {
          assignees: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  avatarUrl: true
                }
              }
            }
          },
          labels: {
            include: {
              label: true
            }
          },
          creator: {
            select: {
              id: true,
              fullName: true,
              email: true,
              avatarUrl: true
            }
          }
        }
      })

      // Handle assignee if specified
      if (taskData.assigneeId) {
        await prisma.taskAssignee.create({
          data: {
            taskId: task.id,
            userId: taskData.assigneeId,
            assignedBy: user.id
          }
        })
      }

      // Handle labels if specified
      if (taskData.labels && taskData.labels.length > 0) {
        // Get or create labels
        for (const labelName of taskData.labels) {
          const label = await prisma.boardLabel.upsert({
            where: {
              boardId_name: {
                boardId,
                name: labelName
              }
            },
            create: {
              boardId,
              name: labelName,
              color: '#3B82F6', // Default blue color
              createdBy: user.id
            },
            update: {}
          })

          await prisma.taskLabel.create({
            data: {
              taskId: task.id,
              labelId: label.id
            }
          })
        }
      }

      createdTasks.push(task)

      // Trigger notifications and activities
      try {
        await Promise.all([
          TaskNotificationTriggers.onTaskCreated(task, user.id),
          TaskActivityTriggers.onTaskCreated(task, user.id)
        ])
      } catch (notificationError) {
        logger.error('Failed to trigger task notifications', notificationError)
        // Don't fail the request for notification errors
      }
    }

    logger.log('AI Create Tasks API: Successfully created tasks', {
      userId: user.id,
      taskCount: createdTasks.length,
      boardId
    })

    return NextResponse.json({
      success: true,
      data: {
        tasks: createdTasks,
        count: createdTasks.length
      }
    })

  } catch (error) {
    logger.error('AI Create Tasks API: Error', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create tasks. Please try again.' },
      { status: 500 }
    )
  }
}