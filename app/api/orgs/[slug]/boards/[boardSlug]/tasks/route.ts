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
      include: {
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true
              }
            }
          }
        },
        reviewers: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true
              }
            }
          }
        },
        taskLabels: {
          include: {
            label: {
              select: {
                id: true,
                name: true,
                color: true
              }
            }
          }
        },
        subtasks: {
          select: {
            id: true,
            title: true,
            storyPoints: true,
            priority: true,
            itemType: true
          }
        },
        blockedBy: {
          include: {
            blockingTask: {
              select: {
                id: true,
                title: true,
                itemCode: true
              }
            }
          }
        },
        blocking: {
          include: {
            blockedTask: {
              select: {
                id: true,
                title: true,
                itemCode: true
              }
            }
          }
        }
      },
      orderBy: [
        { position: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    // Transform tasks to match expected format
    const transformedTasks = tasks.map(task => ({
      ...task,
      assignees: task.assignees.map(a => a.user),
      reviewers: task.reviewers.map(r => r.user),
      labels: task.taskLabels.map(tl => tl.label),
      blockedBy: task.blockedBy.map(b => b.blockingTask),
      blocking: task.blocking.map(b => b.blockedTask)
    }))

    return NextResponse.json({
      tasks: transformedTasks,
      pagination: {
        total: transformedTasks.length,
        page: 1,
        limit: transformedTasks.length,
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