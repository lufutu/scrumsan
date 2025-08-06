import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { createClient } from '@/lib/supabase/server'

export async function GET(
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

    // Get all tasks for this board, regardless of their column/sprint status
    const allTasks = await prisma.task.findMany({
      where: {
        boardId: boardId
      },
      include: {
        taskAssignees: {
          include: {
            user: true
          }
        },
        taskLabels: {
          include: {
            label: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Categorize tasks by their status
    const tasksByCategory = {
      inBacklog: allTasks.filter(task => 
        !task.sprintId && !task.columnId && !task.sprintColumnId
      ),
      inSprint: allTasks.filter(task => 
        task.sprintId && !task.sprintColumnId
      ),
      inSprintColumn: allTasks.filter(task => 
        task.sprintColumnId
      ),
      inBoardColumn: allTasks.filter(task => 
        task.columnId && !task.sprintId
      ),
      orphaned: allTasks.filter(task => 
        !task.sprintId && !task.columnId && !task.sprintColumnId
      ),
      followUp: allTasks.filter(task => 
        task.labels?.includes('__followup__')
      )
    }

    const summary = {
      total: allTasks.length,
      inBacklog: tasksByCategory.inBacklog.length,
      inSprint: tasksByCategory.inSprint.length, 
      inSprintColumn: tasksByCategory.inSprintColumn.length,
      inBoardColumn: tasksByCategory.inBoardColumn.length,
      orphaned: tasksByCategory.orphaned.length,
      followUp: tasksByCategory.followUp.length
    }

    return NextResponse.json({
      summary,
      tasks: allTasks.map(task => ({
        id: task.id,
        title: task.title,
        itemCode: task.itemCode,
        boardId: task.boardId,
        sprintId: task.sprintId,
        columnId: task.columnId,
        sprintColumnId: task.sprintColumnId,
        labels: task.labels,
        createdAt: task.createdAt,
        category: getTaskCategory(task)
      }))
    })

  } catch (error) {
    console.error('Error fetching debug tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch debug tasks' },
      { status: 500 }
    )
  }
}

function getTaskCategory(task: any): string {
  if (task.sprintColumnId) return 'sprint-column'
  if (task.sprintId && !task.sprintColumnId) return 'sprint-backlog'
  if (task.columnId && !task.sprintId) return 'board-column'
  if (task.labels?.includes('__followup__')) return 'followup'
  if (!task.sprintId && !task.columnId && !task.sprintColumnId) return 'backlog'
  return 'orphaned'
}

export async function DELETE(
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

    // Delete all tasks for this board (useful for cleanup)
    const deletedTasks = await prisma.task.deleteMany({
      where: {
        boardId: boardId
      }
    })

    return NextResponse.json({
      message: `Deleted ${deletedTasks.count} tasks from board`,
      count: deletedTasks.count
    })

  } catch (error) {
    console.error('Error deleting tasks:', error)
    return NextResponse.json(
      { error: 'Failed to delete tasks' },
      { status: 500 }
    )
  }
}