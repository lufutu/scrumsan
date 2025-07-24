'use client'

import React, { useState } from 'react'
import { Eye, EyeOff, CheckCircle, XCircle, User, Building } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

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

interface AccountCreationResponse {
  user: {
    id: string
    email: string
    fullName: string | null
    avatarUrl: string | null
  }
  member: unknown
  organization: {
    id: string
    name: string
    logo?: string
  }
  autoSignedIn: boolean
  message: string
}

interface AccountCreationFormProps {
  invitation: InvitationData
  token: string
  onAccountCreated: (response: AccountCreationResponse) => void
  onError: (error: string) => void
}

interface PasswordStrength {
  score: number
  feedback: string[]
  isValid: boolean
  color: string
  text: string
}

interface FormErrors {
  password?: string
  confirmPassword?: string
  terms?: string
  general?: string
}

export function AccountCreationForm({ invitation, token, onAccountCreated, onError }: AccountCreationFormProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [creationStep, setCreationStep] = useState<'idle' | 'validating' | 'creating-auth' | 'creating-user' | 'accepting-invitation' | 'complete'>('idle')

  // Enhanced password strength validation
  const validatePasswordStrength = (password: string): PasswordStrength => {
    const feedback: string[] = []
    let score = 0

    // Length check
    if (password.length >= 12) {
      score += 30
    } else if (password.length >= 8) {
      score += 20
    } else {
      feedback.push('At least 8 characters')
    }

    // Character type checks
    if (/[a-z]/.test(password)) {
      score += 20
    } else {
      feedback.push('One lowercase letter')
    }

    if (/[A-Z]/.test(password)) {
      score += 20
    } else {
      feedback.push('One uppercase letter')
    }

    if (/\d/.test(password)) {
      score += 20
    } else {
      feedback.push('One number')
    }

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      score += 10
    } else {
      feedback.push('One special character (optional)')
    }

    // Determine color and text based on score
    let color = 'text-red-600'
    let text = 'Very Weak'
    
    if (score >= 90) {
      color = 'text-green-600'
      text = 'Very Strong'
    } else if (score >= 70) {
      color = 'text-green-600'
      text = 'Strong'
    } else if (score >= 50) {
      color = 'text-yellow-600'
      text = 'Good'
    } else if (score >= 30) {
      color = 'text-orange-600'
      text = 'Fair'
    } else if (score >= 10) {
      color = 'text-red-600'
      text = 'Weak'
    }

    return {
      score: Math.min(score, 100),
      feedback,
      isValid: password.length >= 8 && score >= 50,
      color,
      text
    }
  }

  // Form validation
  const validateForm = (): FormErrors => {
    const newErrors: FormErrors = {}

    if (!password) {
      newErrors.password = 'Password is required'
    } else if (!passwordStrength.isValid) {
      newErrors.password = 'Password does not meet security requirements'
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (!agreedToTerms) {
      newErrors.terms = 'Please agree to the terms and privacy policy'
    }

    return newErrors
  }

  const passwordStrength = validatePasswordStrength(password)
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0

  const getProgressColor = (score: number) => {
    if (score < 30) return 'bg-red-500'
    if (score < 50) return 'bg-orange-500'
    if (score < 70) return 'bg-yellow-500'
    if (score < 90) return 'bg-green-500'
    return 'bg-emerald-500'
  }

  const getStepMessage = (step: typeof creationStep) => {
    switch (step) {
      case 'validating':
        return 'Validating information...'
      case 'creating-auth':
        return 'Creating your account...'
      case 'creating-user':
        return 'Setting up your profile...'
      case 'accepting-invitation':
        return 'Joining the organization...'
      case 'complete':
        return 'Welcome! Redirecting...'
      default:
        return 'Creating Account...'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validate form
    setCreationStep('validating')
    const formErrors = validateForm()
    
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors)
      setCreationStep('idle')
      return
    }

    setIsCreating(true)

    try {
      setCreationStep('creating-auth')
      
      const response = await fetch(`/api/invitations/${token}/create-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.error || 'Failed to create account'
        
        // Set specific error based on response
        if (response.status === 409) {
          setErrors({ general: 'An account with this email already exists. Please sign in instead.' })
        } else if (response.status === 400) {
          setErrors({ password: errorMessage })
        } else if (response.status === 404) {
          setErrors({ general: 'Invitation not found or has expired.' })
        } else if (response.status === 410) {
          setErrors({ general: 'This invitation has already been used or has expired.' })
        } else if (response.status === 503) {
          setErrors({ general: 'Service temporarily unavailable. Please try again in a moment.' })
        } else {
          setErrors({ general: errorMessage })
        }
        
        onError(errorMessage)
        return
      }

      setCreationStep('creating-user')
      
      // Small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setCreationStep('accepting-invitation')
      
      const data = await response.json()
      
      // Small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setCreationStep('complete')
      setIsSuccess(true)
      
      // Show success message briefly before calling onAccountCreated
      setTimeout(() => {
        onAccountCreated(data)
      }, 1000)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create account'
      
      // Handle network errors specifically
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setErrors({ general: 'Network error. Please check your connection and try again.' })
      } else {
        setErrors({ general: errorMessage })
      }
      
      onError(errorMessage)
    } finally {
      if (!isSuccess) {
        setIsCreating(false)
        setCreationStep('idle')
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Create Your Account</CardTitle>
          <CardDescription>
            Complete your account setup to join {invitation.organization.name}
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
          </div>

          {/* Account Creation Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* General Error */}
            {errors.general && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

            {/* Success Message */}
            {isSuccess && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Account created successfully! Welcome to {invitation.organization.name}!
                </AlertDescription>
              </Alert>
            )}

            {/* Progress Indicator */}
            {isCreating && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium text-blue-800">
                    {getStepMessage(creationStep)}
                  </span>
                </div>
                <Progress value={
                  creationStep === 'validating' ? 10 :
                  creationStep === 'creating-auth' ? 30 :
                  creationStep === 'creating-user' ? 60 :
                  creationStep === 'accepting-invitation' ? 80 :
                  creationStep === 'complete' ? 100 : 0
                } className="h-2" />
              </div>
            )}

            {/* Email (Read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={invitation.email}
                disabled
                className="bg-muted"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a secure password"
                  className={`pr-10 ${errors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                  disabled={isCreating}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  disabled={isCreating}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              {/* Password Error */}
              {errors.password && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <XCircle className="w-4 h-4" />
                  <span>{errors.password}</span>
                </div>
              )}
              
              {/* Enhanced Password Strength Indicator */}
              {password && !errors.password && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Password strength:</span>
                    <span className={`font-medium ${passwordStrength.color}`}>
                      {passwordStrength.text}
                    </span>
                  </div>
                  <div className="relative">
                    <Progress 
                      value={passwordStrength.score} 
                      className="h-2"
                    />
                    <div 
                      className={`absolute top-0 left-0 h-2 rounded-full transition-all duration-300 ${getProgressColor(passwordStrength.score)}`}
                      style={{ width: `${passwordStrength.score}%` }}
                    />
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Requirements:</span> {passwordStrength.feedback.join(', ')}
                    </div>
                  )}
                  {passwordStrength.isValid && (
                    <div className="flex items-center gap-2 text-xs text-green-600">
                      <CheckCircle className="w-3 h-3" />
                      <span>Password meets security requirements</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className={`pr-10 ${errors.confirmPassword ? 'border-red-500 focus:border-red-500' : ''}`}
                  disabled={isCreating}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  disabled={isCreating}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              {/* Confirm Password Error */}
              {errors.confirmPassword && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <XCircle className="w-4 h-4" />
                  <span>{errors.confirmPassword}</span>
                </div>
              )}
              
              {/* Password Match Indicator */}
              {confirmPassword && !errors.confirmPassword && (
                <div className="flex items-center gap-2 text-sm">
                  {passwordsMatch ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-green-600">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-red-600">Passwords do not match</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Terms and Privacy */}
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className={`mt-1 ${errors.terms ? 'border-red-500' : ''}`}
                  disabled={isCreating}
                />
                <label htmlFor="terms" className="text-sm text-muted-foreground">
                  I agree to the{' '}
                  <a href="/terms" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                    Privacy Policy
                  </a>
                </label>
              </div>
              
              {/* Terms Error */}
              {errors.terms && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <XCircle className="w-4 h-4" />
                  <span>{errors.terms}</span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isCreating || !passwordStrength.isValid || !passwordsMatch || !agreedToTerms || isSuccess}
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {getStepMessage(creationStep)}
                </>
              ) : isSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Account Created Successfully!
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Create Account & Join Organization
                </>
              )}
            </Button>

            {/* Form Status Help Text */}
            {!isCreating && !isSuccess && (
              <div className="text-xs text-center text-muted-foreground space-y-1">
                {!passwordStrength.isValid && (
                  <p>• Password must meet security requirements</p>
                )}
                {!passwordsMatch && confirmPassword && (
                  <p>• Passwords must match</p>
                )}
                {!agreedToTerms && (
                  <p>• Please agree to terms and privacy policy</p>
                )}
                {passwordStrength.isValid && passwordsMatch && agreedToTerms && (
                  <p className="text-green-600">✓ Ready to create account</p>
                )}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}