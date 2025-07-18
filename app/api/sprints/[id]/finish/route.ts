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
        project: {
          select: {
            id: true,
            boardId: true
          }
        }
      }
    })
    
    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
    }
    
    // Check permissions
    if (sprint.projectId) {
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId: sprint.projectId,
          userId: user.id
        }
      })
      
      if (!projectMember) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }
    
    // Get done columns
    const doneColumns = sprint.sprintColumns.filter(col => col.isDone)
    const doneColumnIds = doneColumns.map(col => col.id)
    
    // Find unfinished tasks (tasks not in done columns)
    const unfinishedTasks = sprint.sprintTasks.filter(st => 
      !st.task.sprintColumnId || !doneColumnIds.includes(st.task.sprintColumnId)
    )
    
    // Start transaction to finish sprint
    await prisma.$transaction(async (tx) => {
      // Update sprint status to completed
      await tx.sprint.update({
        where: { id: sprintId },
        data: {
          status: 'completed',
          endDate: new Date()
        }
      })
      
      // Move unfinished tasks back to product backlog
      if (unfinishedTasks.length > 0) {
        // Remove tasks from sprint columns
        await tx.task.updateMany({
          where: {
            id: {
              in: unfinishedTasks.map(st => st.task.id)
            }
          },
          data: {
            sprintColumnId: null,
            status: 'todo' // Reset status for backlog
          }
        })
        
        // Remove from sprint
        await tx.sprintTask.deleteMany({
          where: {
            sprintId: sprintId,
            taskId: {
              in: unfinishedTasks.map(st => st.task.id)
            }
          }
        })
      }
      
      // Clean up sprint columns
      await tx.sprintColumn.deleteMany({
        where: { sprintId }
      })
    })
    
    return NextResponse.json({
      success: true,
      unfinishedTasksCount: unfinishedTasks.length,
      message: `Sprint finished successfully. ${unfinishedTasks.length} unfinished tasks moved back to Product Backlog.`
    })
  } catch (error: any) {
    console.error('Error finishing sprint:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to finish sprint' },
      { status: 500 }
    )
  }
}