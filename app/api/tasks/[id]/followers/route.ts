import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)

    // Verify user has access to this task
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        board: {
          organization: {
            members: {
              some: {
                userId: user.id
              }
            }
          }
        }
      }
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found or access denied' },
        { status: 404 }
      )
    }

    const followers = await prisma.taskFollower.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    return NextResponse.json(followers)

  } catch (error) {
    console.error('Error fetching task followers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch followers' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    const body = await request.json()
    const { userId } = body

    // Verify user has access to this task
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        board: {
          organization: {
            members: {
              some: {
                userId: user.id
              }
            }
          }
        }
      }
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found or access denied' },
        { status: 404 }
      )
    }

    // Verify the user being added as follower exists and has access to the organization
    const targetUser = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationMembers: {
          some: {
            organization: {
              boards: {
                some: {
                  id: task.boardId
                }
              }
            }
          }
        }
      }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found or no access to this board' },
        { status: 404 }
      )
    }

    const follower = await prisma.taskFollower.upsert({
      where: {
        taskId_userId: {
          taskId,
          userId
        }
      },
      update: {},
      create: {
        taskId,
        userId
      },
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
    })

    return NextResponse.json(follower)

  } catch (error) {
    console.error('Error adding task follower:', error)
    return NextResponse.json(
      { error: 'Failed to add follower' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this task
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        board: {
          organization: {
            members: {
              some: {
                userId: user.id
              }
            }
          }
        }
      }
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found or access denied' },
        { status: 404 }
      )
    }

    await prisma.taskFollower.deleteMany({
      where: {
        taskId,
        userId
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error removing task follower:', error)
    return NextResponse.json(
      { error: 'Failed to remove follower' },
      { status: 500 }
    )
  }
}