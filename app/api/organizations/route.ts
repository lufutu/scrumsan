import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'

const organizationSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  logo: z.string().optional(),
})

export async function GET(req: NextRequest) {
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
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
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
    
    // Create organization with member in one transaction
    const organization = await prisma.organization.create({
      data: {
        name: validatedData.name,
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
  } catch (error: any) {
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