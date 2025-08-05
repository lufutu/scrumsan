import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { resolveOrganization } from '@/lib/slug-resolver'
import { generateSlug, generateUniqueSlug } from '@/lib/slug-utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const organizationSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  logo: z.string().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createClient()
    
    // Get current user and ensure they exist in our database
    const user = await getCurrentUser(supabase)
    
    // Resolve organization by slug (this route only accepts slugs)
    const result = await resolveOrganization(slug, {
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
    })
    
    if (!result) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }
    
    const { entity: organization } = result
    
    // Check if user has access to this organization
    const hasAccess = organization.members.some((member: any) => member.userId === user.id)
    
    if (!hasAccess) {
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
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createClient()
    const body = await req.json()
    
    // Validate input
    const validatedData = organizationSchema.parse(body)
    
    // Get current user and ensure they exist in our database
    const user = await getCurrentUser(supabase)
    
    // Resolve organization by slug
    const result = await resolveOrganization(slug)
    
    if (!result) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }
    
    const { entity: organization } = result
    
    // Check if user is owner/admin
    const member = await prisma.organizationMember.findFirst({
      where: {
        organizationId: organization.id,
        userId: user.id
      }
    })
    
    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // If name is being updated, we might need to update the slug
    let updateData: any = { ...validatedData }
    
    if (validatedData.name && validatedData.name !== organization.name) {
      // Generate new slug based on new name
      const baseSlug = generateSlug(validatedData.name)
      const existingSlugs = await prisma.organization.findMany({
        where: { 
          id: { not: organization.id }, // Exclude current organization
          slug: { not: null } 
        },
        select: { slug: true }
      }).then(orgs => orgs.map(o => o.slug!))
      
      const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs)
      updateData.slug = uniqueSlug
    }
    
    // Update organization
    const updatedOrganization = await prisma.organization.update({
      where: { id: organization.id },
      data: updateData,
      include: {
        members: {
          select: {
            userId: true,
            role: true
          }
        }
      }
    })
    
    return NextResponse.json(updatedOrganization)
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
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createClient()
    
    // Get current user and ensure they exist in our database
    const user = await getCurrentUser(supabase)
    
    // Resolve organization by slug
    const result = await resolveOrganization(slug)
    
    if (!result) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }
    
    const { entity: organization } = result
    
    // Check if user is owner
    const member = await prisma.organizationMember.findFirst({
      where: {
        organizationId: organization.id,
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
      where: { id: organization.id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error deleting organization:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to delete organization' },
      { status: 500 }
    )
  }
}