import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    // Check if user has access to this project
    const projectMember = await prisma.projectMember.findFirst({
      where: {
        projectId: projectId,
        userId: user.id
      }
    })
    
    if (!projectMember) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // Get the project to access its organization
    const project = await prisma.project.findUnique({
      where: {
        id: projectId
      },
      select: {
        organizationId: true
      }
    })
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    
    // Get already linked board IDs
    const linkedBoardIds = await prisma.projectBoard.findMany({
      where: {
        projectId: projectId
      },
      select: {
        boardId: true
      }
    })
    
    const linkedIds = linkedBoardIds.map(link => link.boardId)
    
    // Get available boards from the same organization that are not already linked
    const availableBoards = await prisma.board.findMany({
      where: {
        organizationId: project.organizationId,
        id: {
          notIn: linkedIds
        }
      },
      select: {
        id: true,
        name: true,
        boardType: true,
        color: true,
        description: true,
        createdAt: true,
        _count: {
          select: {
            tasks: true,
            columns: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json(availableBoards)
  } catch (error: unknown) {
    console.error('Error fetching available boards:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch available boards' },
      { status: 500 }
    )
  }
}