import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; columnId: string }> }
) {
  try {
    const { id: sprintId, columnId } = await params
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    // Check if user has access to the sprint
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      select: {
        id: true,
        boardId: true
      }
    })
    
    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
    }
    
    // Check if user has access to the board through organization membership
    const board = await prisma.board.findUnique({
      where: { id: sprint.boardId },
      select: {
        organizationId: true,
        predefinedItems: {
          include: {
            task: {
              include: {
                taskAssignees: {
                  select: {
                    user: {
                      select: {
                        id: true,
                        fullName: true,
                        avatarUrl: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })
    
    if (board) {
      const orgMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId: board.organizationId,
          userId: user.id
        }
      })
      
      if (!orgMember) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }
    
    // Verify the column belongs to this sprint
    const targetColumn = await prisma.sprintColumn.findFirst({
      where: {
        id: columnId,
        sprintId: sprintId
      }
    })
    
    if (!targetColumn) {
      return NextResponse.json({ error: 'Column not found' }, { status: 404 })
    }
    
    // Get predefined items from the board
    const predefinedItems = board?.predefinedItems.map(item => item.task) || []
    
    if (predefinedItems.length === 0) {
      return NextResponse.json({ message: 'No predefined items available' })
    }
    
    // Add predefined items to the column
    const addedTasks = []
    for (const predefinedTask of predefinedItems) {
      // Check WIP limit
      if (targetColumn.wipLimit) {
        const currentTaskCount = await prisma.task.count({
          where: { sprintColumnId: columnId }
        })
        
        if (currentTaskCount >= targetColumn.wipLimit) {
          break // Stop adding if we hit the WIP limit
        }
      }
      
      // Create a copy of the predefined task
      const newTask = await prisma.task.create({
        data: {
          title: predefinedTask.title,
          description: predefinedTask.description,
          taskType: predefinedTask.taskType,
          priority: predefinedTask.priority,
          storyPoints: predefinedTask.storyPoints,
          estimatedHours: predefinedTask.estimatedHours,
          sprintColumnId: columnId,
          boardId: predefinedTask.boardId,
          createdBy: user.id
        },
        include: {
          taskAssignees: {
            select: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  avatarUrl: true
                }
              }
            }
          }
        }
      })
      
      // Add to sprint
      await prisma.sprintTask.create({
        data: {
          sprintId: sprintId,
          taskId: newTask.id
        }
      })
      
      addedTasks.push(newTask)
    }
    
    return NextResponse.json({
      message: `Added ${addedTasks.length} predefined items to ${targetColumn.name}`,
      tasks: addedTasks
    })
  } catch (error: unknown) {
    console.error('Error adding predefined items:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add predefined items' },
      { status: 500 }
    )
  }
}