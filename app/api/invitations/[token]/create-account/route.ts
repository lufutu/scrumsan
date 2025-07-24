import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/invitations/[token]/create-account
 * Create a new user account from an invitation and automatically accept the invitation
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    console.log('🆕 Creating account from invitation')
    const { token } = await params
    const body = await req.json()
    const { password } = body

    console.log('🔑 Token:', token.substring(0, 10) + '...')

    // Validate password
    if (!password || password.length < 8) {
      console.log('❌ Invalid password')
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

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
            id: true,
            name: true,
            permissions: true,
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

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
    })

    if (existingUser) {
      console.log('❌ User already exists')
      return NextResponse.json(
        { error: 'A user with this email already exists. Please log in instead.' },
        { status: 409 }
      )
    }

    console.log('✅ Creating new user account')

    // Create Supabase client
    const supabase = await createClient()

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password: password,
        options: {
          emailRedirectTo: undefined, // Skip email confirmation for invitations
          data: {
            full_name: invitation.email.split('@')[0], // Default name from email
          }
        }
      })

      if (authError || !authData.user) {
        console.error('❌ Supabase auth error:', authError)
        throw new Error(authError?.message || 'Failed to create user account')
      }

      console.log('✅ Supabase user created:', authData.user.id)

      // Create application User record
      const user = await tx.user.create({
        data: {
          id: authData.user.id,
          email: invitation.email,
          fullName: authData.user.user_metadata?.full_name || invitation.email.split('@')[0],
          emailConfirmed: true, // Auto-confirm for invited users
          createdAt: new Date(),
          authSyncedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
        },
      })

      console.log('✅ Application user created:', user.id)

      // Create organization member
      const member = await tx.organizationMember.create({
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
      })

      console.log('✅ Organization member created')

      // Mark invitation as accepted
      await tx.teamInvitation.update({
        where: { id: invitation.id },
        data: {
          acceptedAt: new Date(),
          acceptedBy: user.id,
        },
      })

      console.log('✅ Invitation marked as accepted')

      return { user, member, authData }
    })

    // Automatically sign in the user
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: invitation.email,
      password: password,
    })

    if (signInError) {
      console.error('❌ Auto sign-in error:', signInError)
      // Don't fail the entire request if auto sign-in fails
      // The user can still manually sign in
      console.log('⚠️ Auto sign-in failed, but account was created successfully')
    } else {
      console.log('✅ User automatically signed in')
    }

    console.log('🎉 Account creation and invitation acceptance completed')

    return NextResponse.json({
      user: result.user,
      member: result.member,
      organization: invitation.organization,
      autoSignedIn: !signInError,
      message: `Welcome to ${invitation.organization.name}! Your account has been created and you've been added to the organization.`,
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Error creating account:', error)
    
    // Provide more specific error messages based on error type and context
    let errorMessage = 'Failed to create account'
    let statusCode = 500

    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase()
      
      // Supabase auth specific errors
      if (errorMsg.includes('user already registered') || errorMsg.includes('email already exists')) {
        errorMessage = 'A user with this email already exists. Please sign in instead.'
        statusCode = 409
      } else if (errorMsg.includes('password') && errorMsg.includes('weak')) {
        errorMessage = 'Password is too weak. Please choose a stronger password.'
        statusCode = 400
      } else if (errorMsg.includes('password') && errorMsg.includes('short')) {
        errorMessage = 'Password must be at least 8 characters long.'
        statusCode = 400
      } else if (errorMsg.includes('invalid email') || errorMsg.includes('email format')) {
        errorMessage = 'Invalid email address format.'
        statusCode = 400
      } else if (errorMsg.includes('rate limit') || errorMsg.includes('too many requests')) {
        errorMessage = 'Too many attempts. Please wait a moment before trying again.'
        statusCode = 429
      } else if (errorMsg.includes('network') || errorMsg.includes('timeout') || errorMsg.includes('connection')) {
        errorMessage = 'Network error. Please check your connection and try again.'
        statusCode = 503
      } else if (errorMsg.includes('database') || errorMsg.includes('prisma')) {
        errorMessage = 'Database error. Please try again in a moment.'
        statusCode = 503
      } else if (errorMsg.includes('transaction') || errorMsg.includes('rollback')) {
        errorMessage = 'Account creation was interrupted. Please try again.'
        statusCode = 500
      } else if (errorMsg.includes('auth') && errorMsg.includes('failed')) {
        errorMessage = 'Authentication service error. Please try again.'
        statusCode = 503
      } else if (error.message.length > 0 && error.message.length < 200) {
        // Use the original error message if it's reasonable length and not too technical
        errorMessage = error.message
      }
    }

    // Log additional context for debugging
    console.error('Error context:', {
      originalError: error,
      finalMessage: errorMessage,
      statusCode,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      { 
        error: errorMessage,
        code: statusCode === 409 ? 'USER_EXISTS' : 
              statusCode === 400 ? 'VALIDATION_ERROR' :
              statusCode === 429 ? 'RATE_LIMITED' :
              statusCode === 503 ? 'SERVICE_UNAVAILABLE' :
              'INTERNAL_ERROR'
      },
      { status: statusCode }
    )
  }
}