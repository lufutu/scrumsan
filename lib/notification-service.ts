import { prisma } from './prisma'

export interface NotificationData {
  userId: string
  organizationId?: string
  type: string
  title: string
  content: string
  link?: string
  entityType?: string
  entityId?: string
  triggeredBy?: string
  metadata?: Record<string, any>
}

export class NotificationService {
  /**
   * Create a single notification
   */
  static async createNotification(data: NotificationData) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          organizationId: data.organizationId,
          type: data.type,
          title: data.title,
          content: data.content,
          link: data.link,
          entityType: data.entityType,
          entityId: data.entityId,
          triggeredBy: data.triggeredBy,
          metadata: data.metadata
        },
        include: {
          triggeredByUser: {
            select: {
              id: true,
              fullName: true,
              email: true,
              avatarUrl: true
            }
          }
        }
      })
      
      return notification
    } catch (error) {
      console.error('Error creating notification:', error)
      throw error
    }
  }

  /**
   * Create notifications for multiple users
   */
  static async createBulkNotifications(userIds: string[], baseData: Omit<NotificationData, 'userId'>) {
    try {
      const notifications = userIds.map(userId => ({
        userId,
        organizationId: baseData.organizationId,
        type: baseData.type,
        title: baseData.title,
        content: baseData.content,
        link: baseData.link,
        entityType: baseData.entityType,
        entityId: baseData.entityId,
        triggeredBy: baseData.triggeredBy,
        metadata: baseData.metadata
      }))

      const result = await prisma.notification.createMany({
        data: notifications,
        skipDuplicates: true
      })

      return result
    } catch (error) {
      console.error('Error creating bulk notifications:', error)
      throw error
    }
  }

  /**
   * Get users who should be notified for item-related actions
   */
  static async getItemNotificationRecipients(taskId: string, triggeredBy: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        creator: {
          select: { id: true }
        },
        taskAssignees: {
          include: {
            user: {
              select: { id: true }
            }
          }
        },
        taskReviewers: {
          include: {
            user: {
              select: { id: true }
            }
          }
        },
        followers: {
          include: {
            user: {
              select: { id: true }
            }
          }
        }
      }
    })

    if (!task) return []

    const recipients = new Set<string>()

    // Add task creator (author)
    if (task.creator?.id && task.creator.id !== triggeredBy) {
      recipients.add(task.creator.id)
    }

    // Add assignees
    task.taskAssignees.forEach(assignee => {
      if (assignee.user.id !== triggeredBy) {
        recipients.add(assignee.user.id)
      }
    })

    // Add reviewers
    task.taskReviewers.forEach(reviewer => {
      if (reviewer.user.id !== triggeredBy) {
        recipients.add(reviewer.user.id)
      }
    })

    // Add followers
    task.followers.forEach(follower => {
      if (follower.user.id !== triggeredBy) {
        recipients.add(follower.user.id)
      }
    })

    return Array.from(recipients)
  }

  /**
   * Get users mentioned in text (e.g., @username format)
   */
  static async getMentionedUsers(text: string, organizationId: string): Promise<string[]> {
    // Extract @mentions from text
    const mentionRegex = /@(\w+)/g
    const mentions = text.match(mentionRegex)
    
    if (!mentions || mentions.length === 0) return []

    const usernames = mentions.map(mention => mention.substring(1)) // Remove @

    // Find users by email or full name matching the mentions
    const users = await prisma.user.findMany({
      where: {
        OR: [
          {
            email: {
              in: usernames.map(username => `${username}@*`),
              mode: 'insensitive'
            }
          },
          {
            fullName: {
              in: usernames,
              mode: 'insensitive'
            }
          }
        ],
        organizationMembers: {
          some: {
            organizationId
          }
        }
      },
      select: { id: true }
    })

    return users.map(user => user.id)
  }

  /**
   * Get board members for board-level notifications
   */
  static async getBoardNotificationRecipients(boardId: string, triggeredBy: string) {
    const boardMembers = await prisma.boardMember.findMany({
      where: {
        boardId,
        userId: { not: triggeredBy }
      },
      include: {
        user: {
          select: { id: true }
        }
      }
    })

    return boardMembers.map(member => member.user.id)
  }

  /**
   * Notification type constants
   */
  static readonly TYPES = {
    // Item notifications
    ITEM_ASSIGNED: 'item_assigned',
    ITEM_MENTIONED: 'item_mentioned',
    ITEM_COMMENTED: 'item_commented',
    ITEM_MOVED: 'item_moved',
    ITEM_LABELED: 'item_labeled',
    ITEM_CREATED: 'item_created',
    ITEM_UPDATED: 'item_updated',
    ITEM_CHECKLIST_ADDED: 'item_checklist_added',
    ITEM_FILE_ADDED: 'item_file_added',
    ITEM_DUE_DATE_CHANGED: 'item_due_date_changed',
    
    // Board notifications
    BOARD_CREATED: 'board_created',
    BOARD_UPDATED: 'board_updated',
    BOARD_SPRINT_CREATED: 'board_sprint_created',
    BOARD_SPRINT_UPDATED: 'board_sprint_updated',
    BOARD_COLUMN_CREATED: 'board_column_created',
    BOARD_COLUMN_UPDATED: 'board_column_updated',
    BOARD_COLUMN_DELETED: 'board_column_deleted'
  } as const
}