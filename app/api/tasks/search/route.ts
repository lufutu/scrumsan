import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

// GET /api/tasks/search?q=query&boardId=xxx&excludeId=xxx
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    const url = new URL(req.url)
    const query = url.searchParams.get('q') || ''
    const boardId = url.searchParams.get('boardId')
    const excludeId = url.searchParams.get('excludeId')
    
    if (!query || query.length < 2) {
      return NextResponse.json([])
    }

    // Build where clause
    const whereClause: any = {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { itemCode: { contains: query, mode: 'insensitive' } }
      ]
    }

    // Filter by board if provided
    if (boardId) {
      whereClause.boardId = boardId
    }

    // Exclude specific task if provided
    if (excludeId) {
      whereClause.NOT = { id: excludeId }
    }

    // Get tasks from boards the user has access to
    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        board: {
          select: {
            id: true,
            name: true,
            organizationId: true
          }
        },
        assignee: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true
          }
        }
      },
      take: 20,
      orderBy: [
        { itemCode: 'asc' },
        { title: 'asc' }
      ]
    })

    // Filter by organization access
    const accessibleTasks = []
    for (const task of tasks) {
      if (task.board?.organizationId) {
        const orgMember = await prisma.organizationMember.findFirst({
          where: {
            organizationId: task.board.organizationId,
            userId: user.id
          }
        })
        
        if (orgMember) {
          accessibleTasks.push({
            id: task.id,
            title: task.title,
            itemCode: task.itemCode,
            taskType: task.taskType,
            boardName: task.board.name,
            assignee: task.assignee
          })
        }
      }
    }

    return NextResponse.json(accessibleTasks)
  } catch (error: unknown) {
    console.error('Error searching tasks:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search tasks' },
      { status: 500 }
    )
  }
}