import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'

const boardSchema = z.object({
  name: z.string().min(1),
  boardType: z.string().optional(),
  organizationId: z.string().uuid(),
  description: z.string().optional(),
  color: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    const url = new URL(req.url)
    const organizationId = url.searchParams.get('organizationId')
    
    let whereClause: any = {}
    
    // Filter by organization
    if (organizationId) {
      whereClause.organizationId = organizationId
      
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
    } else {
      // If no organization specified, get all boards user has access to
      const userOrgs = await prisma.organizationMember.findMany({
        where: { userId: user.id },
        select: { organizationId: true }
      })
      
      whereClause.organizationId = { in: userOrgs.map(o => o.organizationId) }
    }
    
    
    const boards = await prisma.board.findMany({
      where: whereClause,
      include: {
        columns: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            name: true,
            position: true
          }
        },
        organization: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            tasks: true,
            columns: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json(boards)
  } catch (error: any) {
    console.error('Error fetching boards:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch boards' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await req.json()
    
    // Validate input
    const validatedData = boardSchema.parse(body)
    
    // Get current user
    const user = await getCurrentUser(supabase)
    
    // Check if user is a member of the organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: validatedData.organizationId,
        userId: user.id
      }
    })
    
    if (!orgMember) {
      return NextResponse.json(
        { error: 'You are not a member of this organization' },
        { status: 403 }
      )
    }
    
    // Create board with columns in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the board
      const board = await tx.board.create({
        data: {
          name: validatedData.name,
          boardType: validatedData.boardType || 'kanban',
          organizationId: validatedData.organizationId,
          description: validatedData.description || null,
          color: validatedData.color || '#3B82F6',
          createdBy: user.id,
        }
      })
      
      // Create default structure based on board type
      if (validatedData.boardType === 'scrum') {
        // Create Backlog sprint
        const backlogSprint = await tx.sprint.create({
          data: {
            boardId: board.id,
            name: 'Backlog',
            position: 0,
            isBacklog: true,
            status: 'planning'
          }
        })
        
        // Create Sprint 1
        const sprint1 = await tx.sprint.create({
          data: {
            boardId: board.id,
            name: 'Sprint 1',
            position: 1,
            status: 'planning'
          }
        })
        
        // Create default columns for Sprint 1
        const defaultSprintColumns = [
          { name: 'To Do', position: 0, isDone: false },
          { name: 'In Progress', position: 1, isDone: false },
          { name: 'Done', position: 2, isDone: true }
        ]
        
        await tx.sprintColumn.createMany({
          data: defaultSprintColumns.map(col => ({
            ...col,
            sprintId: sprint1.id
          }))
        })
      } else {
        // Kanban board columns
        const defaultColumns = [
          { name: 'To Do', position: 0 },
          { name: 'In Progress', position: 1 },
          { name: 'Done', position: 2 }
        ]
        
        // Create columns
        await tx.boardColumn.createMany({
          data: defaultColumns.map(col => ({
            ...col,
            boardId: board.id
          }))
        })
      }
      
      // Return board with columns and sprints
      return await tx.board.findUnique({
        where: { id: board.id },
        include: {
          columns: {
            orderBy: { position: 'asc' }
          },
          sprints: {
            where: { isDeleted: false },
            orderBy: { position: 'asc' },
            include: {
              sprintColumns: {
                orderBy: { position: 'asc' }
              }
            }
          }
        }
      })
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error creating board:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create board' },
      { status: 500 }
    )
  }
}