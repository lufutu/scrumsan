import { prisma } from '@/lib/prisma'

export interface ActivityData {
  taskId: string
  userId: string
  activityType: string
  description: string
  oldValue?: string | null
  newValue?: string | null
  metadata?: Record<string, any> | null
}

export class ActivityService {
  /**
   * Create a new activity record
   */
  static async createActivity({
    taskId,
    userId,
    activityType,
    description,
    oldValue = null,
    newValue = null,
    metadata = null
  }: ActivityData) {
    try {
      const activity = await prisma.taskActivity.create({
        data: {
          taskId,
          userId,
          activityType,
          description,
          oldValue,
          newValue,
          metadata
        },
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
      })
      
      return activity
    } catch (error) {
      console.error('Error creating activity:', error)
      throw error
    }
  }

  /**
   * Get all activities for a task
   */
  static async getTaskActivities(taskId: string) {
    try {
      const activities = await prisma.taskActivity.findMany({
        where: { taskId },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              avatarUrl: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      })
      
      return activities
    } catch (error) {
      console.error('Error fetching task activities:', error)
      throw error
    }
  }
}

/**
 * Activity tracking triggers for common task operations
 */
export class TaskActivityTriggers {
  /**
   * Record task creation activity
   */
  static async onTaskCreated(taskId: string, userId: string) {
    return ActivityService.createActivity({
      taskId,
      userId,
      activityType: 'created',
      description: 'created Item'
    })
  }

  /**
   * Record task assignment activity
   */
  static async onTaskAssigned(
    taskId: string, 
    assignedUserId: string, 
    assignedByUserId: string,
    taskTitle: string,
    isAssigning: boolean = true
  ) {
    // Get assigned user info for description
    const assignedUser = await prisma.user.findUnique({
      where: { id: assignedUserId },
      select: { fullName: true, email: true }
    })

    const assignedUserName = assignedUser?.fullName || assignedUser?.email || 'Unknown User'
    
    return ActivityService.createActivity({
      taskId,
      userId: assignedByUserId,
      activityType: isAssigning ? 'assigned' : 'unassigned',
      description: isAssigning 
        ? `assigned ${assignedUserName} to the Item`
        : `removed ${assignedUserName} from the Item`,
      newValue: isAssigning ? assignedUserId : null,
      oldValue: isAssigning ? null : assignedUserId,
      metadata: { 
        assignedUserName,
        taskTitle
      }
    })
  }

  /**
   * Record priority change activity
   */
  static async onPriorityChanged(
    taskId: string,
    userId: string,
    oldPriority: string | null,
    newPriority: string | null
  ) {
    const oldPriorityText = oldPriority ? oldPriority.charAt(0).toUpperCase() + oldPriority.slice(1) : 'None'
    const newPriorityText = newPriority ? newPriority.charAt(0).toUpperCase() + newPriority.slice(1) : 'None'
    
    return ActivityService.createActivity({
      taskId,
      userId,
      activityType: 'priority_changed',
      description: `changed Item priority from ${oldPriorityText} to ${newPriorityText}`,
      oldValue: oldPriority,
      newValue: newPriority
    })
  }

  /**
   * Record label addition activity
   */
  static async onLabelAdded(
    taskId: string,
    userId: string,
    labelName: string,
    labelColor?: string
  ) {
    return ActivityService.createActivity({
      taskId,
      userId,
      activityType: 'label_added',
      description: `added label ${labelName}`,
      newValue: labelName,
      metadata: { 
        labelColor,
        labelName
      }
    })
  }

  /**
   * Record label removal activity
   */
  static async onLabelRemoved(
    taskId: string,
    userId: string,
    labelName: string,
    labelColor?: string
  ) {
    return ActivityService.createActivity({
      taskId,
      userId,
      activityType: 'label_removed',
      description: `removed label ${labelName}`,
      oldValue: labelName,
      metadata: { 
        labelColor,
        labelName
      }
    })
  }

  /**
   * Record status/column change activity
   */
  static async onStatusChanged(
    taskId: string,
    userId: string,
    oldColumnName: string | null,
    newColumnName: string | null
  ) {
    return ActivityService.createActivity({
      taskId,
      userId,
      activityType: 'status_changed',
      description: `moved Item from ${oldColumnName || 'Backlog'} to ${newColumnName || 'Backlog'}`,
      oldValue: oldColumnName,
      newValue: newColumnName
    })
  }

  /**
   * Record task type change activity
   */
  static async onTaskTypeChanged(
    taskId: string,
    userId: string,
    oldType: string | null,
    newType: string | null
  ) {
    const oldTypeText = oldType ? oldType.charAt(0).toUpperCase() + oldType.slice(1) : 'None'
    const newTypeText = newType ? newType.charAt(0).toUpperCase() + newType.slice(1) : 'None'
    
    return ActivityService.createActivity({
      taskId,
      userId,
      activityType: 'type_changed',
      description: `changed Item type from ${oldTypeText} to ${newTypeText}`,
      oldValue: oldType,
      newValue: newType
    })
  }

  /**
   * Record task title change activity
   */
  static async onTitleChanged(
    taskId: string,
    userId: string,
    oldTitle: string,
    newTitle: string
  ) {
    return ActivityService.createActivity({
      taskId,
      userId,
      activityType: 'title_changed',
      description: `changed Item title from "${oldTitle}" to "${newTitle}"`,
      oldValue: oldTitle,
      newValue: newTitle
    })
  }

  /**
   * Record task description change activity
   */
  static async onDescriptionChanged(
    taskId: string,
    userId: string,
    hasOldDescription: boolean,
    hasNewDescription: boolean
  ) {
    let description: string
    
    if (!hasOldDescription && hasNewDescription) {
      description = 'added description to Item'
    } else if (hasOldDescription && !hasNewDescription) {
      description = 'removed description from Item'
    } else {
      description = 'updated Item description'
    }
    
    return ActivityService.createActivity({
      taskId,
      userId,
      activityType: 'description_changed',
      description,
      oldValue: hasOldDescription ? 'true' : 'false',
      newValue: hasNewDescription ? 'true' : 'false'
    })
  }

  /**
   * Record story points change activity
   */
  static async onStoryPointsChanged(
    taskId: string,
    userId: string,
    oldPoints: number | null,
    newPoints: number | null
  ) {
    const oldText = oldPoints ? oldPoints.toString() : 'None'
    const newText = newPoints ? newPoints.toString() : 'None'
    
    return ActivityService.createActivity({
      taskId,
      userId,
      activityType: 'story_points_changed',
      description: `changed story points from ${oldText} to ${newText}`,
      oldValue: oldPoints?.toString() || null,
      newValue: newPoints?.toString() || null
    })
  }

  /**
   * Record due date change activity
   */
  static async onDueDateChanged(
    taskId: string,
    userId: string,
    oldDate: Date | null,
    newDate: Date | null
  ) {
    const oldText = oldDate ? oldDate.toLocaleDateString() : 'None'
    const newText = newDate ? newDate.toLocaleDateString() : 'None'
    
    return ActivityService.createActivity({
      taskId,
      userId,
      activityType: 'due_date_changed',
      description: `changed due date from ${oldText} to ${newText}`,
      oldValue: oldDate?.toISOString() || null,
      newValue: newDate?.toISOString() || null
    })
  }
}