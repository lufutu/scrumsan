import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'

const worklogSchema = z.object({
  description: z.string().min(1).max(1000),
  hoursLogged: z.number().min(0.1).max(24),
  dateLogged: z.string().optional(),
  startDate: z.string().optional()
})

// GET /api/tasks/[id]/worklog - Get all worklog entries for a task
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { id: taskId } = await params

    // Verify task exists and user has access
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        board: {
          select: {
            organizationId: true
          }
        }
      }
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // Check access to organization
    if (task.board?.organizationId) {
      const orgMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId: task.board.organizationId,
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get all worklog entries for this task
    const worklogEntries = await prisma.taskWorklog.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true
          }
        }
      },
      orderBy: { dateLogged: 'desc' }
    })

    return NextResponse.json(worklogEntries)
  } catch (error: unknown) {
    console.error('Error fetching task worklog:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch task worklog' },
      { status: 500 }
    )
  }
}

// POST /api/tasks/[id]/worklog - Add a new worklog entry
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { id: taskId } = await params
    const body = await req.json()
    
    const validatedData = worklogSchema.parse(body)

    // Verify task exists and user has access
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        board: {
          select: {
            organizationId: true
          }
        }
      }
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // Check access to organization
    if (task.board?.organizationId) {
      const orgMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId: task.board.organizationId,
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Create the worklog entry
    const worklogEntry = await prisma.taskWorklog.create({
      data: {
        taskId,
        userId: user.id,
        description: validatedData.description,
        hoursLogged: validatedData.hoursLogged,
        dateLogged: validatedData.dateLogged ? new Date(validatedData.dateLogged) : new Date(),
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true
          }
        }
      }
    })

    // Update task's logged hours
    const totalLoggedHours = await prisma.taskWorklog.aggregate({
      where: { taskId },
      _sum: { hoursLogged: true }
    })

    await prisma.task.update({
      where: { id: taskId },
      data: {
        loggedHours: totalLoggedHours._sum.hoursLogged || 0
      }
    })

    return NextResponse.json(worklogEntry)
  } catch (error: unknown) {
    console.error('Error creating task worklog:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create task worklog' },
      { status: 500 }
    )
  }
}