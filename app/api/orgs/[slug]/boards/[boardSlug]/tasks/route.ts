import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; boardSlug: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { slug: orgSlug, boardSlug } = await params

    // 1. First resolve organization by slug
    const organization = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true }
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // 2. Check if user is a member of the organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: organization.id,
        userId: user.id
      }
    })
    
    if (!orgMember) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // 3. Get board by organization + slug
    const board = await prisma.board.findUnique({
      where: {
        organizationId_slug: {
          organizationId: organization.id,
          slug: boardSlug
        }
      },
      select: { id: true }
    })

    if (!board) {
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      )
    }

    // 4. Get tasks for this board (same logic as /api/tasks?boardId=)
    const tasks = await prisma.task.findMany({
      where: { boardId: board.id },
      orderBy: [
        { createdAt: 'desc' }, // Most recent first
        { id: 'asc' } // Stable sort
      ],
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
        },
        creator: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true
          }
        },
        board: {
          select: {
            id: true,
            name: true,
            organizationId: true
          }
        },
        column: {
          select: {
            id: true,
            name: true
          }
        },
        sprintColumn: {
          select: {
            id: true,
            name: true,
            isDone: true
          }
        },
        epic: {
          select: {
            id: true,
            title: true
          }
        },
        subtasks: {
          select: {
            id: true,
            title: true
          }
        },
        parent: {
          select: {
            id: true,
            title: true,
            taskType: true,
            itemCode: true
          }
        },
        relationsAsTarget: {
          where: {
            relationType: 'blocks'
          },
          select: {
            sourceTask: {
              select: {
                id: true,
                title: true,
                taskType: true,
                itemCode: true
              }
            }
          }
        },
        relationsAsSource: {
          where: {
            relationType: 'blocks'
          },
          select: {
            targetTask: {
              select: {
                id: true,
                title: true,
                taskType: true,
                itemCode: true
              }
            }
          }
        }
      }
    })

    // Map tasks to include the 'done' attribute based on sprint column isDone (same as existing API)
    const tasksWithDoneStatus = tasks.map(task => ({
      ...task,
      done: task.sprintColumn?.isDone || false
    }))

    return NextResponse.json({
      tasks: tasksWithDoneStatus,
      pagination: {
        total: tasksWithDoneStatus.length,
        page: 1,
        limit: tasksWithDoneStatus.length,
        totalPages: 1
      }
    })

  } catch (error: unknown) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}