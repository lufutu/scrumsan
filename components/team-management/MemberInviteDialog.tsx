'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { UserPlus, Mail, User, Shield, Clock, AlertCircle, CheckCircle } from 'lucide-react'
import { z } from 'zod'
import { toast } from 'sonner'
import { ComponentErrorBoundary } from '@/components/ui/error-boundary'
import { useOptimisticUpdates, optimisticUpdatePatterns } from '@/lib/optimistic-updates'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/animate-ui/radix/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { usePermissionSets } from '@/hooks/usePermissionSets'
import { commonFields } from '@/lib/validation-schemas'

interface MemberInviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
}

interface UserExistenceCheck {
  exists: boolean
  user?: {
    id: string
    fullName: string | null
    email: string
    avatarUrl?: string | null
  }
  isAlreadyMember?: boolean
}

const inviteFormSchema = z.object({
  email: commonFields.email,
  role: z.enum(['admin', 'member']).default('member'),
  permissionSetId: z.string().uuid().optional(),
  jobTitle: z.string().max(255).optional(),
  workingHoursPerWeek: z.number().int().min(1).max(168).default(40),
})

type InviteFormData = z.infer<typeof inviteFormSchema>

export function MemberInviteDialog({ 
  open, 
  onOpenChange, 
  organizationId 
}: MemberInviteDialogProps) {
  return (
    <ComponentErrorBoundary>
      <MemberInviteDialogContent
        open={open}
        onOpenChange={onOpenChange}
        organizationId={organizationId}
      />
    </ComponentErrorBoundary>
  )
}

