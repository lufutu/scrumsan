import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { commonFields } from '@/lib/validation-schemas'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailValidation = commonFields.email.safeParse(email)
    if (!emailValidation.success) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { 
        email: email.toLowerCase() 
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
      },
    })

    return NextResponse.json({
      exists: !!user,
      user: user || undefined,
    })
  } catch (error: unknown) {
    console.error('Error checking user existence:', error)
    
    // Provide more specific error messages
    let errorMessage = 'Failed to check user existence'
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
      { 
        error: errorMessage,
        exists: false,
        user: null
      },
      { status: statusCode }
    )
  }
}