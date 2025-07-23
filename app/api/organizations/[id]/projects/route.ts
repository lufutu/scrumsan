import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'

const projectCreateSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organizationId } = await params
    const { searchParams } = new URL(req.url)
    const overview = searchParams.get('overview') === 'true'
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    // Check if user is a member of the organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: organizationId,
        userId: user.id
      }
    })
    
    if (!orgMember) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    let includeClause: any = {
      creator: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true
        }
      },
      _count: {
        select: {
          members: true,
          boardLinks: true
        }
      }
    }
    
    // If overview=true, include detailed member and board data
    if (overview) {
      includeClause.members = {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              email: true
            }
          }
        },
        orderBy: {
          joinedAt: 'asc'
        }
      }
      includeClause.boardLinks = {
        include: {
          board: {
            select: {
              id: true,
              name: true,
              boardType: true,
              color: true,
              createdAt: true,
              _count: {
                select: {
                  tasks: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }
    }
    
    const projects = await prisma.project.findMany({
      where: {
        organizationId: organizationId
      },
      include: includeClause,
      orderBy: {
        createdAt: 'desc'
      },
      ...(limit && { take: limit })
    })
    
    return NextResponse.json(projects)
  } catch (error: any) {
    console.error('Error fetching organization projects:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organizationId } = await params
    const supabase = await createClient()
    const body = await req.json()
    
    // Validate input
    const validatedData = projectCreateSchema.parse(body)
    
    // Get current user
    const user = await getCurrentUser(supabase)
    
    // Check if user is a member of the organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: organizationId,
        userId: user.id
      }
    })
    
    if (!orgMember) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // Create project
    const project = await prisma.project.create({
      data: {
        organizationId: organizationId,
        name: validatedData.name,
        description: validatedData.description,
        clientName: validatedData.clientName,
        clientEmail: validatedData.clientEmail,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        createdBy: user.id,
        status: 'active'
      },
      include: {
        creator: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true
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
    
    // Add creator as project member
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: user.id,
        role: 'owner',
        engagement: 'full_time'
      }
    })
    
    return NextResponse.json(project)
  } catch (error: any) {
    console.error('Error creating project:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create project' },
      { status: 500 }
    )
  }
}