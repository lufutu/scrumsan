import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { generateSlug, generateUniqueSlug } from '@/lib/slug-utils'
import { z } from 'zod'

const organizationSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  logo: z.string().optional(),
})

export async function GET() {
  try {
    // Get current user and ensure they exist in our database
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    // Get organizations where user is a member
    const organizations = await prisma.organization.findMany({
      where: {
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
            role: true
          }
        }
      }
    })
    
    return NextResponse.json(organizations)
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await req.json()
    
    // Validate input
    const validatedData = organizationSchema.parse(body)
    
    // Get current user and ensure they exist in our database
    const user = await getCurrentUser(supabase)
    
    // Generate unique slug for the organization
    const baseSlug = generateSlug(validatedData.name)
    const existingSlugs = await prisma.organization.findMany({
      where: { slug: { not: null } },
      select: { slug: true }
    }).then(orgs => orgs.map(o => o.slug!))
    
    const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs)
    
    // Create organization with member in one transaction
    const organization = await prisma.organization.create({
      data: {
        name: validatedData.name,
        slug: uniqueSlug,
        description: validatedData.description,
        ownerId: user.id,
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
            role: true
          }
        }
      }
    })

    // Return the organization data with ID so frontend can upload logo
    return NextResponse.json(organization)
  } catch (error: unknown) {
    console.error('Error creating organization:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { message: error.message || 'Failed to create organization' },
      { status: 500 }
    )
  }
} 