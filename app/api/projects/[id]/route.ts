import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'

const projectUpdateSchema = z.object({
  name: z.string().min(1, 'Project name is required').optional(),
  description: z.string().optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['active', 'completed', 'on_hold', 'cancelled']).optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    const project = await prisma.project.findFirst({
      where: {
        id: id,
        members: {
          some: {
            userId: user.id
          }
        }
      },
      include: {
        members: {
          select: {
            userId: true,
            role: true,
            user: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true
              }
            }
          }
        },
        boardLinks: {
          include: {
            board: {
              select: {
                id: true,
                name: true,
                boardType: true,
                _count: {
                  select: {
                    tasks: true
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            members: true,
            boardLinks: true
          }
        }
      }
    })
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(project)
  } catch (error: unknown) {
    console.error('Error fetching project:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await req.json()
    
    // Validate input
    const validatedData = projectUpdateSchema.parse(body)
    
    // Get current user
    const user = await getCurrentUser(supabase)
    
    // Check if user is owner/admin
    const member = await prisma.projectMember.findFirst({
      where: {
        projectId: id,
        userId: user.id
      }
    })
    
    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Prepare update data
    const updateData: Record<string, unknown> = {}
    if (validatedData.name) updateData.name = validatedData.name
    if (validatedData.description !== undefined) updateData.description = validatedData.description
    if (validatedData.clientName !== undefined) updateData.clientName = validatedData.clientName
    if (validatedData.clientEmail !== undefined) updateData.clientEmail = validatedData.clientEmail
    if (validatedData.startDate) updateData.startDate = new Date(validatedData.startDate)
    if (validatedData.endDate) updateData.endDate = new Date(validatedData.endDate)
    if (validatedData.status) updateData.status = validatedData.status
    
    // Update project
    const project = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        members: {
          select: {
            userId: true,
            role: true,
            user: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true
              }
            }
          }
        },
        boardLinks: {
          include: {
            board: {
              select: {
                id: true,
                name: true,
                boardType: true
              }
            }
          }
        },
        _count: {
          select: {
            members: true,
            boardLinks: true
          }
        }
      }
    })
    
    return NextResponse.json(project)
  } catch (error: unknown) {
    console.error('Error updating project:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update project' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    // Check if user is owner
    const member = await prisma.projectMember.findFirst({
      where: {
        projectId: id,
        userId: user.id
      }
    })
    
    if (!member || member.role !== 'owner') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Delete project (cascade will handle related data)
    await prisma.project.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete project' },
      { status: 500 }
    )
  }
}