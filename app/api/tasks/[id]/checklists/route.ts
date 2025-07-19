import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'

const checklistSchema = z.object({
  name: z.string().min(1).max(255)
})

// GET /api/tasks/[id]/checklists - Get all checklists for a task
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

    // Get all checklists for this task
    const checklists = await prisma.taskChecklist.findMany({
      where: { taskId },
      include: {
        items: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json(checklists)
  } catch (error: unknown) {
    console.error('Error fetching task checklists:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch task checklists' },
      { status: 500 }
    )
  }
}

// POST /api/tasks/[id]/checklists - Add a new checklist
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { id: taskId } = await params
    const body = await req.json()
    
    const validatedData = checklistSchema.parse(body)

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

    // Create the checklist
    const checklist = await prisma.taskChecklist.create({
      data: {
        taskId,
        name: validatedData.name,
        createdBy: user.id
      },
      include: {
        items: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    return NextResponse.json(checklist)
  } catch (error: unknown) {
    console.error('Error creating task checklist:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create task checklist' },
      { status: 500 }
    )
  }
}