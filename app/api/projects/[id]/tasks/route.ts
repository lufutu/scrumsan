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
    const { searchParams } = new URL(req.url)
    const backlog = searchParams.get('backlog') === 'true'
    
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
    
    let whereClause: any = {
      projectId: projectId
    }
    
    // If backlog=true, get tasks not assigned to any sprint
    if (backlog) {
      whereClause.sprintTasks = {
        none: {}
      }
    }
    
    const tasks = await prisma.task.findMany({
      where: whereClause,
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
          include: {
            label: true
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
        }
      },
      orderBy: [
        { priority: 'desc' },
        { position: 'asc' }
      ]
    })
    
    return NextResponse.json(tasks)
  } catch (error: any) {
    console.error('Error fetching project tasks:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}