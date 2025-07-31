import { NotificationService } from './notification-service'

/**
 * Notification triggers for task-related actions
 */
export class TaskNotificationTriggers {
  
  /**
   * Trigger notifications when a task is created
   */
  static async onTaskCreated(taskId: string, createdBy: string, organizationId: string) {
    try {
      const recipients = await NotificationService.getItemNotificationRecipients(taskId, createdBy)
      
      if (recipients.length === 0) return

      await NotificationService.createBulkNotifications(recipients, {
        organizationId,
        type: NotificationService.TYPES.ITEM_CREATED,
        title: 'New Task Created',
        content: 'A new task has been created that you might be interested in',
        link: `/tasks/${taskId}`,
        entityType: 'task',
        entityId: taskId,
        triggeredBy: createdBy
      })
    } catch (error) {
      console.error('Error triggering task created notification:', error)
    }
  }

  /**
   * Trigger notifications when a task is assigned
   */
  static async onTaskAssigned(taskId: string, assigneeId: string, assignedBy: string, organizationId: string, taskTitle: string) {
    try {
      // Notify the assignee
      await NotificationService.createNotification({
        userId: assigneeId,
        organizationId,
        type: NotificationService.TYPES.ITEM_ASSIGNED,
        title: 'Task Assigned to You',
        content: `You have been assigned to task: ${taskTitle}`,
        link: `/tasks/${taskId}`,
        entityType: 'task',
        entityId: taskId,
        triggeredBy: assignedBy
      })

      // Notify other stakeholders (author, followers, other assignees)
      const recipients = await NotificationService.getItemNotificationRecipients(taskId, assignedBy)
      const filteredRecipients = recipients.filter(id => id !== assigneeId) // Don't double-notify the assignee

      if (filteredRecipients.length > 0) {
        await NotificationService.createBulkNotifications(filteredRecipients, {
          organizationId,
          type: NotificationService.TYPES.ITEM_UPDATED,
          title: 'Task Assignment Updated',
          content: `Task "${taskTitle}" has been assigned to a team member`,
          link: `/tasks/${taskId}`,
          entityType: 'task',
          entityId: taskId,
          triggeredBy: assignedBy
        })
      }
    } catch (error) {
      console.error('Error triggering task assigned notification:', error)
    }
  }

  /**
   * Trigger notifications when a comment is added
   */
  static async onTaskCommented(taskId: string, commentContent: string, commentedBy: string, organizationId: string, taskTitle: string) {
    try {
      // Get recipients for general task notification
      const recipients = await NotificationService.getItemNotificationRecipients(taskId, commentedBy)
      
      // Get mentioned users from comment content
      const mentionedUsers = await NotificationService.getMentionedUsers(commentContent, organizationId)
      
      // Notify mentioned users
      for (const userId of mentionedUsers) {
        if (userId !== commentedBy) {
          await NotificationService.createNotification({
            userId,
            organizationId,
            type: NotificationService.TYPES.ITEM_MENTIONED,
            title: 'You were mentioned in a comment',
            content: `You were mentioned in a comment on task: ${taskTitle}`,
            link: `/tasks/${taskId}`,
            entityType: 'task',
            entityId: taskId,
            triggeredBy: commentedBy
          })
        }
      }

      // Notify other stakeholders (excluding mentioned users to avoid duplicates)
      const filteredRecipients = recipients.filter(id => !mentionedUsers.includes(id))
      
      if (filteredRecipients.length > 0) {
        await NotificationService.createBulkNotifications(filteredRecipients, {
          organizationId,
          type: NotificationService.TYPES.ITEM_COMMENTED,
          title: 'New Comment Added',
          content: `A new comment was added to task: ${taskTitle}`,
          link: `/tasks/${taskId}`,
          entityType: 'task',
          entityId: taskId,
          triggeredBy: commentedBy
        })
      }
    } catch (error) {
      console.error('Error triggering task commented notification:', error)
    }
  }

