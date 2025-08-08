import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { generateSlug, generateUniqueSlug } from '@/lib/slug-utils'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { measureQueryPerformance } from '@/lib/database/query-optimizer'

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
    
    // Get organizations where user is a member - HIGHLY OPTIMIZED QUERY
    // Using direct SQL join for better performance
    const organizations = await measureQueryPerformance(
      'GET /api/organizations',
      async () => await prisma.$queryRaw`
        SELECT 
          o.id,
          o.name,
          o.slug,
          o.description,
          o.logo,
          o.owner_id as "ownerId",
          o.created_at as "createdAt",
          json_build_object(
            'userId', om.user_id,
            'role', om.role
          ) as "memberInfo"
        FROM organizations o
        INNER JOIN organization_members om ON o.id = om.organization_id
        WHERE om.user_id = ${user.id}::uuid
        ORDER BY o.created_at DESC
      `
    )
    
    // Transform the raw query result to match the expected format
    const formattedOrganizations = organizations.map((org: any) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      description: org.description,
      logo: org.logo,
      ownerId: org.ownerId,
      createdAt: org.createdAt,
      members: org.memberInfo ? [org.memberInfo] : []
    }))
    
    return NextResponse.json(formattedOrganizations)
  } catch (error: unknown) {
    logger.error('GET /api/organizations error:', error)
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
    logger.error('Error creating organization:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to create organization' },
      { status: 500 }
    )
  }
} 