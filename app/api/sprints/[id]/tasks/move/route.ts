import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'
import { revalidateTag } from 'next/cache'

const moveTaskSchema = z.object({
  taskId: z.string(),
  targetColumnId: z.string(),
  position: z.number().int().min(0).optional()
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sprintId } = await params
    const supabase = await createClient()
    const body = await req.json()
    
    // Validate input
    const { taskId, targetColumnId, position } = moveTaskSchema.parse(body)
    
    // Get current user
    const user = await getCurrentUser(supabase)
    
    // Check if user has access to the sprint
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      select: { boardId: true }
    })
    
    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
    }
    
    // Check if user has access to the board through organization membership
    const board = await prisma.board.findUnique({
      where: { id: sprint.boardId },
      select: { organizationId: true }
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
    
    // Verify the target column belongs to this sprint
    const targetColumn = await prisma.sprintColumn.findFirst({
      where: {
        id: targetColumnId,
        sprintId: sprintId
      }
    })
    
    if (!targetColumn) {
      return NextResponse.json({ error: 'Target column not found' }, { status: 404 })
    }
    
    // Check WIP limit
    if (targetColumn.wipLimit) {
      const currentTaskCount = await prisma.task.count({
        where: { sprintColumnId: targetColumnId }
      })
      
      if (currentTaskCount >= targetColumn.wipLimit) {
        return NextResponse.json(
          { error: `Column has reached its WIP limit of ${targetColumn.wipLimit}` },
          { status: 400 }
        )
      }
    }
    
    // Update task's sprint column
    const updateData: any = {
      sprintColumnId: targetColumnId
    }

    // Include position if provided
    if (position !== undefined) {
      updateData.position = position
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
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
    
    // Invalidate the cache for sprint columns to ensure fresh data
    revalidateTag('sprint-columns')
    
    return NextResponse.json(updatedTask)
  } catch (error: unknown) {
    console.error('Error moving task:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to move task' },
      { status: 500 }
    )
  }
}