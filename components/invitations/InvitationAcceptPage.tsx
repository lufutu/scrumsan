'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Building, User, Clock, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

import { AccountCreationForm } from './AccountCreationForm'

interface InvitationData {
  id: string
  email: string
  role: string
  jobTitle?: string
  organization: {
    id: string
    name: string
    logo?: string
  }
  inviter: {
    fullName?: string
    email: string
  }
  permissionSet?: {
    name: string
  }
  expiresAt: string
}

interface InvitationAcceptPageProps {
  token: string
}

interface UserExistenceState {
  exists: boolean
  loading: boolean
  error: string | null
  user?: {
    id: string
    email: string
    fullName: string | null
    avatarUrl: string | null
  } | null
}



export function InvitationAcceptPage({ token }: InvitationAcceptPageProps) {
  const router = useRouter()
  const [user, setUser] = useState<unknown>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAccepting, setIsAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // New state for user existence detection
  const [userExistence, setUserExistence] = useState<UserExistenceState>({
    exists: false,
    loading: true,
    error: null,
    user: null
  })



  // Check user authentication status
  useEffect(() => {
    async function checkUser() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error('Error checking user:', error)
      } finally {
        setUserLoading(false)
      }
    }

    checkUser()
  }, [])

  // Fetch invitation details
  useEffect(() => {
    async function fetchInvitation() {
      try {
        const response = await fetch(`/api/invitations/${token}`)

        if (!response.ok) {
          const errorData = await response.json()
          setError(errorData.error || 'Failed to load invitation')
          return
        }

        const data = await response.json()
        setInvitation(data)
      } catch (err) {
        setError('Failed to load invitation')
        console.error('Error fetching invitation:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchInvitation()
  }, [token])

  // Check user existence when invitation is loaded
  useEffect(() => {
    async function checkUserExistence() {
      if (!invitation?.email) return

      setUserExistence(prev => ({ ...prev, loading: true, error: null }))

      try {
        const response = await fetch(`/api/users/check?email=${encodeURIComponent(invitation.email)}`)

        const result = await response.json()

        if (!response.ok) {
          // Handle specific error cases
          let errorMessage = result.error || 'Failed to check user existence'

          if (response.status === 503) {
            errorMessage = 'Service temporarily unavailable. Please try again in a moment.'
          } else if (response.status === 504) {
            errorMessage = 'Request timeout. Please check your connection and try again.'
          } else if (response.status === 400) {
            errorMessage = 'Invalid email format.'
          }

          setUserExistence({
            exists: false,
            loading: false,
            error: errorMessage,
            user: null
          })
          return
        }

        setUserExistence({
          exists: result.exists,
          loading: false,
          error: result.error || null,
          user: result.user || null
        })
      } catch (err) {
        console.error('Error checking user existence:', err)

        // Handle network errors specifically
        let errorMessage = 'Failed to check user existence'
        if (err instanceof TypeError && err.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        }

        setUserExistence({
          exists: false,
          loading: false,
          error: errorMessage,
          user: null
        })
      }
    }

    checkUserExistence()
  }, [invitation?.email])

  const handleAcceptInvitation = async () => {
    if (!user) {
      // Redirect to sign in with return URL
      const returnUrl = encodeURIComponent(`/invite/${token}`)
      router.push(`/login?returnUrl=${returnUrl}`)
      return
    }

    if (!invitation) return

    setIsAccepting(true)
    try {
      const response = await fetch(`/api/invitations/${token}`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        const message = errorData.error || 'Failed to accept invitation'
        console.error('Failed to accept invitation:', message, errorData)
        toast.error(message)
        return
      }

      const data = await response.json()
      toast.success(data.message || 'Invitation accepted successfully!')

      // Redirect to the organization
      router.push(`/organizations/${invitation.organization.id}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to accept invitation'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsAccepting(false)
    }
  }

  const handleAccountCreated = async (response: unknown) => {
    try {
      // Check if user was automatically signed in
      if (response.autoSignedIn) {
        console.log('✅ User automatically signed in, refreshing auth state')

        // Refresh the auth state to get the new session
        const supabase = createClient()
        const { data: { user: newUser } } = await supabase.auth.getUser()

        if (newUser) {
          setUser(newUser)
          console.log('✅ Auth state updated with new user')
        }

        toast.success('Account created successfully! Welcome to the organization!')

        // Small delay to show success message, then redirect
        setTimeout(() => {
          router.push(`/organizations/${invitation?.organization.id}`)
        }, 1500)
      } else {
        // Auto sign-in failed, but account was created
        console.log('⚠️ Account created but auto sign-in failed')
        toast.success('Account created successfully! Please sign in to continue.')

        // Redirect to login with return URL
        const returnUrl = encodeURIComponent(`/invite/${token}`)
        setTimeout(() => {
          router.push(`/login?returnUrl=${returnUrl}`)
        }, 2000)
      }
    } catch (err) {
      console.error('Error after account creation:', err)
      toast.error('Account created but failed to complete setup. Please try signing in.')

      // Fallback: redirect to login
      const returnUrl = encodeURIComponent(`/invite/${token}`)
      setTimeout(() => {
        router.push(`/login?returnUrl=${returnUrl}`)
      }, 3000)
    }
  }

  const handleAccountCreationError = (errorMessage: string) => {
    console.log('Account creation error:', errorMessage)

    // Provide more user-friendly toast messages
    if (errorMessage.includes('already exists')) {
      toast.error('An account with this email already exists. Please sign in instead.', {
        duration: 5000,
        action: {
          label: 'Sign In',
          onClick: () => {
            const returnUrl = encodeURIComponent(`/invite/${token}`)
            router.push(`/login?returnUrl=${returnUrl}`)
          }
        }
      })
    } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      toast.error('Network error. Please check your connection and try again.', {
        duration: 5000,
        action: {
          label: 'Retry',
          onClick: () => window.location.reload()
        }
      })
    } else if (errorMessage.includes('expired') || errorMessage.includes('invalid')) {
      toast.error('This invitation link is invalid or has expired.', {
        duration: 5000
      })
    } else {
      toast.error(errorMessage, {
        duration: 5000
      })
    }
  }

  if (userLoading || isLoading || userExistence.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">
            {userLoading ? 'Checking authentication...' :
              isLoading ? 'Loading invitation...' :
                'Checking user status...'}
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <CardTitle>Invitation Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push('/')}
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle>Invitation Not Found</CardTitle>
            <CardDescription>This invitation link is invalid or has expired.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const isExpired = new Date(invitation.expiresAt) < new Date()
  const expiryDate = new Date(invitation.expiresAt).toLocaleDateString()

  // Show account creation form for new users (users that don't exist in the system)
  if (!userExistence.exists && !userExistence.error && invitation) {
    return (
      <AccountCreationForm
        invitation={invitation}
        token={token}
        onAccountCreated={handleAccountCreated}
        onError={handleAccountCreationError}
      />
    )
  }

  // Show error if user existence check failed
  if (userExistence.error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <CardTitle>Error Checking User Status</CardTitle>
            <CardDescription>{userExistence.error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setUserExistence(prev => ({ ...prev, loading: true, error: null }))
                // Trigger re-check by updating invitation state
                if (invitation) {
                  const checkUserExistence = async () => {
                    try {
                      const response = await fetch(`/api/users/check?email=${encodeURIComponent(invitation.email)}`)
                      const result = await response.json()

                      if (!response.ok) {
                        const message = result.error || 'Failed to check user existence'
                        console.error('Failed to check user existence:', message, result)
                        toast.error(message)
                        return
                      }

                      setUserExistence({
                        exists: result.exists,
                        loading: false,
                        error: null,
                        user: result.user || null
                      })
                    } catch (err) {
                      setUserExistence({
                        exists: false,
                        loading: false,
                        error: err instanceof Error ? err.message : 'Failed to check user existence',
                        user: null
                      })
                    }
                  }
                  checkUserExistence()
                }
              }}
              disabled={userExistence.loading}
            >
              {userExistence.loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Checking...
                </>
              ) : (
                'Try Again'
              )}
            </Button>

            {/* Fallback option */}
            <Button
              variant="ghost"
              className="w-full text-sm"
              onClick={() => {
                // Assume user doesn't exist and show account creation form
                setUserExistence({
                  exists: false,
                  loading: false,
                  error: null,
                  user: null
                })
              }}
            >
              Continue with Account Creation
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">You're Invited!</CardTitle>
          <CardDescription>
            Join {invitation.organization.name} and start collaborating
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Organization Info */}
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <Building className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{invitation.organization.name}</p>
              <p className="text-sm text-muted-foreground">Organization</p>
            </div>
          </div>

          {/* Invitation Details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium">{invitation.email}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Role</span>
              <Badge variant="secondary">{invitation.role}</Badge>
            </div>

            {invitation.jobTitle && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Position</span>
                <span className="text-sm font-medium">{invitation.jobTitle}</span>
              </div>
            )}

            {invitation.permissionSet && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Permission Set</span>
                <Badge variant="outline">{invitation.permissionSet.name}</Badge>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Invited by</span>
              <span className="text-sm font-medium">
                {invitation.inviter.fullName || invitation.inviter.email}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Expires</span>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-sm font-medium">{expiryDate}</span>
              </div>
            </div>
          </div>

          {/* Expiry Warning */}
          {isExpired && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                This invitation has expired. Please contact the organization to request a new invitation.
              </AlertDescription>
            </Alert>
          )}

          {/* Email Mismatch Warning */}
          {user && user.email !== invitation.email && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                This invitation is for {invitation.email}, but you're signed in as {user.email}.
                Please sign in with the correct account or contact the organization.
              </AlertDescription>
            </Alert>
          )}

          {/* User Existence Status */}
          {userExistence.exists && userExistence.user && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Account found for {invitation.email}. {!user ? 'Please sign in to accept this invitation.' : 'Ready to accept invitation.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {!user ? (
              <div className="space-y-2">
                <Button
                  className="w-full"
                  onClick={handleAcceptInvitation}
                  disabled={isExpired}
                >
                  <User className="w-4 h-4 mr-2" />
                  Sign In to Accept
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  You&apos;ll be redirected to sign in, then brought back to accept this invitation
                </p>
              </div>
            ) : (
              <Button
                className="w-full"
                onClick={handleAcceptInvitation}
                disabled={isAccepting || isExpired || user.email !== invitation.email}
              >
                {isAccepting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Accept Invitation
                  </>
                )}
              </Button>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push('/')}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}