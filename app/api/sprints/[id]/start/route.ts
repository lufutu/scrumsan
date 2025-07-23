import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    // Get sprint with board info
    const sprint = await prisma.sprint.findUnique({
      where: { id },
      include: {
        board: {
          select: {
            id: true,
            organizationId: true
          }
        }
      }
    })
    
    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
    }
    
    // Check if sprint is already active
    if (sprint.status === 'active') {
      return NextResponse.json({ error: 'Sprint is already active' }, { status: 400 })
    }
    
    // Prevent starting backlog sprint
    if (sprint.isBacklog) {
      return NextResponse.json({ error: 'Cannot start the Backlog sprint' }, { status: 400 })
    }
    
    // Check permissions
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: sprint.board.organizationId,
        userId: user.id
      }
    })
    
    if (!orgMember) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // Check if another sprint is already active
    const activeSprint = await prisma.sprint.findFirst({
      where: {
        boardId: sprint.boardId,
        status: 'active',
        isDeleted: false
      }
    })
    
    if (activeSprint) {
      return NextResponse.json({ 
        error: 'Another sprint is already active. Please finish it before starting a new one.',
        activeSprintName: activeSprint.name 
      }, { status: 400 })
    }
    
    // Prepare update data
    const updateData: any = {
      status: 'active',
      startDate: new Date()
    }
    
    // Add optional fields if provided
    if (body.endDate) {
      updateData.endDate = new Date(body.endDate)
    }
    if (body.goal !== undefined) {
      updateData.goal = body.goal
    }
    
    // Check if sprint already has columns, if not create default ones
    const existingColumns = await prisma.sprintColumn.findMany({
      where: { sprintId: id }
    })
    
    if (existingColumns.length === 0) {
      // Create default sprint columns
      await prisma.sprintColumn.createMany({
        data: [
          {
            sprintId: id,
            name: 'To Do',
            position: 0,
            isDone: false
          },
          {
            sprintId: id,
            name: 'In Progress',
            position: 1,
            isDone: false
          },
          {
            sprintId: id,
            name: 'Done',
            position: 2,
            isDone: true
          }
        ]
      })
    }
    
    // Start the sprint
    const updatedSprint = await prisma.sprint.update({
      where: { id },
      data: updateData,
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
        tasks: {
          select: {
            id: true,
            title: true,
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
          }
        },
        _count: {
          select: {
            tasks: true
          }
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      sprint: updatedSprint,
      message: `Sprint "${sprint.name}" has been started successfully!`
    })
  } catch (error: any) {
    console.error('Error starting sprint:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to start sprint' },
      { status: 500 }
    )
  }
}