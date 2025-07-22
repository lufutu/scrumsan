import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'

const columnUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  position: z.number().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ boardId: string; columnId: string }> }
) {
  try {
    const { boardId, columnId } = await params
    const supabase = await createClient()
    const body = await req.json()
    
    // Validate input
    const validatedData = columnUpdateSchema.parse(body)
    
    // Get current user
    const user = await getCurrentUser(supabase)
    
    // Check if user has access to the board
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: {
        id: true,
        projectId: true,
        organizationId: true
      }
    })
    
    if (!board) {
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      )
    }
    
    // Check user access
    let hasAccess = false
    
    if (board.projectId) {
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId: board.projectId,
          userId: user.id
        }
      })
      hasAccess = !!projectMember
    } else if (board.organizationId) {
      const orgMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId: board.organizationId,
          userId: user.id
        }
      })
      hasAccess = !!orgMember
    }
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Check if column exists and belongs to the board
    const existingColumn = await prisma.boardColumn.findFirst({
      where: {
        id: columnId,
        boardId: boardId
      }
    })
    
    if (!existingColumn) {
      return NextResponse.json(
        { error: 'Column not found' },
        { status: 404 }
      )
    }
    
    // Prepare update data
    const updateData: any = {}
    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.position !== undefined) updateData.position = validatedData.position
    
    // Update column
    const column = await prisma.boardColumn.update({
      where: { id: columnId },
      data: updateData,
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            priority: true,
            storyPoints: true,
            assignee: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true
              }
            }
          },
          orderBy: [
            { position: 'asc' },
            { createdAt: 'desc' }
          ]
        },
        _count: {
          select: {
            tasks: true
          }
        }
      }
    })
    
    return NextResponse.json(column)
  } catch (error: any) {
    console.error('Error updating board column:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update board column' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ boardId: string; columnId: string }> }
) {
  try {
    const { boardId, columnId } = await params
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    // Check if user has access to the board
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: {
        id: true,
        projectId: true,
        organizationId: true
      }
    })
    
    if (!board) {
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      )
    }
    
    // Check user access
    let hasAccess = false
    
    if (board.projectId) {
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId: board.projectId,
          userId: user.id
        }
      })
      hasAccess = !!projectMember
    } else if (board.organizationId) {
      const orgMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId: board.organizationId,
          userId: user.id
        }
      })
      hasAccess = !!orgMember
    }
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Check if column exists and belongs to the board
    const existingColumn = await prisma.boardColumn.findFirst({
      where: {
        id: columnId,
        boardId: boardId
      }
    })
    
    if (!existingColumn) {
      return NextResponse.json(
        { error: 'Column not found' },
        { status: 404 }
      )
    }
    
    // Check if column has tasks
    const taskCount = await prisma.task.count({
      where: {
        columnId: columnId
      }
    })
    
    if (taskCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete column with tasks. Please move or delete tasks first.' },
        { status: 400 }
      )
    }
    
    // Delete column
    await prisma.boardColumn.delete({
      where: { id: columnId }
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting board column:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete board column' },
      { status: 500 }
    )
  }
}