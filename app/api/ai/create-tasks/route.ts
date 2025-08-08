import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { TaskNotificationTriggers } from '@/lib/notification-triggers'
import { TaskActivityTriggers } from '@/lib/activity-service'
import { DatabaseTaskSchema, prepareTaskForDatabase } from '@/lib/ai/database-schemas'

const createTasksFromAISchema = z.object({
  tasks: z.array(DatabaseTaskSchema),
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

    // Get the current max item code number for this board
    const boardInitials = board.organizationId.substring(0, 2).toUpperCase()
    const lastTaskWithCode = await prisma.task.findFirst({
      where: {
        boardId,
        itemCode: {
          startsWith: `${boardInitials}-`
        }
      },
      orderBy: { itemCode: 'desc' },
      select: { itemCode: true }
    })

    // Extract the highest number from existing item codes
    let baseCodeNumber = 0
    if (lastTaskWithCode?.itemCode) {
      const match = lastTaskWithCode.itemCode.match(/\d+$/)
      if (match) {
        baseCodeNumber = parseInt(match[0], 10)
      }
    }

    // Create tasks in database
    const createdTasks = []
    
    for (let i = 0; i < tasks.length; i++) {
      const aiTask = tasks[i]
      
      // Generate unique item code with retry logic
      let itemCode = `${boardInitials}-${baseCodeNumber + i + 1}`
      let retryCount = 0
      const maxRetries = 10
      
      while (retryCount < maxRetries) {
        try {
          // Check if this item code already exists
          const existingTask = await prisma.task.findUnique({
            where: { itemCode },
            select: { id: true }
          })
          
          if (!existingTask) {
            break // Code is unique, we can use it
          }
          
          // Code exists, increment and try again
          baseCodeNumber++
          itemCode = `${boardInitials}-${baseCodeNumber + i + 1}`
          retryCount++
        } catch (checkError) {
          // If check fails, try to proceed anyway
          break
        }
      }
      
      if (retryCount >= maxRetries) {
        // Fallback to timestamp-based code if we can't find a unique one
        itemCode = `${boardInitials}-${Date.now()}-${i}`
      }

      // Prepare database-ready task data
      const { taskData, metadata } = prepareTaskForDatabase(aiTask, {
        boardId,
        columnId,
        sprintId,
        sprintColumnId,
        position: nextPosition + i,
        createdBy: user.id
      })

      let task
      try {
        // Create task using database-ready data
        task = await prisma.task.create({
          data: {
            ...taskData,
            itemCode // Add generated item code
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
            }
          }
        })
      } catch (createError: any) {
        // If we get a unique constraint error on item_code, try with timestamp
        if (createError.code === 'P2002' && createError.meta?.target?.includes('item_code')) {
          logger.warn('Item code collision detected, using timestamp fallback', {
            attemptedCode: itemCode,
            error: createError.message
          })
          
          // Generate a guaranteed unique code using timestamp
          itemCode = `${boardInitials}-${Date.now()}-${i}`
          
          // Retry with new code
          task = await prisma.task.create({
            data: {
              ...taskData,
              itemCode
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
              }
            }
          })
        } else {
          // Re-throw other errors
          throw createError
        }
      }

      // Handle suggested assignees (names from AI, not UUIDs)
      const suggestedNames = aiTask.aiMetadata?.suggestedAssigneeNames || []
      if (suggestedNames.length > 0) {
        logger.log('AI suggested assignees by name', {
          taskId: task.id,
          suggestedNames
        })
        // TODO: Future enhancement - match names to actual user IDs and create assignments
      }

      // Handle labels from AI metadata
      const labelNames = aiTask.aiMetadata?.labels || []
      if (labelNames.length > 0) {
        for (const labelName of labelNames) {
          try {
            const label = await prisma.label.upsert({
              where: {
                boardId_name: {
                  boardId,
                  name: labelName
                }
              },
              create: {
                boardId,
                name: labelName,
                color: '#3B82F6' // Default blue color
              },
              update: {}
            })

            await prisma.taskLabel.create({
              data: {
                taskId: task.id,
                labelId: label.id
              }
            })
          } catch (labelError) {
            logger.warn('Failed to create label for AI-generated task', {
              taskId: task.id,
              labelName,
              error: labelError instanceof Error ? labelError.message : 'Unknown error'
            })
          }
        }
      }

      // Create acceptance criteria as a checklist if provided in AI metadata
      const acceptanceCriteria = aiTask.aiMetadata?.acceptanceCriteria || []
      if (acceptanceCriteria.length > 0) {
        try {
          const checklist = await prisma.taskChecklist.create({
            data: {
              taskId: task.id,
              name: 'Acceptance Criteria',
              createdBy: user.id,
              items: {
                create: acceptanceCriteria.map((criteria) => ({
                  content: criteria,
                  createdBy: user.id
                }))
              }
            }
          })
          logger.log('Created acceptance criteria checklist', {
            taskId: task.id,
            checklistId: checklist.id,
            itemCount: acceptanceCriteria.length
          })
        } catch (checklistError) {
          logger.warn('Failed to create acceptance criteria checklist', {
            taskId: task.id,
            error: checklistError instanceof Error ? checklistError.message : 'Unknown error'
          })
          // Don't fail the whole operation for checklist creation issues
        }
      }

      // Create TaskActivity record to indicate AI generation
      try {
        await prisma.taskActivity.create({
          data: {
            taskId: task.id,
            userId: user.id,
            activityType: 'task_created_ai',
            description: 'Task created by AI Magic Generator',
            metadata: {
              ...metadata, // Contains all AI metadata from the database schema
              databaseSchemaVersion: '1.0' // Track which schema version was used
            }
          }
        })
        logger.log('Created AI generation activity record', {
          taskId: task.id,
          activityType: 'task_created_ai'
        })
      } catch (activityError) {
        logger.warn('Failed to create AI generation activity record', {
          taskId: task.id,
          error: activityError instanceof Error ? activityError.message : 'Unknown error'
        })
        // Don't fail the whole operation for activity creation issues
      }

      createdTasks.push(task)

      // Trigger notifications and activities
      try {
        await Promise.all([
          TaskNotificationTriggers.onTaskCreated(task.id, user.id),
          TaskActivityTriggers.onTaskCreated(task.id, user.id)
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