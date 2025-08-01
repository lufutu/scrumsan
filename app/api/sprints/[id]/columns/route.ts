import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'
import { unstable_cache, revalidateTag } from 'next/cache'

const sprintColumnCreateSchema = z.object({
  name: z.string().min(1, 'Column name is required'),
  position: z.number().int().min(0),
  isDone: z.boolean().optional().default(false),
  wipLimit: z.number().int().min(0).optional()
})

// Cached sprint columns fetching function
const getCachedSprintColumns = unstable_cache(
  async (sprintId: string, userId: string) => {
    // Check if user has access to the sprint
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      select: { boardId: true }
    })
    
    if (!sprint) {
      return null
    }
    
    // Check if user has access to the board through organization membership
    const board = await prisma.board.findUnique({
      where: { id: sprint.boardId },
      select: { organizationId: true }
    })
    
    if (board) {
      const orgMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId: board.organizationId,
          userId: userId
        }
      })
      
      if (!orgMember) {
        return null
      }
    }
    
    // Get sprint columns
    const columns = await prisma.sprintColumn.findMany({
      where: { sprintId },
      orderBy: { position: 'asc' },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            description: true,
            taskType: true,
            priority: true,
            storyPoints: true,
            dueDate: true,
            createdAt: true,
            updatedAt: true,
            taskAssignees: {
              select: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    avatarUrl: true
                  }
                }
              }
            },
            taskLabels: {
              select: {
                label: {
                  select: {
                    id: true,
                    name: true,
                    color: true
                  }
                }
              }
            },
            _count: {
              select: {
                comments: true,
                attachments: true
              }
            }
          }
        }
      }
    })
    
    return columns
  },
  ['sprint-columns'],
  {
    revalidate: 30 // Cache for 30 seconds
  }
)

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sprintId } = await params
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    // Use cached sprint columns data
    const columns = await getCachedSprintColumns(sprintId, user.id)
    
    if (columns === null) {
      return NextResponse.json({ error: 'Sprint not found or unauthorized' }, { status: 404 })
    }
    
    return NextResponse.json(columns)
  } catch (error: unknown) {
    console.error('Error fetching sprint columns:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch sprint columns' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sprintId } = await params
    const supabase = await createClient()
    const body = await req.json()
    
    // Validate input
    const validatedData = sprintColumnCreateSchema.parse(body)
    
    // Get current user
    const user = await getCurrentUser(supabase)
    
    // Check if user has access to the sprint
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      select: { boardId: true }
    })
    
    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
    }
    
    // Check if user has access to the board through organization membership
    const board = await prisma.board.findUnique({
      where: { id: sprint.boardId },
      select: { organizationId: true }
    })
    
    if (board) {
      const orgMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId: board.organizationId,
          userId: user.id
        }
      })
      
      if (!orgMember) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }
    
    // Create sprint column
    const column = await prisma.sprintColumn.create({
      data: {
        sprintId,
        name: validatedData.name,
        position: validatedData.position,
        isDone: validatedData.isDone,
        wipLimit: validatedData.wipLimit
      },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            description: true,
            taskType: true,
            priority: true,
            storyPoints: true,
            dueDate: true,
            createdAt: true,
            updatedAt: true,
            taskAssignees: {
              select: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    avatarUrl: true
                  }
                }
              }
            },
            taskLabels: {
              select: {
                label: {
                  select: {
                    id: true,
                    name: true,
                    color: true
                  }
                }
              }
            },
            _count: {
              select: {
                comments: true,
                attachments: true
              }
            }
          }
        }
      }
    })
    
    // Invalidate the cache for sprint columns
    revalidateTag('sprint-columns')
    
    return NextResponse.json(column)
  } catch (error: unknown) {
    console.error('Error creating sprint column:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create sprint column' },
      { status: 500 }
    )
  }
}