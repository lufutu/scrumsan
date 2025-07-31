import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

export async function GET(
  req: NextRequest,
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

    const activities = await prisma.taskActivity.findMany({
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

    return NextResponse.json(activities)
  } catch (error: unknown) {
    console.error('Error fetching task activities:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch activities' },
      { status: 500 }
    )
  }
}