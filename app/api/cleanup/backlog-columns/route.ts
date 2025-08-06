import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

/**
 * Cleanup API endpoint to remove sprint columns from Backlog sprints
 * This fixes the architecture violation where Backlog sprints had columns created
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)

    // Find all Backlog sprints that incorrectly have sprint columns
    const backlogSprintsWithColumns = await prisma.sprint.findMany({
      where: {
        isBacklog: true,
        isDeleted: false,
        sprintColumns: {
          some: {} // Has at least one sprint column
        }
      },
      include: {
        sprintColumns: true,
        board: {
          select: {
            id: true,
            name: true,
            organizationId: true
          }
        },
        _count: {
          select: {
            tasks: true
          }
        }
      }
    })

    if (backlogSprintsWithColumns.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No Backlog sprints with columns found. Architecture is already correct.',
        cleaned: []
      })
    }

    const cleanupResults = []

    // Process each Backlog sprint
    for (const sprint of backlogSprintsWithColumns) {
      // Check if user has access to this organization
      const orgMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId: sprint.board.organizationId,
          userId: user.id
        }
      })

      if (!orgMember) {
        console.warn(`User ${user.id} doesn't have access to organization ${sprint.board.organizationId}`)
        continue
      }

      await prisma.$transaction(async (tx) => {
        // 1. Move any tasks that have sprintColumnId back to just sprintId
        const tasksWithSprintColumn = await tx.task.findMany({
          where: {
            sprintId: sprint.id,
            sprintColumnId: {
              not: null
            }
          },
          select: {
            id: true,
            title: true,
            sprintColumnId: true
          }
        })

        if (tasksWithSprintColumn.length > 0) {
          // Clear sprintColumnId for tasks in this Backlog sprint
          await tx.task.updateMany({
            where: {
              sprintId: sprint.id,
              sprintColumnId: {
                not: null
              }
            },
            data: {
              sprintColumnId: null
            }
          })
        }

        // 2. Delete all sprint columns for this Backlog sprint
        const deletedColumns = await tx.sprintColumn.deleteMany({
          where: {
            sprintId: sprint.id
          }
        })

        cleanupResults.push({
          sprintId: sprint.id,
          sprintName: sprint.name,
          boardName: sprint.board.name,
          columnsDeleted: deletedColumns.count,
          tasksUpdated: tasksWithSprintColumn.length,
          taskTitles: tasksWithSprintColumn.map(t => t.title)
        })
      })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully cleaned up ${cleanupResults.length} Backlog sprint(s)`,
      cleaned: cleanupResults,
      summary: {
        sprintsCleaned: cleanupResults.length,
        totalColumnsDeleted: cleanupResults.reduce((sum, r) => sum + r.columnsDeleted, 0),
        totalTasksUpdated: cleanupResults.reduce((sum, r) => sum + r.tasksUpdated, 0)
      }
    })

  } catch (error: unknown) {
    console.error('Error cleaning up Backlog sprint columns:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cleanup Backlog sprint columns' 
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check what would be cleaned up (dry run)
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)

    // Find all Backlog sprints that incorrectly have sprint columns
    const backlogSprintsWithColumns = await prisma.sprint.findMany({
      where: {
        isBacklog: true,
        isDeleted: false,
        sprintColumns: {
          some: {} // Has at least one sprint column
        }
      },
      include: {
        sprintColumns: {
          select: {
            id: true,
            name: true,
            position: true
          }
        },
        board: {
          select: {
            id: true,
            name: true,
            organizationId: true
          }
        },
        tasks: {
          where: {
            sprintColumnId: {
              not: null
            }
          },
          select: {
            id: true,
            title: true,
            sprintColumnId: true
          }
        },
        _count: {
          select: {
            tasks: true,
            sprintColumns: true
          }
        }
      }
    })

    // Filter by user access
    const accessibleSprints = []
    for (const sprint of backlogSprintsWithColumns) {
      const orgMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId: sprint.board.organizationId,
          userId: user.id
        }
      })

      if (orgMember) {
        accessibleSprints.push(sprint)
      }
    }

    return NextResponse.json({
      message: `Found ${accessibleSprints.length} Backlog sprint(s) with columns that need cleanup`,
      sprints: accessibleSprints.map(sprint => ({
        sprintId: sprint.id,
        sprintName: sprint.name,
        boardName: sprint.board.name,
        columnsToDelete: sprint.sprintColumns.length,
        columnNames: sprint.sprintColumns.map(c => c.name),
        tasksWithColumns: sprint.tasks.length,
        taskTitles: sprint.tasks.map(t => t.title)
      })),
      summary: {
        totalSprints: accessibleSprints.length,
        totalColumnsToDelete: accessibleSprints.reduce((sum, s) => sum + s.sprintColumns.length, 0),
        totalTasksToUpdate: accessibleSprints.reduce((sum, s) => sum + s.tasks.length, 0)
      }
    })

  } catch (error: unknown) {
    console.error('Error checking Backlog sprint columns:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to check Backlog sprint columns' 
      },
      { status: 500 }
    )
  }
}