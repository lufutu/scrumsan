import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'

const linkBoardSchema = z.object({
  boardId: z.string().uuid('Board ID must be a valid UUID'),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    // Check if user has access to this project
    const projectMember = await prisma.projectMember.findFirst({
      where: {
        projectId: projectId,
        userId: user.id
      }
    })
    
    if (!projectMember) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // Get linked boards for this project
    const linkedBoards = await prisma.projectBoard.findMany({
      where: {
        projectId: projectId
      },
      include: {
        board: {
          select: {
            id: true,
            name: true,
            boardType: true,
            color: true,
            description: true,
            createdAt: true,
            _count: {
              select: {
                tasks: true,
                columns: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json(linkedBoards)
  } catch (error: any) {
    console.error('Error fetching project boards:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch project boards' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const body = await req.json()
    
    // Validate input
    const validatedData = linkBoardSchema.parse(body)
    
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    // Check if user has admin access to this project
    const projectMember = await prisma.projectMember.findFirst({
      where: {
        projectId: projectId,
        userId: user.id,
        role: {
          in: ['owner', 'admin']
        }
      }
    })
    
    if (!projectMember) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // Verify the board exists and user has access to it
    const board = await prisma.board.findFirst({
      where: {
        id: validatedData.boardId,
        organization: {
          members: {
            some: {
              userId: user.id
            }
          }
        }
      }
    })
    
    if (!board) {
      return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 })
    }
    
    // Check if already linked
    const existingLink = await prisma.projectBoard.findFirst({
      where: {
        projectId: projectId,
        boardId: validatedData.boardId
      }
    })
    
    if (existingLink) {
      return NextResponse.json({ error: 'Board is already linked to this project' }, { status: 400 })
    }
    
    // Create the link
    const projectBoard = await prisma.projectBoard.create({
      data: {
        projectId: projectId,
        boardId: validatedData.boardId
      },
      include: {
        board: {
          select: {
            id: true,
            name: true,
            boardType: true,
            color: true,
            description: true,
            createdAt: true,
            _count: {
              select: {
                tasks: true,
                columns: true
              }
            }
          }
        }
      }
    })
    
    
    return NextResponse.json(projectBoard)
  } catch (error: any) {
    console.error('Error linking board to project:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to link board to project' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const { searchParams } = new URL(req.url)
    const boardId = searchParams.get('boardId')
    
    if (!boardId) {
      return NextResponse.json({ error: 'Board ID is required' }, { status: 400 })
    }
    
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    // Check if user has admin access to this project
    const projectMember = await prisma.projectMember.findFirst({
      where: {
        projectId: projectId,
        userId: user.id,
        role: {
          in: ['owner', 'admin']
        }
      }
    })
    
    if (!projectMember) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // Find and delete the link
    const projectBoard = await prisma.projectBoard.findFirst({
      where: {
        projectId: projectId,
        boardId: boardId
      }
    })
    
    if (!projectBoard) {
      return NextResponse.json({ error: 'Board link not found' }, { status: 404 })
    }
    
    await prisma.projectBoard.delete({
      where: {
        id: projectBoard.id
      }
    })
    
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error unlinking board from project:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to unlink board from project' },
      { status: 500 }
    )
  }
}