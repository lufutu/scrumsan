import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ensureUserExists } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const returnUrl = requestUrl.searchParams.get('returnUrl')

  if (code) {
    try {
      const supabase = await createClient()
      
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        logger.error('Auth callback error:', error)
        return NextResponse.redirect(new URL('/login?error=auth_callback_error', request.url))
      }

      // For password reset flows, redirect with session tokens
      if (returnUrl?.includes('/auth/reset-password') && data.session) {
        const resetUrl = new URL('/auth/reset-password', request.url)
        resetUrl.searchParams.set('access_token', data.session.access_token)
        resetUrl.searchParams.set('refresh_token', data.session.refresh_token)
        resetUrl.searchParams.set('type', 'recovery')
        
        logger.log('Password reset: redirecting with tokens to', resetUrl.toString())
        return NextResponse.redirect(resetUrl)
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