import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'

const memberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'member']),
})

const memberUpdateSchema = z.object({
  role: z.enum(['owner', 'admin', 'member']),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    // Check if user is a member of the project
    const member = await prisma.projectMember.findFirst({
      where: {
        projectId: id,
        userId: user.id
      }
    })
    
    if (!member) {
      return NextResponse.json(
        { error: 'You are not a member of this project' },
        { status: 403 }
      )
    }
    
    const members = await prisma.projectMember.findMany({
      where: {
        projectId: id
      },
      select: {
        userId: true,
        role: true,
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            email: true
          }
        }
      }
    })
    
    return NextResponse.json(members)
  } catch (error: any) {
    console.error('Error fetching project members:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch project members' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await req.json()
    
    // Validate input
    const validatedData = memberSchema.parse(body)
    
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
    
    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: validatedData.userId }
    })
    
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Check if user is already a member
    const existingMember = await prisma.projectMember.findFirst({
      where: {
        projectId: id,
        userId: validatedData.userId
      }
    })
    
    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this project' },
        { status: 400 }
      )
    }
    
    // Add member
    const newMember = await prisma.projectMember.create({
      data: {
        projectId: id,
        userId: validatedData.userId,
        role: validatedData.role
      },
      select: {
        userId: true,
        role: true,
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            email: true
          }
        }
      }
    })
    
    return NextResponse.json(newMember)
  } catch (error: any) {
    console.error('Error adding project member:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to add project member' },
      { status: 500 }
    )
  }
}