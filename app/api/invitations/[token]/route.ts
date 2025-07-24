import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth-utils'

/**
 * GET /api/invitations/[token]
 * Get invitation details by token (no authentication required)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    console.log('📧 Fetching invitation details')
    const { token } = await params
    console.log('🔑 Token:', token.substring(0, 10) + '...')
    
    // Find the invitation
    const invitation = await prisma.teamInvitation.findUnique({
      where: { token },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
        inviter: {
          select: {
            fullName: true,
            email: true,
          },
        },
        permissionSet: {
          select: {
            name: true,
          },
        },
      },
    })

    console.log('📋 Invitation found:', invitation ? 'Yes' : 'No')

    if (!invitation) {
      console.log('❌ Invitation not found')
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    if (invitation.acceptedAt) {
      console.log('❌ Invitation already accepted')
      return NextResponse.json(
        { error: 'Invitation has already been accepted' },
        { status: 410 }
      )
    }

    if (invitation.expiresAt < new Date()) {
      console.log('❌ Invitation expired')
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 410 }
      )
    }

    console.log('✅ Returning invitation details')
    return NextResponse.json({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      jobTitle: invitation.jobTitle,
      organization: invitation.organization,
      inviter: invitation.inviter,
      permissionSet: invitation.permissionSet,
      expiresAt: invitation.expiresAt,
    })

  } catch (error) {
    console.error('❌ Error fetching invitation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitation' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/invitations/[token]
 * Accept an invitation
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    console.log('🎯 Accepting invitation')
    const { token } = await params
    console.log('🔑 Token:', token.substring(0, 10) + '...')
    
    // Get current user
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    if (!user) {
      console.log('❌ Authentication required')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log('👤 User authenticated:', user.email)

    // Find the invitation
    const invitation = await prisma.teamInvitation.findUnique({
      where: { token },
      include: {
        organization: true,
      },
    })

    if (!invitation) {
      console.log('❌ Invitation not found')
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    if (invitation.acceptedAt) {
      console.log('❌ Invitation already accepted')
      return NextResponse.json(
        { error: 'Invitation has already been accepted' },
        { status: 410 }
      )
    }

    if (invitation.expiresAt < new Date()) {
      console.log('❌ Invitation expired')
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 410 }
      )
    }

    // Check if user email matches invitation email
    if (user.email !== invitation.email) {
      console.log('❌ Email mismatch:', user.email, 'vs', invitation.email)
      return NextResponse.json(
        { error: 'This invitation is for a different email address' },
        { status: 403 }
      )
    }

    // Check if user is already a member
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId: user.id,
        },
      },
    })

    if (existingMember) {
      console.log('❌ User already a member')
      return NextResponse.json(
        { error: 'You are already a member of this organization' },
        { status: 409 }
      )
    }

    console.log('✅ Creating organization member')

    // Accept the invitation by creating the organization member
    const [member] = await prisma.$transaction([
      // Create organization member
      prisma.organizationMember.create({
        data: {
          organizationId: invitation.organizationId,
          userId: user.id,
          role: invitation.role,
          permissionSetId: invitation.permissionSetId,
          jobTitle: invitation.jobTitle,
          workingHoursPerWeek: invitation.workingHoursPerWeek,
          joinDate: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              avatarUrl: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
          permissionSet: {
            select: {
              id: true,
              name: true,
              permissions: true,
            },
          },
        },
      }),
      // Mark invitation as accepted
      prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: {
          acceptedAt: new Date(),
          acceptedBy: user.id,
        },
      }),
    ])

    console.log('🎉 Invitation accepted successfully')
    return NextResponse.json({
      member,
      organization: invitation.organization,
      message: `Welcome to ${invitation.organization.name}!`,
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Error accepting invitation:', error)
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    )
  }
}