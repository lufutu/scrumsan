import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'

const sprintSchema = z.object({
  name: z.string().min(1),
  goal: z.string().optional(),
  boardId: z.string().uuid(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['planning', 'active', 'completed']).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    const url = new URL(req.url)
    const boardId = url.searchParams.get('boardId')
    const organizationId = url.searchParams.get('organizationId')
    const status = url.searchParams.get('status')
    
    let whereClause: any = {}
    
    // Filter by board
    if (boardId) {
      whereClause.boardId = boardId
      
      // Check if user has access to the board
      const board = await prisma.board.findUnique({
        where: { id: boardId },
        include: { organization: true }
      })
      
      if (!board) {
        return NextResponse.json(
          { error: 'Board not found' },
          { status: 404 }
        )
      }
      
      // Check if user is a member of the organization
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
    }
    
    // Filter by organization
    if (organizationId && !boardId) {
      // Check if user is a member of the organization
      const orgMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId: organizationId,
          userId: user.id
        }
      })
      
      if (!orgMember) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
      
      // Get sprints from boards in this organization
      whereClause = {
        board: {
          organizationId: organizationId
        }
      }
    }
    
    // If no specific filters, get all sprints user has access to
    if (!boardId && !organizationId) {
      // Get all organizations user is member of
      const userOrgs = await prisma.organizationMember.findMany({
        where: { userId: user.id },
        select: { organizationId: true }
      })
      
      whereClause = {
        board: {
          organizationId: { in: userOrgs.map(o => o.organizationId) }
        }
      }
    }
    
    // Filter by status
    if (status) {
      whereClause.status = status
    }
    
    const sprints = await prisma.sprint.findMany({
      where: whereClause,
      include: {
        board: {
          select: {
            id: true,
            name: true,
            organizationId: true
          }
        },
        sprintTasks: {
          include: {
            task: {
              include: {
                assignee: {
                  select: {
                    id: true,
                    fullName: true,
                    avatarUrl: true
                  }
                }
              }
            }
          }
        },
        sprintColumns: {
          orderBy: { position: 'asc' }
        },
        _count: {
          select: {
            sprintTasks: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json(sprints)
  } catch (error: any) {
    console.error('Error fetching sprints:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sprints' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await req.json()
    
    // Validate input
    const validatedData = sprintSchema.parse(body)
    
    // Get current user
    const user = await getCurrentUser(supabase)
    
    // Validate that user has access to the board
    const board = await prisma.board.findUnique({
      where: { id: validatedData.boardId },
      include: { organization: true }
    })
    
    if (!board) {
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      )
    }
    
    // Check if user is a member of the organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: board.organizationId,
        userId: user.id
      }
    })
    
    if (!orgMember) {
      return NextResponse.json(
        { error: 'You are not a member of this organization' },
        { status: 403 }
      )
    }
    
    // Create sprint
    const sprint = await prisma.sprint.create({
      data: {
        name: validatedData.name,
        goal: validatedData.goal || null,
        boardId: validatedData.boardId,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        status: validatedData.status || 'planning',
      },
      include: {
        board: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            sprintTasks: true
          }
        }
      }
    })

    return NextResponse.json(sprint)
  } catch (error: any) {
    console.error('Error creating sprint:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create sprint' },
      { status: 500 }
    )
  }
}