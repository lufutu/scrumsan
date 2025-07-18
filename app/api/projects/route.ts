import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'

const projectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  logo: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.string().optional(),
  organizationId: z.string().uuid(),
})

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    const url = new URL(req.url)
    const organizationId = url.searchParams.get('organizationId')
    
    const whereClause: any = {
      members: {
        some: {
          userId: user.id
        }
      }
    }
    
    // Filter by organization if provided
    if (organizationId) {
      whereClause.organizationId = organizationId
    }
    
    const projects = await prisma.project.findMany({
      where: whereClause,
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json(projects)
  } catch (error: any) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await req.json()
    
    // Validate input
    const validatedData = projectSchema.parse(body)
    
    // Get current user
    const user = await getCurrentUser(supabase)
    
    // Check if user is a member of the organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: validatedData.organizationId,
        userId: user.id
      }
    })
    
    if (!orgMember) {
      return NextResponse.json(
        { error: 'You are not a member of this organization' },
        { status: 403 }
      )
    }
    
    // Create project with creator as owner
    const project = await prisma.project.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        logo: validatedData.logo,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        status: validatedData.status || 'active',
        organizationId: validatedData.organizationId,
        createdBy: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'owner'
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