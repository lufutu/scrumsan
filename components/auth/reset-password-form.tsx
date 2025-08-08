'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { validatePassword } from '@/lib/password-validation'

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordValidation, setPasswordValidation] = useState<{
    isValid: boolean
    errors: string[]
  }>({ isValid: false, errors: [] })
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null)

  // Check if we have valid reset token parameters
  useEffect(() => {
    const checkTokenValidity = () => {
      const accessToken = searchParams.get('access_token')
      const refreshToken = searchParams.get('refresh_token')
      const type = searchParams.get('type')
      const code = searchParams.get('code')

      if (type === 'recovery' && accessToken && refreshToken) {
        setIsValidToken(true)
        // Set the session with the tokens from the URL
        const supabase = createClient()
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
      } else if (code) {
        // Handle case where user came directly with code - redirect to callback
        const callbackUrl = `/auth/callback?code=${code}&returnUrl=${encodeURIComponent('/auth/reset-password')}`
        router.replace(callbackUrl)
        return
      } else {
        setIsValidToken(false)
      }
    }

    checkTokenValidity()
  }, [searchParams, router])

  // Validate password in real-time
  useEffect(() => {
    if (password) {
      const validation = validatePassword(password)
      setPasswordValidation(validation)
    } else {
      setPasswordValidation({ isValid: false, errors: [] })
    }
  }, [password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate passwords
    if (!passwordValidation.isValid) {
      setError('Please fix the password requirements')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      setSuccess(true)
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login?message=Password updated successfully')
      }, 3000)

    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Show loading state while checking token validity
  if (isValidToken === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Show error if token is invalid
  if (isValidToken === false) {
    return (
      <div className="text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">Invalid or expired link</h3>
          <p className="text-sm text-gray-600">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
        </div>

        <Button
          onClick={() => router.push('/auth/forgot-password')}
          className="w-full"
        >
          Request new reset link
        </Button>
      </div>
    )
  }

  // Show success state
  if (success) {
    return (
      <div className="text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">Password updated!</h3>
          <p className="text-sm text-gray-600">
            Your password has been successfully updated. You'll be redirected to login shortly.
          </p>
        </div>

        <div className="animate-pulse">
          <div className="h-2 bg-blue-200 rounded-full">
            <div className="h-2 bg-blue-600 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="password">New Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your new password"
            disabled={loading}
            className={!passwordValidation.isValid && password ? 'border-red-300' : ''}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        
        {/* Password requirements */}
        {password && (
          <div className="text-xs space-y-1">
            {passwordValidation.errors.map((error, index) => (
              <div key={index} className="text-red-600 flex items-center gap-1">
                <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                {error}
              </div>
            ))}
            {passwordValidation.isValid && (
              <div className="text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Password meets all requirements
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Confirm your new password"
            disabled={loading}
            className={confirmPassword && password !== confirmPassword ? 'border-red-300' : ''}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        
        {confirmPassword && password !== confirmPassword && (
          <div className="text-xs text-red-600 flex items-center gap-1">
            <span className="w-1 h-1 bg-red-600 rounded-full"></span>
            Passwords do not match
          </div>
        )}
      </div>

      <Button 
        type="submit" 
        className="w-full" 
        disabled={loading || !passwordValidation.isValid || password !== confirmPassword}
      >
        {loading ? 'Updating password...' : 'Update password'}
      </Button>

      <div className="text-xs text-gray-500 text-center">
        After updating your password, you'll be redirected to the login page.
      </div>
    </form>
  )
}