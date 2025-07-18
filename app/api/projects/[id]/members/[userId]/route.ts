import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'

const memberUpdateSchema = z.object({
  role: z.enum(['owner', 'admin', 'member']),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id, userId } = await params
    const supabase = await createClient()
    const body = await req.json()
    
    // Validate input
    const validatedData = memberUpdateSchema.parse(body)
    
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
    
    // Check if target member exists
    const targetMember = await prisma.projectMember.findFirst({
      where: {
        projectId: id,
        userId: userId
      }
    })
    
    if (!targetMember) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }
    
    // Update member role
    const updatedMember = await prisma.projectMember.update({
      where: {
        id: targetMember.id
      },
      data: {
        role: validatedData.role
      },
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
    })
    
    return NextResponse.json(updatedMember)
  } catch (error: any) {
    console.error('Error updating project member:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update project member' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id, userId } = await params
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    // Check if user is owner/admin or removing themselves
    const member = await prisma.projectMember.findFirst({
      where: {
        projectId: id,
        userId: user.id
      }
    })
    
    if (!member || (!['owner', 'admin'].includes(member.role) && user.id !== userId)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Check if target member exists
    const targetMember = await prisma.projectMember.findFirst({
      where: {
        projectId: id,
        userId: userId
      }
    })
    
    if (!targetMember) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }
    
    // Don't allow removing the last owner
    if (targetMember.role === 'owner') {
      const ownerCount = await prisma.projectMember.count({
        where: {
          projectId: id,
          role: 'owner'
        }
      })
      
      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last owner' },
          { status: 400 }
        )
      }
    }
    
    // Remove member
    await prisma.projectMember.delete({
      where: {
        id: targetMember.id
      }
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error removing project member:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to remove project member' },
      { status: 500 }
    )
  }
}