function MemberInviteDialogContent({ 
  open, 
  onOpenChange, 
  organizationId 
}: MemberInviteDialogProps) {
  const [formData, setFormData] = useState<InviteFormData>({
    email: '',
    role: 'member',
    permissionSetId: undefined,
    jobTitle: '',
    workingHoursPerWeek: 40,
  })
  
  const [userCheck, setUserCheck] = useState<UserExistenceCheck | null>(null)
  const [isCheckingUser, setIsCheckingUser] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const { addMember } = useTeamMembers(organizationId)
  const { permissionSets, isLoading: permissionSetsLoading } = usePermissionSets(organizationId)

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setFormData({
        email: '',
        role: 'member',
        permissionSetId: undefined,
        jobTitle: '',
        workingHoursPerWeek: 40,
      })
      setUserCheck(null)
      setValidationErrors({})
    }
  }, [open])

  // Check if user exists when email changes
  const checkUserExistence = useCallback(async (email: string) => {
    if (!email || !commonFields.email.safeParse(email).success) {
      setUserCheck(null)
      return
    }

    setIsCheckingUser(true)
    try {
      const response = await fetch(`/api/users/check?email=${encodeURIComponent(email)}`)
      if (response.ok) {
        const data = await response.json()
        
        // Check if user is already a member of this organization
        if (data.exists) {
          const memberCheckResponse = await fetch(
            `/api/organizations/${organizationId}/members?search=${encodeURIComponent(email)}`
          )
          if (memberCheckResponse.ok) {
            const memberData = await memberCheckResponse.json()
            const isAlreadyMember = memberData.members?.some(
              (member: any) => member.user.email.toLowerCase() === email.toLowerCase()
            )
            
            setUserCheck({
              exists: true,
              user: data.user,
              isAlreadyMember,
            })
          } else {
            setUserCheck({
              exists: true,
              user: data.user,
              isAlreadyMember: false,
            })
          }
        } else {
          setUserCheck({
            exists: false,
          })
        }
      } else {
        setUserCheck(null)
      }
    } catch (error) {
      console.error('Error checking user existence:', error)
      setUserCheck(null)
    } finally {
      setIsCheckingUser(false)
    }
  }, [organizationId])

  // Debounced email check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.email) {
        checkUserExistence(formData.email)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [formData.email, checkUserExistence])

  const handleInputChange = useCallback((field: keyof InviteFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }, [validationErrors])

  const validateForm = useCallback((): boolean => {
    const result = inviteFormSchema.safeParse(formData)
    
    if (!result.success) {
      const errors: Record<string, string> = {}
      result.error.errors.forEach(error => {
        if (error.path[0]) {
          errors[error.path[0] as string] = error.message
        }
      })
      setValidationErrors(errors)
      return false
    }

    // Additional validation
    if (userCheck?.isAlreadyMember) {
      setValidationErrors({ email: 'This user is already a member of the organization' })
      return false
    }

    setValidationErrors({})
    return true
  }, [formData, userCheck])

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      await addMember({
        email: formData.email,
        role: formData.role,
        permissionSetId: formData.permissionSetId || undefined,
        jobTitle: formData.jobTitle || undefined,
        workingHoursPerWeek: formData.workingHoursPerWeek,
      })

      // Show success message based on whether user exists
      if (userCheck?.exists) {
        toast.success(`${userCheck.user?.fullName || formData.email} has been added to the organization`)
      } else {
        toast.success(`Invitation sent to ${formData.email}`)
      }

      onOpenChange(false)
    } catch (error: any) {
      // Enhanced error handling with specific error messages
      const errorMessage = error?.message || 'Failed to add member'
      
      if (error?.status === 409) {
        toast.error('This user is already a member of the organization')
        setValidationErrors({ email: 'User is already a member' })
      } else if (error?.status === 403) {
        toast.error('You do not have permission to add members')
      } else if (error?.status === 400) {
        toast.error('Invalid member data provided')
      } else {
        toast.error(errorMessage)
      }
      
      console.error('Error adding member:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, userCheck, validateForm, addMember, onOpenChange])

  const getSubmitButtonText = () => {
    if (isSubmitting) return 'Processing...'
    if (userCheck?.exists && !userCheck.isAlreadyMember) return 'Add Member'
    if (!userCheck?.exists) return 'Send Invitation'
    return 'Add Member'
  }

  const getSubmitButtonIcon = () => {
    if (userCheck?.exists && !userCheck.isAlreadyMember) return <UserPlus className="w-4 h-4" />
    if (!userCheck?.exists) return <Mail className="w-4 h-4" />
    return <UserPlus className="w-4 h-4" />
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 shrink-0" />
            <span className="truncate">Add Team Member</span>
          </DialogTitle>
          <DialogDescription>
            Add a new member to your organization by email address.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={validationErrors.email ? 'border-destructive' : ''}
              />
              {isCheckingUser && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            {validationErrors.email && (
              <p className="text-sm text-destructive">{validationErrors.email}</p>
            )}
          </div>

          {/* User Status Display */}
          {userCheck && formData.email && !isCheckingUser && (
            <div className="space-y-2">
              {userCheck.exists && !userCheck.isAlreadyMember && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">User found</p>
                      <p className="text-sm text-muted-foreground">
                        {userCheck.user?.fullName || 'User'} will be added directly to the organization.
                      </p>
                    </div>
                    {userCheck.user?.avatarUrl && (
                      <img 
                        src={userCheck.user.avatarUrl} 
                        alt={userCheck.user.fullName || 'User'} 
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {userCheck.exists && userCheck.isAlreadyMember && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This user is already a member of the organization.
                  </AlertDescription>
                </Alert>
              )}

              {!userCheck.exists && (
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium">User not found</p>
                    <p className="text-sm text-muted-foreground">
                      An invitation email will be sent to this address.
                    </p>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select 
              value={formData.role} 
              onValueChange={(value: 'admin' | 'member') => handleInputChange('role', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <div>
                      <p className="font-medium">Member</p>
                      <p className="text-xs text-muted-foreground">Standard access</p>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <div>
                      <p className="font-medium">Admin</p>
                      <p className="text-xs text-muted-foreground">Full management access</p>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Permission Set Selection */}
          {!permissionSetsLoading && permissionSets && permissionSets.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="permissionSet">Permission Set (Optional)</Label>
              <Select 
                value={formData.permissionSetId || ''} 
                onValueChange={(value) => handleInputChange('permissionSetId', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Use default permissions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Default Permissions
                    </div>
                  </SelectItem>
                  {permissionSets.map((permissionSet) => (
                    <SelectItem key={permissionSet.id} value={permissionSet.id}>
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        <div>
                          <p className="font-medium">{permissionSet.name}</p>
                          {permissionSet._count && (
                            <p className="text-xs text-muted-foreground">
                              {permissionSet._count.members} members
                            </p>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Job Title */}
          <div className="space-y-2">
            <Label htmlFor="jobTitle">Job Title (Optional)</Label>
            <Input
              id="jobTitle"
              placeholder="e.g. Senior Developer"
              value={formData.jobTitle}
              onChange={(e) => handleInputChange('jobTitle', e.target.value)}
              className={validationErrors.jobTitle ? 'border-destructive' : ''}
            />
            {validationErrors.jobTitle && (
              <p className="text-sm text-destructive">{validationErrors.jobTitle}</p>
            )}
          </div>

          {/* Working Hours */}
          <div className="space-y-2">
            <Label htmlFor="workingHours">Working Hours per Week</Label>
            <div className="flex items-center gap-2">
              <Input
                id="workingHours"
                type="number"
                min="1"
                max="168"
                value={formData.workingHoursPerWeek}
                onChange={(e) => handleInputChange('workingHoursPerWeek', parseInt(e.target.value) || 40)}
                className={`flex-1 ${validationErrors.workingHoursPerWeek ? 'border-destructive' : ''}`}
              />
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                hours
              </Badge>
            </div>
            {validationErrors.workingHoursPerWeek && (
              <p className="text-sm text-destructive">{validationErrors.workingHoursPerWeek}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={
              isSubmitting || 
              isCheckingUser || 
              !formData.email || 
              (userCheck?.isAlreadyMember ?? false)
            }
            className="flex items-center gap-2"
          >
            {getSubmitButtonIcon()}
            {getSubmitButtonText()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}