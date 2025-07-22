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
    
    // Check if user has access to the project
    const projectMember = await prisma.projectMember.findFirst({
      where: {
        projectId: projectId,
        userId: user.id
      }
    })
    
    if (!projectMember) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // Get boards linked to this project first
    const projectBoards = await prisma.projectBoard.findMany({
      where: { projectId },
      select: { boardId: true }
    })
    
    const boardIds = projectBoards.map(pb => pb.boardId)
    
    const sprints = await prisma.sprint.findMany({
      where: {
        boardId: { in: boardIds }
      },
      include: {
        sprintTasks: {
          include: {
            task: {
              include: {
                assignee: {
                  select: {
                    id: true,
                    fullName: true,
                    avatarUrl: true
                  }
                }
              }
            }
          }
        },
        sprintColumns: {
          orderBy: { position: 'asc' }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    // Transform the data to include tasks directly
    const transformedSprints = sprints.map(sprint => ({
      ...sprint,
      tasks: sprint.sprintTasks.map(st => st.task)
    }))
    
    return NextResponse.json(transformedSprints)
  } catch (error: any) {
    console.error('Error fetching project sprints:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sprints' },
      { status: 500 }
    )
  }
}