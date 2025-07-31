import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'
import { TaskActivityTriggers } from '@/lib/activity-service'
import { NotificationService } from '@/lib/notification-service'

const taskUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  taskType: z.string().optional(),
  priority: z.string().optional(),
  storyPoints: z.number().optional(),
  estimatedHours: z.number().optional(),
  labels: z.array(z.string()).optional(),
  boardId: z.string().uuid().optional(),
  columnId: z.string().uuid().optional().nullable(),
  sprintColumnId: z.string().uuid().optional().nullable(),
  assigneeIds: z.array(z.string().uuid()).optional(), // Multiple assignees
  reviewerIds: z.array(z.string().uuid()).optional(), // Multiple reviewers
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
        taskReviewers: {
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
    
    if (!orgMember) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Add done attribute based on sprint column isDone status
    const taskWithDoneStatus = {
      ...task,
      done: task.sprintColumn?.isDone || false
    }
    
    return NextResponse.json(taskWithDoneStatus)
  } catch (error: unknown) {
    console.error('Error fetching task:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch task' },
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
    
    if (!orgMember) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Prepare update data
    const updateData: any = {}
    if (validatedData.title !== undefined) updateData.title = validatedData.title
    if (validatedData.description !== undefined) updateData.description = validatedData.description
    if (validatedData.taskType !== undefined) updateData.taskType = validatedData.taskType
    if (validatedData.priority !== undefined) updateData.priority = validatedData.priority
    if (validatedData.storyPoints !== undefined) updateData.storyPoints = validatedData.storyPoints
    if (validatedData.estimatedHours !== undefined) updateData.estimatedHours = validatedData.estimatedHours
    if (validatedData.boardId !== undefined) updateData.boardId = validatedData.boardId
    if (validatedData.columnId !== undefined) updateData.columnId = validatedData.columnId
    if (validatedData.sprintColumnId !== undefined) updateData.sprintColumnId = validatedData.sprintColumnId
    if (validatedData.epicId !== undefined) updateData.epicId = validatedData.epicId
    if (validatedData.dueDate !== undefined) updateData.dueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null
    if (validatedData.position !== undefined) updateData.position = validatedData.position
    // Note: labels are handled separately via taskLabels junction table
    
    // Update basic task data
    let task = await prisma.task.update({
      where: { id },
      data: updateData,
    })

    // Handle assignees if provided
    if (validatedData.assigneeIds !== undefined) {
      // Remove existing assignees
      await prisma.taskAssignee.deleteMany({
        where: { taskId: id }
      })
      
      // Add new assignees
      if (validatedData.assigneeIds.length > 0) {
        await prisma.taskAssignee.createMany({
          data: validatedData.assigneeIds.map(userId => ({
            taskId: id,
            userId: userId
          }))
        })
      }
    }

    // Handle reviewers if provided
    if (validatedData.reviewerIds !== undefined) {
      // Remove existing reviewers
      await prisma.taskReviewer.deleteMany({
        where: { taskId: id }
      })
      
      // Add new reviewers
      if (validatedData.reviewerIds.length > 0) {
        await prisma.taskReviewer.createMany({
          data: validatedData.reviewerIds.map(userId => ({
            taskId: id,
            userId: userId
          }))
        })
      }
    }

    // Handle labels if provided
    if (validatedData.labels !== undefined) {
      // Remove existing task labels
      await prisma.taskLabel.deleteMany({
        where: { taskId: id }
      })
      
      // Add new task labels
      if (validatedData.labels.length > 0) {
        await prisma.taskLabel.createMany({
          data: validatedData.labels.map(labelId => ({
            taskId: id,
            labelId: labelId
          }))
        })
      }
    }

    // Fetch updated task with all relations
    task = await prisma.task.findUnique({
      where: { id },
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
        taskReviewers: {
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
    
    // Track activities for changes
    try {
      // Track title changes
      if (validatedData.title !== undefined && validatedData.title !== existingTask.title) {
        await TaskActivityTriggers.onTitleChanged(
          id,
          user.id,
          existingTask.title || '',
          validatedData.title
        )
      }

      // Track description changes
      if (validatedData.description !== undefined && validatedData.description !== existingTask.description) {
        await TaskActivityTriggers.onDescriptionChanged(
          id,
          user.id,
          !!existingTask.description,
          !!validatedData.description
        )
      }

      // Track priority changes
      if (validatedData.priority !== undefined && validatedData.priority !== existingTask.priority) {
        await TaskActivityTriggers.onPriorityChanged(
          id,
          user.id,
          existingTask.priority,
          validatedData.priority
        )
      }

      // Track task type changes
      if (validatedData.taskType !== undefined && validatedData.taskType !== existingTask.taskType) {
        await TaskActivityTriggers.onTaskTypeChanged(
          id,
          user.id,
          existingTask.taskType,
          validatedData.taskType
        )
      }

      // Track story points changes
      if (validatedData.storyPoints !== undefined && validatedData.storyPoints !== existingTask.storyPoints) {
        await TaskActivityTriggers.onStoryPointsChanged(
          id,
          user.id,
          existingTask.storyPoints,
          validatedData.storyPoints
        )
      }

      // Track due date changes
      if (validatedData.dueDate !== undefined) {
        const newDueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null
        if (newDueDate?.getTime() !== existingTask.dueDate?.getTime()) {
          await TaskActivityTriggers.onDueDateChanged(
            id,
            user.id,
            existingTask.dueDate,
            newDueDate
          )
        }
      }

      // Track column/status changes
      if (validatedData.columnId !== undefined && validatedData.columnId !== existingTask.columnId) {
        // Get column names for better activity description
        const [oldColumn, newColumn] = await Promise.all([
          existingTask.columnId ? prisma.boardColumn.findUnique({
            where: { id: existingTask.columnId },
            select: { name: true }
          }) : null,
          validatedData.columnId ? prisma.boardColumn.findUnique({
            where: { id: validatedData.columnId },
            select: { name: true }
          }) : null
        ])

        await TaskActivityTriggers.onStatusChanged(
          id,
          user.id,
          oldColumn?.name || null,
          newColumn?.name || null
        )

        // Send notifications for column change
        const recipients = await NotificationService.getItemNotificationRecipients(id, user.id)
        if (recipients.length > 0) {
          await NotificationService.createBulkNotifications(recipients, {
            organizationId: existingTask.board!.organizationId,
            type: NotificationService.TYPES.ITEM_MOVED,
            title: `Task moved to ${newColumn?.name || 'No Column'}`,
            content: `"${task?.title}" was moved from ${oldColumn?.name || 'No Column'} to ${newColumn?.name || 'No Column'}`,
            link: `/boards/${existingTask.boardId}?task=${id}`,
            entityType: 'task',
            entityId: id,
            triggeredBy: user.id
          })
        }
      }

      // Track sprint column changes
      if (validatedData.sprintColumnId !== undefined && validatedData.sprintColumnId !== existingTask.sprintColumnId) {
        // Get sprint column names for better activity description
        const [oldSprintColumn, newSprintColumn] = await Promise.all([
          existingTask.sprintColumnId ? prisma.sprintColumn.findUnique({
            where: { id: existingTask.sprintColumnId },
            select: { name: true }
          }) : null,
          validatedData.sprintColumnId ? prisma.sprintColumn.findUnique({
            where: { id: validatedData.sprintColumnId },
            select: { name: true }
          }) : null
        ])

        await TaskActivityTriggers.onStatusChanged(
          id,
          user.id,
          oldSprintColumn?.name || null,
          newSprintColumn?.name || null
        )

        // Send notifications for sprint column change
        const recipients = await NotificationService.getItemNotificationRecipients(id, user.id)
        if (recipients.length > 0) {
          await NotificationService.createBulkNotifications(recipients, {
            organizationId: existingTask.board!.organizationId,
            type: NotificationService.TYPES.ITEM_MOVED,
            title: `Task moved to ${newSprintColumn?.name || 'No Column'}`,
            content: `"${task?.title}" was moved from ${oldSprintColumn?.name || 'No Column'} to ${newSprintColumn?.name || 'No Column'} in sprint`,
            link: `/boards/${existingTask.boardId}?task=${id}`,
            entityType: 'task',
            entityId: id,
            triggeredBy: user.id
          })
        }
      }

      // Track assignee changes
      if (validatedData.assigneeIds !== undefined) {
        // Get existing assignees
        const existingAssignees = await prisma.taskAssignee.findMany({
          where: { taskId: id },
          select: { userId: true }
        })
        const existingAssigneeIds = existingAssignees.map(a => a.userId)

        // Find newly added assignees
        const addedAssignees = validatedData.assigneeIds.filter(
          userId => !existingAssigneeIds.includes(userId)
        )
        
        // Find removed assignees
        const removedAssignees = existingAssigneeIds.filter(
          userId => !validatedData.assigneeIds.includes(userId)
        )

        // Track added assignments
        for (const assigneeId of addedAssignees) {
          await TaskActivityTriggers.onTaskAssigned(
            id,
            assigneeId,
            user.id,
            task?.title || '',
            true
          )

          // Send notification to newly assigned user
          await NotificationService.createNotification({
            userId: assigneeId,
            organizationId: existingTask.board!.organizationId,
            type: NotificationService.TYPES.ITEM_ASSIGNED,
            title: 'You have been assigned to a task',
            content: `You have been assigned to "${task?.title}"`,
            link: `/boards/${existingTask.boardId}?task=${id}`,
            entityType: 'task',
            entityId: id,
            triggeredBy: user.id
          })
        }

        // Track removed assignments
        for (const assigneeId of removedAssignees) {
          await TaskActivityTriggers.onTaskAssigned(
            id,
            assigneeId,
            user.id,
            task?.title || '',
            false
          )

          // Send notification to removed assignee
          await NotificationService.createNotification({
            userId: assigneeId,
            organizationId: existingTask.board!.organizationId,
            type: NotificationService.TYPES.ITEM_UPDATED,
            title: 'You have been unassigned from a task',
            content: `You have been removed from "${task?.title}"`,
            link: `/boards/${existingTask.boardId}?task=${id}`,
            entityType: 'task',
            entityId: id,
            triggeredBy: user.id
          })
        }
      }

      // Track label changes
      if (validatedData.labels !== undefined) {
        // Get existing labels
        const existingLabels = await prisma.taskLabel.findMany({
          where: { taskId: id },
          include: {
            label: {
              select: { id: true, name: true, color: true }
            }
          }
        })
        const existingLabelIds = existingLabels.map(tl => tl.label.id)

        // Find newly added labels
        const addedLabelIds = validatedData.labels.filter(
          labelId => !existingLabelIds.includes(labelId)
        )
        
        // Find removed labels
        const removedLabels = existingLabels.filter(
          tl => !validatedData.labels.includes(tl.label.id)
        )

        // Track added labels
        if (addedLabelIds.length > 0) {
          const addedLabels = await prisma.label.findMany({
            where: { id: { in: addedLabelIds } },
            select: { name: true, color: true }
          })

          for (const label of addedLabels) {
            await TaskActivityTriggers.onLabelAdded(
              id,
              user.id,
              label.name,
              label.color || undefined
            )
          }
        }

        // Track removed labels
        for (const labelData of removedLabels) {
          await TaskActivityTriggers.onLabelRemoved(
            id,
            user.id,
            labelData.label.name,
            labelData.label.color || undefined
          )
        }
      }
    } catch (activityError) {
      // Don't fail the task update if activity tracking fails
      console.error('Error tracking task update activities:', activityError)
    }
    
    // Add done attribute based on sprint column isDone status
    const taskWithDoneStatus = {
      ...task,
      done: task.sprintColumn?.isDone || false
    }
    
    return NextResponse.json(taskWithDoneStatus)
  } catch (error: unknown) {
    console.error('Error updating task:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update task' },
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
    
    if (!orgMember) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Delete task (cascade will handle related data)
    await prisma.task.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error deleting task:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete task' },
      { status: 500 }
    )
  }
}