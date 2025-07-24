import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { id: sprintId } = await params

    // Get the sprint and verify access
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        board: {
          include: {
            organization: true
          }
        },
        tasks: {
          include: {
            sprintColumn: true
          }
        },
        sprintColumns: {
          orderBy: { position: 'asc' }
        }
      }
    })

    if (!sprint) {
      return NextResponse.json(
        { error: 'Sprint not found' },
        { status: 404 }
      )
    }

    // Check if user is a member of the organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: sprint.board.organizationId,
        userId: user.id
      }
    })

    if (!orgMember) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Check if sprint is already finished
    if (sprint.isFinished || sprint.status === 'completed') {
      return NextResponse.json(
        { error: 'Sprint is already finished' },
        { status: 400 }
      )
    }

    // Find the "Done" column(s) - columns marked as isDone: true
    const doneColumns = sprint.sprintColumns.filter(col => col.isDone)
    const doneColumnIds = doneColumns.map(col => col.id)

    // Separate finished and unfinished tasks
    const finishedTasks = sprint.tasks.filter(task => 
      task.sprintColumnId && doneColumnIds.includes(task.sprintColumnId)
    )
    const unfinishedTasks = sprint.tasks.filter(task => 
      !task.sprintColumnId || !doneColumnIds.includes(task.sprintColumnId)
    )

    let newSprintId: string | null = null
    let newSprintName: string | null = null

    // Use a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // If there are unfinished tasks, create a new sprint for them
      if (unfinishedTasks.length > 0) {
        // Get the highest position for the new sprint
        const lastSprint = await tx.sprint.findFirst({
          where: {
            boardId: sprint.boardId,
            isDeleted: false
          },
          orderBy: { position: 'desc' }
        })

        const nextPosition = (lastSprint?.position ?? 0) + 1
        const newSprintNameGenerated = `${sprint.name} - Unfinished Items`

        // Create new sprint for unfinished tasks
        const newSprint = await tx.sprint.create({
          data: {
            name: newSprintNameGenerated,
            goal: `Unfinished items from "${sprint.name}"`,
            boardId: sprint.boardId,
            status: 'planning',
            position: nextPosition,
            parentSprintId: sprint.id
          }
        })

        newSprintId = newSprint.id
        newSprintName = newSprintNameGenerated

        // Create default columns for the new sprint
        const defaultColumns = [
          { name: 'To Do', position: 0, isDone: false },
          { name: 'In Progress', position: 1, isDone: false },
          { name: 'Done', position: 2, isDone: true }
        ]

        const createdColumns = await Promise.all(
          defaultColumns.map(col =>
            tx.sprintColumn.create({
              data: {
                ...col,
                sprintId: newSprint.id
              }
            })
          )
        )

        // Move unfinished tasks to the new sprint's "To Do" column
        const toDoColumn = createdColumns.find(col => col.name === 'To Do')
        
        if (toDoColumn) {
          await tx.task.updateMany({
            where: {
              id: { in: unfinishedTasks.map(task => task.id) }
            },
            data: {
              sprintId: newSprint.id,
              sprintColumnId: toDoColumn.id,
              columnId: null // Remove from board column since it's now in sprint
            }
          })
        }
      }

      // Mark the original sprint as finished and completed
      await tx.sprint.update({
        where: { id: sprintId },
        data: {
          status: 'completed',
          isFinished: true,
          endDate: new Date()
        }
      })

      return {
        finishedTasksCount: finishedTasks.length,
        unfinishedTasksCount: unfinishedTasks.length,
        newSprintId,
        newSprintName
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Sprint finished successfully',
      finishedTasksCount: result.finishedTasksCount,
      unfinishedTasksCount: result.unfinishedTasksCount,
      newSprintId: result.newSprintId,
      newSprintName: result.newSprintName
    })

  } catch (error: unknown) {
    console.error('Error finishing sprint:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to finish sprint' },
      { status: 500 }
    )
  }
}