import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'

const relationSchema = z.object({
  targetTaskId: z.string().uuid(),
  relationType: z.enum(['blocks', 'duplicates', 'relates_to'])
})

const parentUpdateSchema = z.object({
  parentId: z.string().uuid().nullable()
})

// GET /api/tasks/[id]/relations - Get all relations for a task
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
            organizationId: true,
            projectLinks: {
              select: {
                projectId: true
              }
            }
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

    // Get all relationships
    const [
      parentTask,
      subitems,
      blockingRelations,
      blockedByRelations,
      otherRelations
    ] = await Promise.all([
      // Parent task
      task.parentId ? prisma.task.findUnique({
        where: { id: task.parentId },
        select: {
          id: true,
          title: true,
          taskType: true,
          itemCode: true
        }
      }) : null,
      
      // Subitems (children)
      prisma.task.findMany({
        where: { parentId: taskId },
        select: {
          id: true,
          title: true,
          taskType: true,
          itemCode: true,
          assignee: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      }),
      
      // Tasks this task is blocking
      prisma.taskRelation.findMany({
        where: {
          sourceTaskId: taskId,
          relationType: 'blocks'
        },
        include: {
          targetTask: {
            select: {
              id: true,
              title: true,
              taskType: true,
                  itemCode: true
            }
          }
        }
      }),
      
      // Tasks blocking this task
      prisma.taskRelation.findMany({
        where: {
          targetTaskId: taskId,
          relationType: 'blocks'
        },
        include: {
          sourceTask: {
            select: {
              id: true,
              title: true,
              taskType: true,
                  itemCode: true
            }
          }
        }
      }),
      
      // Other relations (duplicates, relates_to)
      prisma.taskRelation.findMany({
        where: {
          OR: [
            { sourceTaskId: taskId, relationType: { in: ['duplicates', 'relates_to'] } },
            { targetTaskId: taskId, relationType: { in: ['duplicates', 'relates_to'] } }
          ]
        },
        include: {
          sourceTask: {
            select: {
              id: true,
              title: true,
              taskType: true,
                  itemCode: true
            }
          },
          targetTask: {
            select: {
              id: true,
              title: true,
              taskType: true,
                  itemCode: true
            }
          }
        }
      })
    ])

    return NextResponse.json({
      parent: parentTask,
      subitems,
      blocking: blockingRelations.map(r => r.targetTask),
      blockedBy: blockedByRelations.map(r => r.sourceTask),
      related: otherRelations.map(r => ({
        ...r,
        relatedTask: r.sourceTaskId === taskId ? r.targetTask : r.sourceTask,
        direction: r.sourceTaskId === taskId ? 'outgoing' : 'incoming'
      }))
    })
  } catch (error: unknown) {
    console.error('Error fetching task relations:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch task relations' },
      { status: 500 }
    )
  }
}

// POST /api/tasks/[id]/relations - Add a new relation
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { id: taskId } = await params
    const body = await req.json()
    
    const validatedData = relationSchema.parse(body)

    // Verify both tasks exist and user has access
    const [sourceTask, targetTask] = await Promise.all([
      prisma.task.findUnique({
        where: { id: taskId },
        include: {
          board: {
            select: {
              organizationId: true
            }
          }
        }
      }),
      prisma.task.findUnique({
        where: { id: validatedData.targetTaskId },
        include: {
          board: {
            select: {
              organizationId: true
            }
          }
        }
      })
    ])

    if (!sourceTask || !targetTask) {
      return NextResponse.json(
        { error: 'One or both tasks not found' },
        { status: 404 }
      )
    }

    // Check access for both tasks
    const checkAccess = async (task: { board?: { organizationId?: string } }) => {
      if (task.board?.organizationId) {
        const orgMember = await prisma.organizationMember.findFirst({
          where: {
            organizationId: task.board.organizationId,
            userId: user.id
          }
        })
        return !!orgMember
      }
      return false
    }

    const [hasSourceAccess, hasTargetAccess] = await Promise.all([
      checkAccess(sourceTask),
      checkAccess(targetTask)
    ])

    if (!hasSourceAccess || !hasTargetAccess) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Prevent self-relation
    if (taskId === validatedData.targetTaskId) {
      return NextResponse.json(
        { error: 'Cannot create relation to self' },
        { status: 400 }
      )
    }

    // Create the relation
    const relation = await prisma.taskRelation.create({
      data: {
        sourceTaskId: taskId,
        targetTaskId: validatedData.targetTaskId,
        relationType: validatedData.relationType,
        createdBy: user.id
      },
      include: {
        targetTask: {
          select: {
            id: true,
            title: true,
            taskType: true,
              itemCode: true
          }
        }
      }
    })

    return NextResponse.json(relation)
  } catch (error: unknown) {
    console.error('Error creating task relation:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create task relation' },
      { status: 500 }
    )
  }
}

// PUT /api/tasks/[id]/relations - Update parent relationship
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { id: taskId } = await params
    const body = await req.json()
    
    const validatedData = parentUpdateSchema.parse(body)

    // Verify task exists and user has access
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        board: {
          select: {
            projectId: true,
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

    // If setting a parent, verify parent task exists and prevent circular references
    if (validatedData.parentId) {
      const parentTask = await prisma.task.findUnique({
        where: { id: validatedData.parentId }
      })

      if (!parentTask) {
        return NextResponse.json(
          { error: 'Parent task not found' },
          { status: 404 }
        )
      }

      // Prevent self-parent
      if (validatedData.parentId === taskId) {
        return NextResponse.json(
          { error: 'Cannot set task as its own parent' },
          { status: 400 }
        )
      }

      // Check for circular reference (if parent has this task as parent somewhere up the chain)
      const checkCircular = async (parentId: string, originalTaskId: string): Promise<boolean> => {
        const parent = await prisma.task.findUnique({
          where: { id: parentId },
          select: { parentId: true }
        })
        
        if (!parent) return false
        if (parent.parentId === originalTaskId) return true
        if (parent.parentId) return checkCircular(parent.parentId, originalTaskId)
        return false
      }

      const isCircular = await checkCircular(validatedData.parentId, taskId)
      if (isCircular) {
        return NextResponse.json(
          { error: 'Circular parent relationship detected' },
          { status: 400 }
        )
      }
    }

    // Update the parent relationship
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        parentId: validatedData.parentId
      },
      include: {
        parent: {
          select: {
            id: true,
            title: true,
            taskType: true,
              itemCode: true
          }
        }
      }
    })

    return NextResponse.json(updatedTask)
  } catch (error: unknown) {
    console.error('Error updating parent relation:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update parent relation' },
      { status: 500 }
    )
  }
}

// DELETE /api/tasks/[id]/relations?targetTaskId=X&relationType=Y - Remove a relation
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { id: taskId } = await params
    
    const url = new URL(req.url)
    const targetTaskId = url.searchParams.get('targetTaskId')
    const relationType = url.searchParams.get('relationType')

    if (!targetTaskId || !relationType) {
      return NextResponse.json(
        { error: 'targetTaskId and relationType are required' },
        { status: 400 }
      )
    }

    // Verify task exists and user has access
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        board: {
          select: {
            projectId: true,
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

    // Delete the relation (check both directions)
    await prisma.taskRelation.deleteMany({
      where: {
        OR: [
          {
            sourceTaskId: taskId,
            targetTaskId: targetTaskId,
            relationType: relationType
          },
          {
            sourceTaskId: targetTaskId,
            targetTaskId: taskId,
            relationType: relationType
          }
        ]
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error deleting task relation:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete task relation' },
      { status: 500 }
    )
  }
}