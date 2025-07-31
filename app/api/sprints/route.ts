import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

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
    const includeDetails = url.searchParams.get('includeDetails') === 'true'

    let whereClause: Record<string, unknown> = {
      isDeleted: false // Always exclude deleted sprints
    }

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

    const includeClause = includeDetails ? {
      board: {
        select: {
          id: true,
          name: true,
          organizationId: true
        }
      },
      tasks: {
        select: {
          id: true,
          title: true,
          description: true,
          taskType: true,
          priority: true,
          storyPoints: true,
          dueDate: true,
          createdAt: true,
          updatedAt: true,
          position: true,
          boardId: true,
          sprintId: true,
          columnId: true,
          sprintColumnId: true,
          board: {
            select: {
              id: true,
              name: true,
              organizationId: true
            }
          },
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
          },
          taskLabels: {
            select: {
              label: {
                select: {
                  id: true,
                  color: true,
                  name: true
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
          tasks: true
        }
      }
    } : {
      _count: {
        select: {
          tasks: true
        }
      }
    }

    const sprints = await prisma.sprint.findMany({
      where: whereClause,
      include: includeClause as Prisma.SprintInclude,
      orderBy: {
        position: 'asc'
      }
    })

    return NextResponse.json(sprints)
  } catch (error: unknown) {
    console.error('Error fetching sprints:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch sprints' },
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

    // Get the highest position for ordering
    const lastSprint = await prisma.sprint.findFirst({
      where: {
        boardId: validatedData.boardId,
        isDeleted: false
      },
      orderBy: { position: 'desc' }
    })

    const nextPosition = (lastSprint?.position ?? 0) + 1

    // Create sprint with default columns in a transaction
    const sprint = await prisma.$transaction(async (tx) => {
      // Create the sprint
      const newSprint = await tx.sprint.create({
        data: {
          name: validatedData.name,
          goal: validatedData.goal || null,
          boardId: validatedData.boardId,
          startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
          endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
          status: validatedData.status || 'planning',
          position: nextPosition,
        }
      })

      // Create default columns for the sprint
      const defaultColumns = [
        { name: 'To Do', position: 0, isDone: false },
        { name: 'In Progress', position: 1, isDone: false },
        { name: 'Done', position: 2, isDone: true }
      ]

      await tx.sprintColumn.createMany({
        data: defaultColumns.map(col => ({
          ...col,
          sprintId: newSprint.id
        }))
      })

      // Return sprint with all relationships
      return await tx.sprint.findUnique({
        where: { id: newSprint.id },
        include: {
          board: {
            select: {
              id: true,
              name: true
            }
          },
          sprintColumns: {
            orderBy: { position: 'asc' }
          },
          _count: {
            select: {
              tasks: true
            }
          }
        }
      })
    })

    return NextResponse.json(sprint)
  } catch (error: unknown) {
    console.error('Error creating sprint:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create sprint' },
      { status: 500 }
    )
  }
}