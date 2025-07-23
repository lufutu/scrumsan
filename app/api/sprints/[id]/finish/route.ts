import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sprintId } = await params
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    // Get sprint with tasks
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        sprintTasks: {
          include: {
            task: {
              include: {
                sprintColumn: true
              }
            }
          }
        },
        sprintColumns: true,
        board: {
          select: {
            id: true,
            organizationId: true
          }
        }
      }
    })
    
    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
    }
    
    // Check if sprint is active
    if (sprint.status !== 'active') {
      return NextResponse.json({ error: 'Can only finish active sprints' }, { status: 400 })
    }
    
    // Check permissions
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: sprint.board.organizationId,
        userId: user.id
      }
    })
    
    if (!orgMember) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // Get done columns
    const doneColumns = sprint.sprintColumns.filter(col => col.isDone)
    const doneColumnIds = doneColumns.map(col => col.id)
    
    // Find unfinished tasks (tasks not in done columns)
    const unfinishedTasks = sprint.sprintTasks.filter(st => 
      !st.task.sprintColumnId || !doneColumnIds.includes(st.task.sprintColumnId)
    )
    
    // Start transaction to finish sprint
    const result = await prisma.$transaction(async (tx) => {
      // Update sprint status to completed and mark as finished
      await tx.sprint.update({
        where: { id: sprintId },
        data: {
          status: 'completed',
          endDate: new Date(),
          isFinished: true
        }
      })
      
      let newSprint = null
      
      // Create follow-up sprint if there are unfinished tasks
      if (unfinishedTasks.length > 0) {
        // Get the next position for the new sprint
        const lastSprint = await tx.sprint.findFirst({
          where: { 
            boardId: sprint.boardId,
            isDeleted: false,
            isBacklog: false
          },
          orderBy: { position: 'desc' }
        })
        
        const nextPosition = (lastSprint?.position ?? 0) + 1
        
        // Create the follow-up sprint
        newSprint = await tx.sprint.create({
          data: {
            boardId: sprint.boardId,
            name: `${sprint.name} - not finished Items`,
            goal: `Complete unfinished items from ${sprint.name}`,
            status: 'planning',
            position: nextPosition,
            parentSprintId: sprintId
          }
        })
        
        // Create default columns for the new sprint
        const defaultColumns = [
          { name: 'To Do', position: 0, isDone: false },
          { name: 'In Progress', position: 1, isDone: false },
          { name: 'Done', position: 2, isDone: true }
        ]
        
        await tx.sprintColumn.createMany({
          data: defaultColumns.map(col => ({
            ...col,
            sprintId: newSprint.id
          }))
        })
        
        // Get the To Do column of the new sprint
        const todoColumn = await tx.sprintColumn.findFirst({
          where: {
            sprintId: newSprint.id,
            position: 0
          }
        })
        
        // Move unfinished tasks to the new sprint's To Do column
        const unfinishedTaskIds = unfinishedTasks.map(st => st.task.id)
        
        // Update tasks to point to new sprint's To Do column
        await tx.task.updateMany({
          where: {
            id: { in: unfinishedTaskIds }
          },
          data: {
            sprintColumnId: todoColumn?.id
          }
        })
        
        // Create sprint tasks for the new sprint
        await tx.sprintTask.createMany({
          data: unfinishedTaskIds.map(taskId => ({
            sprintId: newSprint.id,
            taskId: taskId
          }))
        })
        
        // Remove from old sprint
        await tx.sprintTask.deleteMany({
          where: {
            sprintId: sprintId,
            taskId: { in: unfinishedTaskIds }
          }
        })
      }
      
      return { newSprint, unfinishedTasksCount: unfinishedTasks.length }
    })
    
    return NextResponse.json({
      success: true,
      unfinishedTasksCount: result.unfinishedTasksCount,
      newSprintId: result.newSprint?.id,
      newSprintName: result.newSprint?.name,
      message: result.newSprint 
        ? `Sprint finished successfully. ${result.unfinishedTasksCount} unfinished tasks moved to "${result.newSprint.name}".`
        : `Sprint finished successfully. All tasks completed!`
    })
  } catch (error: unknown) {
    console.error('Error finishing sprint:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to finish sprint' },
      { status: 500 }
    )
  }
}