  /**
   * Trigger notifications when a task is moved between columns
   */
  static async onTaskMoved(taskId: string, fromColumnName: string, toColumnName: string, movedBy: string, organizationId: string, taskTitle: string) {
    try {
      const recipients = await NotificationService.getItemNotificationRecipients(taskId, movedBy)
      
      if (recipients.length === 0) return

      await NotificationService.createBulkNotifications(recipients, {
        organizationId,
        type: NotificationService.TYPES.ITEM_MOVED,
        title: 'Task Status Updated',
        content: `Task "${taskTitle}" was moved from ${fromColumnName} to ${toColumnName}`,
        link: `/tasks/${taskId}`,
        entityType: 'task',
        entityId: taskId,
        triggeredBy: movedBy
      })
    } catch (error) {
      console.error('Error triggering task moved notification:', error)
    }
  }

  /**
   * Trigger notifications when labels are added to a task
   */
  static async onTaskLabeled(taskId: string, labelNames: string[], labeledBy: string, organizationId: string, taskTitle: string) {
    try {
      const recipients = await NotificationService.getItemNotificationRecipients(taskId, labeledBy)
      
      if (recipients.length === 0) return

      const labelText = labelNames.length === 1 ? labelNames[0] : `${labelNames.length} labels`

      await NotificationService.createBulkNotifications(recipients, {
        organizationId,
        type: NotificationService.TYPES.ITEM_LABELED,
        title: 'Task Labels Updated',
        content: `${labelText} added to task: ${taskTitle}`,
        link: `/tasks/${taskId}`,
        entityType: 'task',
        entityId: taskId,
        triggeredBy: labeledBy
      })
    } catch (error) {
      console.error('Error triggering task labeled notification:', error)
    }
  }

  /**
   * Trigger notifications when a checklist is added to a task
   */
  static async onTaskChecklistAdded(taskId: string, checklistTitle: string, addedBy: string, organizationId: string, taskTitle: string) {
    try {
      const recipients = await NotificationService.getItemNotificationRecipients(taskId, addedBy)
      
      if (recipients.length === 0) return

      await NotificationService.createBulkNotifications(recipients, {
        organizationId,
        type: NotificationService.TYPES.ITEM_CHECKLIST_ADDED,
        title: 'Checklist Added',
        content: `A checklist "${checklistTitle}" was added to task: ${taskTitle}`,
        link: `/tasks/${taskId}`,
        entityType: 'task',
        entityId: taskId,
        triggeredBy: addedBy
      })
    } catch (error) {
      console.error('Error triggering task checklist added notification:', error)
    }
  }

  /**
   * Trigger notifications when a file is attached to a task
   */
  static async onTaskFileAdded(taskId: string, fileName: string, addedBy: string, organizationId: string, taskTitle: string) {
    try {
      const recipients = await NotificationService.getItemNotificationRecipients(taskId, addedBy)
      
      if (recipients.length === 0) return

      await NotificationService.createBulkNotifications(recipients, {
        organizationId,
        type: NotificationService.TYPES.ITEM_FILE_ADDED,
        title: 'File Attached',
        content: `File "${fileName}" was attached to task: ${taskTitle}`,
        link: `/tasks/${taskId}`,
        entityType: 'task',
        entityId: taskId,
        triggeredBy: addedBy
      })
    } catch (error) {
      console.error('Error triggering task file added notification:', error)
    }
  }

  /**
   * Trigger notifications when task due date changes
   */
  static async onTaskDueDateChanged(taskId: string, newDueDate: Date | null, changedBy: string, organizationId: string, taskTitle: string) {
    try {
      const recipients = await NotificationService.getItemNotificationRecipients(taskId, changedBy)
      
      if (recipients.length === 0) return

      const dueDateText = newDueDate 
        ? `Due date set to ${newDueDate.toLocaleDateString()}`
        : 'Due date removed'

      await NotificationService.createBulkNotifications(recipients, {
        organizationId,
        type: NotificationService.TYPES.ITEM_DUE_DATE_CHANGED,
        title: 'Due Date Updated',
        content: `${dueDateText} for task: ${taskTitle}`,
        link: `/tasks/${taskId}`,
        entityType: 'task',
        entityId: taskId,
        triggeredBy: changedBy
      })
    } catch (error) {
      console.error('Error triggering task due date changed notification:', error)
    }
  }
}

