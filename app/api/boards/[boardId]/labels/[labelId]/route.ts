import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; labelId: string }> }
) {
  try {
    const { labelId } = await params

    const label = await prisma.label.findUnique({
      where: {
        id: labelId,
      },
      include: {
        taskLabels: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
                description: true,
                taskType: true,
                priority: true,
                storyPoints: true,
                loggedHours: true,
                estimatedHours: true,
                createdAt: true,
                assignee: {
                  select: {
                    id: true,
                    fullName: true,
                    avatarUrl: true
                  }
                },
                reviewer: {
                  select: {
                    id: true,
                    fullName: true,
                    avatarUrl: true
                  }
                },
                sprintTasks: {
                  include: {
                    sprint: {
                      select: {
                        id: true,
                        name: true,
                                startDate: true,
                        endDate: true
                      }
                    }
                  }
                },
                column: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!label) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 })
    }

    // Group tasks by sprint/list
    const tasks = label.taskLabels.map(tl => tl.task)
    const tasksBySprint = tasks.reduce((acc, task) => {
      const sprintData = task.sprintTasks[0]?.sprint
      
      if (sprintData) {
        const sprintKey = `sprint-${sprintData.id}`
        if (!acc[sprintKey]) {
          acc[sprintKey] = {
            type: 'sprint',
            id: sprintData.id,
            name: sprintData.name,
            status: sprintData.status,
            startDate: sprintData.startDate?.toISOString() || null,
            endDate: sprintData.endDate?.toISOString() || null,
            tasks: []
          }
        }
        acc[sprintKey].tasks.push(task)
      } else {
        // Tasks not in sprints go to backlog
        if (!acc.backlog) {
          acc.backlog = {
            type: 'backlog',
            id: 'backlog',
            name: 'Product Backlog',
            status: null,
            startDate: null,
            endDate: null,
            tasks: []
          }
        }
        acc.backlog.tasks.push(task)
      }
      
      return acc
    }, {} as Record<string, {
      type: string
      id: string
      name: string
      status: string | null
      startDate: string | null
      endDate: string | null
      tasks: any[]
    }>)

    // Calculate statistics
    const totalPoints = tasks.reduce((sum, task) => sum + (task.storyPoints || 0), 0)
    const totalLoggedTime = tasks.reduce((sum, task) => sum + (task.loggedHours || 0), 0)
    
    const assignees = Array.from(
      new Map(
        tasks
          .filter(task => task.assignee)
          .map(task => [task.assignee!.id, task.assignee])
      ).values()
    )

    const statistics = {
      totalTasks: tasks.length,
      totalPoints,
      totalLoggedTime,
      completedTasks: tasks.filter(task => task.column?.name?.toLowerCase().includes('done')).length,
      assignees
    }

    return NextResponse.json({
      ...label,
      tasksBySprint: Object.values(tasksBySprint),
      statistics
    })
  } catch (error) {
    console.error('Failed to fetch label:', error)
    return NextResponse.json({ error: 'Failed to fetch label' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; labelId: string }> }
) {
  try {
    const { labelId } = await params
    const { name, description, color } = await request.json()

    const label = await prisma.label.update({
      where: {
        id: labelId,
      },
      data: {
        name,
        description,
        color
      }
    })

    return NextResponse.json(label)
  } catch (error) {
    console.error('Failed to update label:', error)
    return NextResponse.json({ error: 'Failed to update label' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; labelId: string }> }
) {
  try {
    const { labelId } = await params

    await prisma.label.delete({
      where: {
        id: labelId,
      }
    })

    return NextResponse.json({ message: 'Label deleted successfully' })
  } catch (error) {
    console.error('Failed to delete label:', error)
    return NextResponse.json({ error: 'Failed to delete label' }, { status: 500 })
  }
}