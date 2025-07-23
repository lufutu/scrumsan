import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'

const sprintColumnUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  position: z.number().int().min(0).optional(),
  isDone: z.boolean().optional(),
  wipLimit: z.number().int().min(0).optional().nullable()
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; columnId: string }> }
) {
  try {
    const { id: sprintId, columnId } = await params
    const supabase = await createClient()
    const body = await req.json()
    
    // Validate input
    const validatedData = sprintColumnUpdateSchema.parse(body)
    
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
    
    // Check if column exists and belongs to the sprint
    const existingColumn = await prisma.sprintColumn.findFirst({
      where: {
        id: columnId,
        sprintId: sprintId
      }
    })
    
    if (!existingColumn) {
      return NextResponse.json({ error: 'Column not found' }, { status: 404 })
    }
    
    // Prepare update data
    const updateData: Record<string, unknown> = {}
    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.position !== undefined) updateData.position = validatedData.position
    if (validatedData.isDone !== undefined) updateData.isDone = validatedData.isDone
    if (validatedData.wipLimit !== undefined) updateData.wipLimit = validatedData.wipLimit
    
    // Update sprint column
    const column = await prisma.sprintColumn.update({
      where: { id: columnId },
      data: updateData,
      include: {
        tasks: {
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
    })
    
    return NextResponse.json(column)
  } catch (error: unknown) {
    console.error('Error updating sprint column:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update sprint column' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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
    
    // Check if column exists and belongs to the sprint
    const existingColumn = await prisma.sprintColumn.findFirst({
      where: {
        id: columnId,
        sprintId: sprintId
      },
      include: {
        _count: {
          select: {
            tasks: true
          }
        }
      }
    })
    
    if (!existingColumn) {
      return NextResponse.json({ error: 'Column not found' }, { status: 404 })
    }
    
    // Check if column has tasks
    if (existingColumn._count.tasks > 0) {
      return NextResponse.json(
        { error: 'Cannot delete column with tasks. Move tasks to another column first.' },
        { status: 400 }
      )
    }
    
    // Delete sprint column
    await prisma.sprintColumn.delete({
      where: { id: columnId }
    })
    
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error deleting sprint column:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete sprint column' },
      { status: 500 }
    )
  }
}