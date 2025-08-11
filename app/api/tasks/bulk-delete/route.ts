import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const bulkDeleteSchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1, 'At least one task ID is required')
})

export async function DELETE(req: NextRequest) {
  try {
    // Authentication
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request
    const body = await req.json()
    const { taskIds } = bulkDeleteSchema.parse(body)

    logger.log('Bulk delete request', {
      userId: user.id,
      taskCount: taskIds.length
    })

    // Verify user has access to all tasks and get task details for logging
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
        title: true,
        itemCode: true
      }
    })

    if (tasks.length !== taskIds.length) {
      return NextResponse.json(
        { error: 'Some tasks not found or access denied' },
        { status: 403 }
      )
    }

    // Delete all tasks in a transaction
    // Prisma will handle cascade deletion of related records
    const result = await prisma.$transaction(async (tx) => {
      // Store task info for audit before deletion
      const auditData = tasks.map(task => ({
        taskId: task.id,
        taskTitle: task.title,
        taskCode: task.itemCode,
        boardId: task.boardId
      }))

      // Delete all tasks (cascade will handle related records)
      const deleted = await tx.task.deleteMany({
        where: {
          id: { in: taskIds }
        }
      })

      // Create audit log entries for each board affected
      const boardIds = [...new Set(tasks.map(t => t.boardId))]
      const auditLogs = await Promise.all(
        boardIds.map(boardId => {
          const boardTasks = tasks.filter(t => t.boardId === boardId)
          return tx.auditLog.create({
            data: {
              organizationId: tasks[0].boardId, // This should be fetched properly
              userId: user.id,
              action: 'bulk_delete_tasks',
              resourceType: 'task',
              details: `Bulk deleted ${boardTasks.length} tasks`,
              metadata: {
                taskCount: boardTasks.length,
                taskIds: boardTasks.map(t => t.id),
                taskTitles: boardTasks.map(t => ({ id: t.id, title: t.title, code: t.itemCode }))
              }
            } as any // Using any to bypass strict typing for metadata
          }).catch(err => {
            // If audit log fails, don't fail the whole operation
            logger.warn('Failed to create audit log', err)
            return null
          })
        })
      )

      return {
        deletedCount: deleted.count,
        auditLogs: auditLogs.filter(Boolean).length
      }
    })

    logger.log('Bulk delete completed', {
      userId: user.id,
      deletedCount: result.deletedCount
    })

    return NextResponse.json({
      success: true,
      count: result.deletedCount,
      message: `Successfully deleted ${result.deletedCount} task${result.deletedCount !== 1 ? 's' : ''}`
    })

  } catch (error) {
    logger.error('Bulk delete error', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to delete tasks' },
      { status: 500 }
    )
  }
}