/**
 * Notification triggers for board-related actions
 */
export class BoardNotificationTriggers {
  
  /**
   * Trigger notifications when a sprint is created
   */
  static async onSprintCreated(boardId: string, sprintName: string, createdBy: string, organizationId: string) {
    try {
      const recipients = await NotificationService.getBoardNotificationRecipients(boardId, createdBy)
      
      if (recipients.length === 0) return

      await NotificationService.createBulkNotifications(recipients, {
        organizationId,
        type: NotificationService.TYPES.BOARD_SPRINT_CREATED,
        title: 'New Sprint Created',
        content: `Sprint "${sprintName}" has been created`,
        link: `/boards/${boardId}`,
        entityType: 'sprint',
        entityId: boardId,
        triggeredBy: createdBy
      })
    } catch (error) {
      console.error('Error triggering sprint created notification:', error)
    }
  }

  /**
   * Trigger notifications when a sprint is updated
   */
  static async onSprintUpdated(boardId: string, sprintName: string, updatedBy: string, organizationId: string) {
    try {
      const recipients = await NotificationService.getBoardNotificationRecipients(boardId, updatedBy)
      
      if (recipients.length === 0) return

      await NotificationService.createBulkNotifications(recipients, {
        organizationId,
        type: NotificationService.TYPES.BOARD_SPRINT_UPDATED,
        title: 'Sprint Updated',
        content: `Sprint "${sprintName}" has been updated`,
        link: `/boards/${boardId}`,
        entityType: 'sprint',
        entityId: boardId,
        triggeredBy: updatedBy
      })
    } catch (error) {
      console.error('Error triggering sprint updated notification:', error)
    }
  }

  /**
   * Trigger notifications when a board column is created
   */
  static async onColumnCreated(boardId: string, columnName: string, createdBy: string, organizationId: string) {
    try {
      const recipients = await NotificationService.getBoardNotificationRecipients(boardId, createdBy)
      
      if (recipients.length === 0) return

      await NotificationService.createBulkNotifications(recipients, {
        organizationId,
        type: NotificationService.TYPES.BOARD_COLUMN_CREATED,
        title: 'New Board Column',
        content: `Column "${columnName}" has been added to the board`,
        link: `/boards/${boardId}`,
        entityType: 'column',
        entityId: boardId,
        triggeredBy: createdBy
      })
    } catch (error) {
      console.error('Error triggering column created notification:', error)
    }
  }

  /**
   * Trigger notifications when a board column is updated
   */
  static async onColumnUpdated(boardId: string, columnName: string, updatedBy: string, organizationId: string) {
    try {
      const recipients = await NotificationService.getBoardNotificationRecipients(boardId, updatedBy)
      
      if (recipients.length === 0) return

      await NotificationService.createBulkNotifications(recipients, {
        organizationId,
        type: NotificationService.TYPES.BOARD_COLUMN_UPDATED,
        title: 'Board Column Updated',
        content: `Column "${columnName}" has been updated`,
        link: `/boards/${boardId}`,
        entityType: 'column',
        entityId: boardId,
        triggeredBy: updatedBy
      })
    } catch (error) {
      console.error('Error triggering column updated notification:', error)
    }
  }

  /**
   * Trigger notifications when a board column is deleted
   */
  static async onColumnDeleted(boardId: string, columnName: string, deletedBy: string, organizationId: string) {
    try {
      const recipients = await NotificationService.getBoardNotificationRecipients(boardId, deletedBy)
      
      if (recipients.length === 0) return

      await NotificationService.createBulkNotifications(recipients, {
        organizationId,
        type: NotificationService.TYPES.BOARD_COLUMN_DELETED,
        title: 'Board Column Removed',
        content: `Column "${columnName}" has been removed from the board`,
        link: `/boards/${boardId}`,
        entityType: 'column',
        entityId: boardId,
        triggeredBy: deletedBy
      })
    } catch (error) {
      console.error('Error triggering column deleted notification:', error)
    }
  }
}