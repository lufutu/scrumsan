import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    // Check if user has access to the board
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: {
        id: true,
        organizationId: true
      }
    })
    
    if (!board) {
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      )
    }
    
    // Check user access through organization membership
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: board.organizationId,
        userId: user.id
      }
    })
    
    if (!orgMember) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Get all sprint columns for all sprints on this board
    const sprintColumns = await prisma.sprintColumn.findMany({
      where: {
        sprint: {
          boardId: boardId,
          isDeleted: false
        }
      },
      include: {
        sprint: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      },
      orderBy: [
        { sprint: { position: 'asc' } },
        { position: 'asc' }
      ]
    })
    
    // Group by sprint and return structured data
    const columnsBySprintId = sprintColumns.reduce((acc, column) => {
      const sprintId = column.sprintId
      if (!acc[sprintId]) {
        acc[sprintId] = {
          sprintId,
          sprintName: column.sprint.name,
          sprintStatus: column.sprint.status,
          columns: []
        }
      }
      acc[sprintId].columns.push({
        id: column.id,
        name: column.name,
        position: column.position,
        isDone: column.isDone,
        wipLimit: column.wipLimit
      })
      return acc
    }, {} as Record<string, {
      sprintId: string;
      sprintName: string;
      sprintStatus: string | null;
      columns: Array<{
        id: string;
        name: string;
        position: number;
        isDone: boolean;
        wipLimit: number | null;
      }>;
    }>)
    
    return NextResponse.json(Object.values(columnsBySprintId))
  } catch (error: unknown) {
    console.error('Error fetching sprint columns:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch sprint columns' },
      { status: 500 }
    )
  }
}