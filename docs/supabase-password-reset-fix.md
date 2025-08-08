# Fix Password Reset Email Template

## Problem
Password reset links from email go directly to `/auth/reset-password?code=...` but the reset form expects `access_token` and `refresh_token` parameters.

## Root Cause
The Supabase email template is not configured to use the correct redirect URL pattern that goes through our auth callback handler.

## Solution

### 1. Update Supabase Email Template

In your **self-hosted Supabase** dashboard:

1. Go to **Authentication > Email Templates**
2. Find the **Reset Password** template
3. Update the redirect URL in the template from:
   ```
   {{ .SiteURL }}/auth/reset-password?code={{ .TokenHash }}
   ```
   
   To:
   ```
   {{ .SiteURL }}/auth/callback?code={{ .TokenHash }}&returnUrl=/auth/reset-password
   ```

### 2. Update Auth Callback Handler (Alternative)

Or modify the callback to handle password reset flows specifically:

```typescript
// In app/auth/callback/route.ts
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

      // For password reset flows, we need to pass tokens in URL
      if (returnUrl?.includes('/auth/reset-password') && data.session) {
        const resetUrl = new URL('/auth/reset-password', request.url)
        resetUrl.searchParams.set('access_token', data.session.access_token)
        resetUrl.searchParams.set('refresh_token', data.session.refresh_token)
        resetUrl.searchParams.set('type', 'recovery')
        return NextResponse.redirect(resetUrl)
      }

      // Normal flow - ensure user exists in DB
      if (data.user) {
        try {
          await ensureUserExists(data.user)
        } catch (dbError) {
          logger.error('Database user creation error:', dbError)
        }
      }
    } catch (error) {
      logger.error('Auth callback error:', error)
      return NextResponse.redirect(new URL('/login?error=auth_callback_error', request.url))
    }
  }

  const finalRedirectUrl = returnUrl || '/'
  return NextResponse.redirect(new URL(finalRedirectUrl, request.url))
}
```

### 3. Test the Fix

1. Request a new password reset
2. Check that the email link now goes to `/auth/callback?code=...&returnUrl=/auth/reset-password`  
3. Verify the callback properly redirects to `/auth/reset-password` with tokens
4. Confirm password reset works without "Invalid or expired link" error

## Recommended Approach

**Option 1** (Update email template) is cleaner as it follows the proper OAuth flow.
**Option 2** (Update callback handler) works as a code-only fix if you can't change email templates.

Choose Option 1 if you have access to Supabase email template configuration.