import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'

const columnSchema = z.object({
  name: z.string().min(1),
  position: z.number(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    // Check if user has access to the board
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: {
        id: true,
        organizationId: true
      }
    })
    
    if (!board) {
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      )
    }
    
    // Check user access through organization membership
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: board.organizationId,
        userId: user.id
      }
    })
    
    if (!orgMember) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    const columns = await prisma.boardColumn.findMany({
      where: {
        boardId: boardId
      },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            priority: true,
            storyPoints: true,
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
      },
      orderBy: {
        position: 'asc'
      }
    })
    
    return NextResponse.json(columns)
  } catch (error: unknown) {
    console.error('Error fetching board columns:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch board columns' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params
    const supabase = await createClient()
    const body = await req.json()
    
    // Validate input
    const validatedData = columnSchema.parse(body)
    
    // Get current user
    const user = await getCurrentUser(supabase)
    
    // Check if user has access to the board
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: {
        id: true,
        organizationId: true
      }
    })
    
    if (!board) {
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      )
    }
    
    // Check user access through organization membership
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: board.organizationId,
        userId: user.id
      }
    })
    
    if (!orgMember) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Create column
    const column = await prisma.boardColumn.create({
      data: {
        name: validatedData.name,
        position: validatedData.position,
        boardId: boardId
      },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            priority: true,
            storyPoints: true,
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
  } catch (error: unknown) {
    console.error('Error creating board column:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create board column' },
      { status: 500 }
    )
  }
}