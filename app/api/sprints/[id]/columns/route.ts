import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'

const sprintColumnCreateSchema = z.object({
  name: z.string().min(1, 'Column name is required'),
  position: z.number().int().min(0),
  isDone: z.boolean().optional().default(false),
  wipLimit: z.number().int().min(0).optional()
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sprintId } = await params
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    // Check if user has access to the sprint
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      select: { projectId: true }
    })
    
    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
    }
    
    if (sprint.projectId) {
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId: sprint.projectId,
          userId: user.id
        }
      })
      
      if (!projectMember) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }
    
    // Get sprint columns
    const columns = await prisma.sprintColumn.findMany({
      where: { sprintId },
      orderBy: { position: 'asc' },
      include: {
        tasks: {
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
    })
    
    return NextResponse.json(columns)
  } catch (error: any) {
    console.error('Error fetching sprint columns:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sprint columns' },
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
      select: { projectId: true }
    })
    
    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
    }
    
    if (sprint.projectId) {
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId: sprint.projectId,
          userId: user.id
        }
      })
      
      if (!projectMember) {
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
    })
    
    return NextResponse.json(column)
  } catch (error: any) {
    console.error('Error creating sprint column:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create sprint column' },
      { status: 500 }
    )
  }
}