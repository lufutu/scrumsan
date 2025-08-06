import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { boardId } = await params

    // Find all orphaned tasks for this board
    // These are tasks that have sprintId but no sprintColumnId (invisible in UI)
    const orphanedTasks = await prisma.task.findMany({
      where: {
        boardId: boardId,
        sprintId: { not: null },
        sprintColumnId: null
      }
    })

    if (orphanedTasks.length === 0) {
      return NextResponse.json({
        message: 'No orphaned tasks found',
        count: 0
      })
    }

    // Move orphaned tasks to backlog by clearing sprintId
    const updateResult = await prisma.task.updateMany({
      where: {
        boardId: boardId,
        sprintId: { not: null },
        sprintColumnId: null
      },
      data: {
        sprintId: null,
        sprintColumnId: null,
        columnId: null
      }
    })

    return NextResponse.json({
      message: `Fixed ${updateResult.count} orphaned tasks by moving them to backlog`,
      count: updateResult.count,
      tasks: orphanedTasks.map(task => ({
        id: task.id,
        title: task.title,
        itemCode: task.itemCode
      }))
    })

  } catch (error) {
    console.error('Error fixing orphaned tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fix orphaned tasks' },
      { status: 500 }
    )
  }
}