import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const bulkArchiveSchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1, 'At least one task ID is required')
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
    const { taskIds } = bulkArchiveSchema.parse(body)

    logger.log('Bulk archive request', {
      userId: user.id,
      taskCount: taskIds.length
    })

    // Verify user has access to all tasks
    const tasks = await prisma.task.findMany({
      where: {
        id: { in: taskIds },
        board: {
          organization: {
            members: {
              some: { userId: user.id }
            }
          }
        }
      },
      select: {
        id: true,
        boardId: true,
        title: true
      }
    })

    if (tasks.length !== taskIds.length) {
      return NextResponse.json(
        { error: 'Some tasks not found or access denied' },
        { status: 403 }
      )
    }

    // Archive all tasks in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update tasks to archived
      const updated = await tx.task.updateMany({
        where: {
          id: { in: taskIds }
        },
        data: {
          isArchived: true,
          updatedAt: new Date()
        }
      })

      // Create activity records for each task
      const activities = await Promise.all(
        tasks.map(task => 
          tx.taskActivity.create({
            data: {
              taskId: task.id,
              userId: user.id,
              activityType: 'archived',
              description: 'Task archived via bulk action',
              metadata: {
                bulkAction: true,
                taskCount: taskIds.length
              }
            }
          })
        )
      )

      return {
        updatedCount: updated.count,
        activities: activities.length
      }
    })

    logger.log('Bulk archive completed', {
      userId: user.id,
      archivedCount: result.updatedCount
    })

    return NextResponse.json({
      success: true,
      count: result.updatedCount,
      message: `Successfully archived ${result.updatedCount} task${result.updatedCount !== 1 ? 's' : ''}`
    })

  } catch (error) {
    logger.error('Bulk archive error', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to archive tasks' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve archived tasks
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const boardId = searchParams.get('boardId')

    if (!boardId) {
      return NextResponse.json(
        { error: 'Board ID is required' },
        { status: 400 }
      )
    }

    // Get archived tasks
    const archivedTasks = await prisma.task.findMany({
      where: {
        boardId,
        isArchived: true,
        board: {
          organization: {
            members: {
              some: { userId: user.id }
            }
          }
        }
      },
      include: {
        taskAssignees: {
          include: {
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
          include: {
            label: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return NextResponse.json({
      tasks: archivedTasks,
      count: archivedTasks.length
    })

  } catch (error) {
    logger.error('Get archived tasks error', error)
    return NextResponse.json(
      { error: 'Failed to fetch archived tasks' },
      { status: 500 }
    )
  }
}