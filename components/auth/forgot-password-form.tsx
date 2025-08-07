'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, Mail } from 'lucide-react'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) throw error

      setSuccess(true)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">Check your email</h3>
          <p className="text-sm text-gray-600">
            We've sent a password reset link to <strong>{email}</strong>
          </p>
        </div>

        <Alert>
          <Mail className="h-4 w-4" />
          <AlertDescription>
            If you don't see the email in your inbox, check your spam folder. The reset link will expire in 1 hour.
          </AlertDescription>
        </Alert>

        <Button
          variant="outline"
          onClick={() => {
            setSuccess(false)
            setEmail('')
          }}
          className="w-full"
        >
          Send another email
        </Button>
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
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Enter your email address"
          disabled={loading}
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
        {loading ? 'Sending reset link...' : 'Send reset link'}
      </Button>

      <div className="text-xs text-gray-500 text-center">
        We'll send you a secure link to reset your password. The link will expire in 1 hour for your security.
      </div>
    </form>
  )
}