import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get current user for authorization
    const currentUser = await getCurrentUser(req)
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Users can only access their own profile or profiles in their organizations
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        createdAt: true,
        // Check if current user shares any organizations with this user
        organizationMembers: {
          where: {
            organization: {
              members: {
                some: {
                  userId: currentUser.id
                }
              }
            }
          },
          select: {
            organizationId: true
          },
          take: 1 // Just need to know if any shared orgs exist
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Authorization: users can access their own profile or profiles of users in shared organizations
    if (user.id !== currentUser.id && user.organizationMembers.length === 0) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Remove organization data from response (was just for authorization)
    const { organizationMembers, ...userResponse } = user

    return NextResponse.json(userResponse)
  } catch (error: unknown) {
    console.error('Error fetching user:', error)
    
    // Provide more specific error messages
    let errorMessage = 'Failed to fetch user'
    let statusCode = 500

    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase()
      
      if (errorMsg.includes('database') || errorMsg.includes('prisma')) {
        errorMessage = 'Database connection error. Please try again.'
        statusCode = 503
      } else if (errorMsg.includes('timeout')) {
        errorMessage = 'Request timeout. Please try again.'
        statusCode = 504
      } else if (errorMsg.includes('network')) {
        errorMessage = 'Network error. Please check your connection.'
        statusCode = 503
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}