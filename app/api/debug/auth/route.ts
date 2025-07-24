import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const organizationId = req.nextUrl.searchParams.get('organizationId')
    
    // Get current user from Supabase
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    if (!user) {
      return NextResponse.json({ error: 'No user found' }, { status: 401 })
    }
    
    console.log('Debug - User from Supabase:', {
      id: user.id,
      email: user.email,
    })
    
    // Look for organization member record
    let member = null
    if (organizationId) {
      member = await prisma.organizationMember.findFirst({
        where: {
          userId: user.id,
          organizationId,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
            }
          }
        }
      })
      
      console.log('Debug - Organization member lookup:', {
        userId: user.id,
        organizationId,
        memberFound: !!member,
        member: member ? {
          id: member.id,
          role: member.role,
          userId: member.userId,
          organizationId: member.organizationId,
        } : null
      })
    }
    
    // Also check all organization members for this user
    const allMemberships = await prisma.organizationMember.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        organizationId: true,
        role: true,
      }
    })
    
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      organizationId,
      member,
      allMemberships,
      debug: {
        userIdType: typeof user.id,
        organizationIdType: typeof organizationId,
        memberFound: !!member,
      }
    })
    
  } catch (error) {
    console.error('Debug auth error:', error)
    return NextResponse.json({ 
      error: 'Debug failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}