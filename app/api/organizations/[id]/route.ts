import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'

const organizationSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  logo: z.string().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // Get current user and ensure they exist in our database
    const user = await getCurrentUser(supabase)
    
    // Get organization with user access check
    const organization = await prisma.organization.findFirst({
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
                avatarUrl: true,
                email: true
              }
            }
          }
        }
      }
    })
    
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(organization)
  } catch (error: unknown) {
    console.error('Error fetching organization:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to fetch organization' },
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
    const validatedData = organizationSchema.parse(body)
    
    // Get current user and ensure they exist in our database
    const user = await getCurrentUser(supabase)
    
    // Check if user is owner/admin
    const member = await prisma.organizationMember.findFirst({
      where: {
        organizationId: id,
        userId: user.id
      }
    })
    
    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Update organization
    const organization = await prisma.organization.update({
      where: { id },
      data: validatedData,
      include: {
        members: {
          select: {
            userId: true,
            role: true
          }
        }
      }
    })
    
    return NextResponse.json(organization)
  } catch (error: unknown) {
    console.error('Error updating organization:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to update organization' },
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
    
    // Get current user and ensure they exist in our database
    const user = await getCurrentUser(supabase)
    
    // Check if user is owner
    const member = await prisma.organizationMember.findFirst({
      where: {
        organizationId: id,
        userId: user.id
      }
    })
    
    if (!member || member.role !== 'owner') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Delete organization (cascade will handle related data)
    await prisma.organization.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error fetching organization:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to fetch organization' },
      { status: 500 }
    )
  }
} 