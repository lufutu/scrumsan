import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params

    const labels = await prisma.label.findMany({
      where: {
        boardId: boardId,
      },
      include: {
        taskLabels: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
                storyPoints: true,
                loggedHours: true,
                estimatedHours: true,
                taskType: true,
                priority: true,
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
                }
              }
            }
          }
        },
        _count: {
          select: {
            taskLabels: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Calculate statistics for each label
    const labelsWithStats = labels.map(label => {
      const tasks = label.taskLabels.map(tl => tl.task)
      const totalPoints = tasks.reduce((sum, task) => sum + (task.storyPoints || 0), 0)
      const totalLoggedTime = tasks.reduce((sum, task) => sum + (task.loggedHours || 0), 0)
      
      // Get unique assignees
      const assignees = Array.from(
        new Map(
          tasks
            .filter(task => task.assignee)
            .map(task => [task.assignee!.id, task.assignee])
        ).values()
      )

      return {
        id: label.id,
        name: label.name,
        description: label.description,
        color: label.color,
        createdAt: label.createdAt,
        itemCount: label._count.taskLabels,
        totalPoints,
        totalLoggedTime,
        assignees,
        tasks
      }
    })

    return NextResponse.json(labelsWithStats)
  } catch (error) {
    console.error('Failed to fetch labels:', error)
    return NextResponse.json({ error: 'Failed to fetch labels' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params
    const { name, description, color } = await request.json()

    const label = await prisma.label.create({
      data: {
        boardId,
        name,
        description,
        color: color || '#3B82F6'
      }
    })

    return NextResponse.json(label)
  } catch (error) {
    console.error('Failed to create label:', error)
    return NextResponse.json({ error: 'Failed to create label' }, { status: 500 })
  }
}