import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'

const subitemSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  taskType: z.string().optional(),
  assigneeId: z.string().uuid().optional(),
  existingTaskId: z.string().uuid().optional() // For adding existing task as subitem
})

// GET /api/tasks/[id]/subitems - Get subitems for a task
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
    }

    // Get subitems
    const subitems = await prisma.task.findMany({
      where: { parentId: taskId },
      include: {
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
        _count: {
          select: {
            subitems: true,
            comments: true
          }
        }
      },
      orderBy: [
        { position: 'asc' },
        { createdAt: 'asc' }
      ]
    })

    return NextResponse.json(subitems)
  } catch (error: unknown) {
    console.error('Error fetching subitems:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch subitems' },
      { status: 500 }
    )
  }
}

// POST /api/tasks/[id]/subitems - Create a new subitem or add existing task as subitem
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { id: parentTaskId } = await params
    const body = await req.json()
    
    const validatedData = subitemSchema.parse(body)

    // Verify parent task exists and user has access
    const parentTask = await prisma.task.findUnique({
      where: { id: parentTaskId },
      include: {
        board: {
          select: {
            organizationId: true
          }
        }
      }
    })

    if (!parentTask) {
      return NextResponse.json(
        { error: 'Parent task not found' },
        { status: 404 }
      )
    }

    // Check access to organization
    if (parentTask.board?.organizationId) {
      const orgMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId: parentTask.board.organizationId,
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

    let subitem

    if (validatedData.existingTaskId) {
      // Adding existing task as subitem
      const existingTask = await prisma.task.findUnique({
        where: { id: validatedData.existingTaskId }
      })

      if (!existingTask) {
        return NextResponse.json(
          { error: 'Existing task not found' },
          { status: 404 }
        )
      }

      // Prevent circular relationships
      if (existingTask.id === parentTaskId) {
        return NextResponse.json(
          { error: 'Cannot add task as subitem of itself' },
          { status: 400 }
        )
      }

      if (existingTask.parentId === parentTaskId) {
        return NextResponse.json(
          { error: 'Task is already a subitem of this parent' },
          { status: 400 }
        )
      }

      // Check if parent task is already a child of the existing task (circular reference)
      const checkCircular = async (childId: string, potentialParentId: string): Promise<boolean> => {
        const child = await prisma.task.findUnique({
          where: { id: childId },
          select: { parentId: true }
        })
        
        if (!child) return false
        if (child.parentId === potentialParentId) return true
        if (child.parentId) return checkCircular(child.parentId, potentialParentId)
        return false
      }

      const isCircular = await checkCircular(parentTaskId, existingTask.id)
      if (isCircular) {
        return NextResponse.json(
          { error: 'Circular parent relationship detected' },
          { status: 400 }
        )
      }

      // Update existing task to be a subitem
      subitem = await prisma.task.update({
        where: { id: validatedData.existingTaskId },
        data: {
          parentId: parentTaskId
        },
        include: {
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
          _count: {
            select: {
              subitems: true,
              comments: true
            }
          }
        }
      })
    } else {
      // Creating new subitem
      // Get the next position
      const lastSubitem = await prisma.task.findFirst({
        where: { parentId: parentTaskId },
        orderBy: { position: 'desc' },
        select: { position: true }
      })

      const nextPosition = (lastSubitem?.position || 0) + 1

      subitem = await prisma.task.create({
        data: {
          title: validatedData.title,
          description: validatedData.description,
          taskType: validatedData.taskType || 'task',
          parentId: parentTaskId,
          boardId: parentTask.boardId,
          assigneeId: validatedData.assigneeId,
          position: nextPosition,
          createdBy: user.id
        },
        include: {
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
          _count: {
            select: {
              subitems: true,
              comments: true
            }
          }
        }
      })
    }

    return NextResponse.json(subitem)
  } catch (error: unknown) {
    console.error('Error creating subitem:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create subitem' },
      { status: 500 }
    )
  }
}