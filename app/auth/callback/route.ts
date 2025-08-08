import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ensureUserExists } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const returnUrl = requestUrl.searchParams.get('returnUrl')

  if (code) {
    // For password reset flows, pass code directly without exchanging for session
    // This prevents auto-login before password reset
    if (returnUrl?.includes('/auth/reset-password')) {
      const resetUrl = new URL(returnUrl, request.url)
      resetUrl.searchParams.set('code', code)
      resetUrl.searchParams.set('type', 'recovery')
      
      logger.log('Password reset: redirecting with code to', resetUrl.toString())
      return NextResponse.redirect(resetUrl)
    }

    // For normal auth flows, exchange code for session
    try {
      const supabase = await createClient()
      
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        logger.error('Auth callback error:', error)
        return NextResponse.redirect(new URL('/login?error=auth_callback_error', request.url))
      }

      // If we have a user, ensure they exist in our database
      if (data.user) {
        try {
          await ensureUserExists(data.user)
        } catch (dbError) {
          logger.error('Database user creation error:', dbError)
          // Continue with redirect even if DB sync fails, user can try again
        }
      }
    } catch (error) {
      logger.error('Auth callback error:', error)
      return NextResponse.redirect(new URL('/login?error=auth_callback_error', request.url))
    }
  }

  // URL to redirect to after sign in process completes
  const finalRedirectUrl = returnUrl || '/'
  return NextResponse.redirect(new URL(finalRedirectUrl, request.url))
} 