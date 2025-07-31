import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { createClient } from '@/lib/supabase/server'
import { BoardNotificationTriggers } from '@/lib/notification-triggers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)

    // Verify user has access to this board
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        organization: {
          members: {
            some: {
              userId: user.id
            }
          }
        }
      }
    })

    if (!board) {
      return NextResponse.json(
        { error: 'Board not found or access denied' },
        { status: 404 }
      )
    }

    const members = await prisma.boardMember.findMany({
      where: { boardId },
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

    return NextResponse.json(members)

  } catch (error) {
    console.error('Error fetching board members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch board members' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    const body = await request.json()
    const { userId, role = 'member' } = body

    // Verify user has admin access to this board
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        organization: {
          members: {
            some: {
              userId: user.id,
              role: { in: ['owner', 'admin'] }
            }
          }
        }
      }
    })

    if (!board) {
      return NextResponse.json(
        { error: 'Board not found or insufficient permissions' },
        { status: 404 }
      )
    }

    // Verify the user being added exists and has access to the organization
    const targetUser = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationMembers: {
          some: {
            organizationId: board.organizationId
          }
        }
      }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found or not a member of this organization' },
        { status: 404 }
      )
    }

    const member = await prisma.boardMember.upsert({
      where: {
        boardId_userId: {
          boardId,
          userId
        }
      },
      update: { role },
      create: {
        boardId,
        userId,
        role
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

    // Trigger board member added notification
    try {
      await BoardNotificationTriggers.onBoardMemberAdded(
        boardId,
        userId,
        user.id,
        board.organizationId
      )
    } catch (notificationError) {
      // Don't fail the member addition if notifications fail
      console.error('Error sending board member notification:', notificationError)
    }

    return NextResponse.json(member)

  } catch (error) {
    console.error('Error adding board member:', error)
    return NextResponse.json(
      { error: 'Failed to add board member' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params
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

    // Verify user has admin access to this board
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        organization: {
          members: {
            some: {
              userId: user.id,
              role: { in: ['owner', 'admin'] }
            }
          }
        }
      }
    })

    if (!board) {
      return NextResponse.json(
        { error: 'Board not found or insufficient permissions' },
        { status: 404 }
      )
    }

    await prisma.boardMember.deleteMany({
      where: {
        boardId,
        userId
      }
    })

    // Trigger board member removed notification
    try {
      await BoardNotificationTriggers.onBoardMemberRemoved(
        boardId,
        userId,
        user.id,
        board.organizationId
      )
    } catch (notificationError) {
      // Don't fail the member removal if notifications fail  
      console.error('Error sending board member removal notification:', notificationError)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error removing board member:', error)
    return NextResponse.json(
      { error: 'Failed to remove board member' },
      { status: 500 }
    )
  }
}