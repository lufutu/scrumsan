import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'
import { unstable_cache, revalidateTag } from 'next/cache'

const boardUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  boardType: z.enum(['kanban', 'scrum']).optional(),
})

// Optimized board data fetching function - removed caching and over-fetching
const getOptimizedBoardData = async (boardId: string, userId: string) => {
  // First check if user has access to the board
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: {
      id: true,
      name: true,
      description: true,
      color: true,
      boardType: true,
      organizationId: true,
      createdAt: true,
      createdBy: true,
      logo: true
    }
  })

  if (!board) {
    return null
  }

  // Check if user is a member of the organization
  const orgMember = await prisma.organizationMember.findFirst({
    where: {
      organizationId: board.organizationId,
      userId: userId
    }
  })
  
  if (!orgMember) {
    return null
  }

  // Fetch additional data in parallel for better performance
  const [organization, projectLinks, columns, counts] = await Promise.all([
    // Get minimal organization data (no members)
    prisma.organization.findUnique({
      where: { id: board.organizationId },
      select: {
        id: true,
        name: true
      }
    }),
    
    // Get project links
    prisma.projectBoardLink.findMany({
      where: { boardId },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    }),
    
    // Get columns without tasks (tasks loaded separately)
    prisma.boardColumn.findMany({
      where: { boardId },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        name: true,
        position: true,
        _count: {
          select: {
            tasks: true
          }
        }
      }
    }),
    
    // Get counts
    prisma.board.findUnique({
      where: { id: boardId },
      select: {
        _count: {
          select: {
            tasks: true,
            sprints: true
          }
        }
      }
    })
  ])

  return {
    ...board,
    organization,
    projectLinks,
    columns: columns.map(col => ({
      ...col,
      tasks: [] // Tasks will be loaded separately via /api/tasks endpoint
    })),
    _count: counts?._count
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { boardId } = await params
    
    // Use optimized board data fetching
    const board = await getOptimizedBoardData(boardId, user.id)

    if (!board) {
      return NextResponse.json(
        { error: 'Board not found or unauthorized' },
        { status: 404 }
      )
    }

    return NextResponse.json(board)
  } catch (error: unknown) {
    console.error('Error fetching board:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to fetch board' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { boardId } = await params
    const body = await req.json()
    
    // Validate input
    const validatedData = boardUpdateSchema.parse(body)
    
    // Check if board exists and user has access
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: {
        id: true,
        organizationId: true,
        createdBy: true
      }
    })
    
    if (!board) {
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      )
    }
    
    // Check if user is a member of the organization with admin rights
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: board.organizationId,
        userId: user.id,
        role: {
          in: ['owner', 'admin']
        }
      }
    })
    
    // Also allow if user is the board creator
    if (!orgMember && board.createdBy !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - only admins or board creator can edit' },
        { status: 403 }
      )
    }
    
    // Update the board
    const updatedBoard = await prisma.board.update({
      where: { id: boardId },
      data: validatedData,
      include: {
        organization: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            tasks: true,
            sprints: true
          }
        }
      }
    })
    
    // Invalidate the cache for this board
    revalidateTag('board-data')
    
    return NextResponse.json(updatedBoard)
  } catch (error: unknown) {
    console.error('Error updating board:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to update board' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { boardId } = await params
    
    // Check if board exists and user has access
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: {
        id: true,
        organizationId: true,
        createdBy: true,
        _count: {
          select: {
            tasks: true,
            sprints: true,
            projectLinks: true
          }
        }
      }
    })
    
    if (!board) {
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      )
    }
    
    // Check if user is a member of the organization with owner rights
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: board.organizationId,
        userId: user.id,
        role: 'owner'
      }
    })
    
    // Also allow if user is the board creator
    if (!orgMember && board.createdBy !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - only organization owners or board creator can delete' },
        { status: 403 }
      )
    }
    
    // Warn if board has content
    if (board._count.tasks > 0 || board._count.sprints > 0) {
      return NextResponse.json(
        { 
          error: 'Board has content', 
          details: {
            tasks: board._count.tasks,
            sprints: board._count.sprints,
            message: 'Please delete or move all tasks and sprints before deleting the board'
          }
        },
        { status: 400 }
      )
    }
    
    // Delete the board (cascade will handle columns and other relations)
    await prisma.board.delete({
      where: { id: boardId }
    })
    
    return NextResponse.json({ success: true, message: 'Board deleted successfully' })
  } catch (error: unknown) {
    console.error('Error deleting board:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to delete board' },
      { status: 500 }
    )
  }
}