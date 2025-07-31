"use client"

import * as React from "react"
import { useState, useCallback, useEffect, useMemo } from "react"
import { User, Settings, Camera, Save, Loader2, AlertCircle, RefreshCw, WifiOff } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { EnhancedAvatar } from "@/components/ui/enhanced-avatar"
import { AvatarUpload } from "@/components/profile/avatar-upload"
import { ErrorState } from "@/components/ui/error-state"
import { ComponentErrorBoundary } from "@/components/ui/error-boundary"

import { useProfileEditor } from "@/hooks/useProfileEditor"
import { useAvatarState } from "@/hooks/useAvatarState"
import { useActiveOrg } from "@/hooks/useActiveOrg"
import { useSupabase } from "@/providers/supabase-provider"
import { useOrganization } from "@/providers/organization-provider"
import { getErrorMessage, showErrorToast } from "@/lib/error-messages"

export interface ProfileEditorDialogProps {
  /**
   * Whether the dialog is open
   */
  isOpen: boolean
  
  /**
   * Callback when dialog should close
   */
  onClose: () => void
  
  /**
   * User ID to edit profile for (if editing another user as admin)
   * If not provided, edits current user's profile
   */
  userId?: string
  
  /**
   * Member ID to edit profile for (required for admin editing)
   */
  memberId?: string
  
  /**
   * Organization ID (required for admin editing)
   */
  organizationId?: string
  
  /**
   * Initial tab to show
   */
  initialTab?: 'profile' | 'avatar' | 'preferences'
  
  /**
   * Whether this is being opened by an admin for another user
   */
  isAdminEdit?: boolean
}

interface ProfileFormData {
  secondaryEmail?: string
  address?: string
  phone?: string
  linkedin?: string
  skype?: string
  twitter?: string
  birthday?: string
  maritalStatus?: string
  family?: string
  other?: string
}

interface FormErrors {
  [key: string]: string
}

interface ErrorState {
  hasError: boolean
  error?: Error | null
  context?: string
  canRetry?: boolean
}

// Validation schema for profile form
const profileFormSchema = z.object({
  secondaryEmail: z.string().email('Invalid email format').optional().or(z.literal('')),
  address: z.string().max(500, 'Address too long').optional(),
  phone: z.string().max(50, 'Phone number too long').optional(),
  linkedin: z.string().url('Invalid LinkedIn URL').optional().or(z.literal('')),
  skype: z.string().max(100, 'Skype username too long').optional(),
  twitter: z.string().max(100, 'Twitter handle too long').optional(),
  birthday: z.string().optional(),
  maritalStatus: z.string().max(50, 'Marital status too long').optional(),
  family: z.string().max(1000, 'Family information too long').optional(),
  other: z.string().max(2000, 'Other information too long').optional(),
})

/**
 * Profile Editor Dialog Component
 * 
 * Provides a comprehensive profile editing interface with tabbed sections for:
 * - Profile information (contact details, personal info)
 * - Avatar management (upload, crop, remove)
 * - Preferences (future implementation)
 * 
 * Features:
 * - Real-time form validation
 * - Avatar upload with preview
 * - Permission-based editing
 * - Optimistic updates
 * - Error handling and recovery
 */
export function ProfileEditorDialog({
  isOpen,
  onClose,
  userId,
  memberId,
  organizationId,
  initialTab = 'profile',
  isAdminEdit = false
}: ProfileEditorDialogProps) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [errorState, setErrorState] = useState<ErrorState>({ hasError: false })

  // Get active organization and current user
  const activeOrg = useActiveOrg()
  const { user } = useSupabase()
  const { currentMember } = useOrganization()
  
  // Set current user when available
  useEffect(() => {
    if (user) {
      setCurrentUser(user)
    }
  }, [user])

  // Determine target user ID (current user or specified user)
  const targetUserId = userId || currentUser?.id
  const isOwnProfile = !userId || userId === currentUser?.id

  // Use provided member ID or current member ID for own profile
  const effectiveMemberId = memberId || currentMember?.id || ''
  const effectiveOrgId = organizationId || activeOrg?.id || ''

  // Use profile editor state management
  const {
    state: editorState,
    profile,
    isLoading: profileLoading,
    updateField,
    validateForm,
    saveProfile,
    resetForm,
    uploadAvatar,
    removeAvatar
  } = useProfileEditor(
    effectiveOrgId,
    effectiveMemberId,
    targetUserId || '',
    {
      enableOptimisticUpdates: true,
      autoSave: false
    }
  )

  // Use avatar state management
  const {
    avatarState,
    uploadAvatar: uploadAvatarWithState,
    removeAvatar: removeAvatarWithState,
    resetState: resetAvatarState
  } = useAvatarState(
    targetUserId || '',
    currentUser?.user_metadata?.avatar_url,
    {
      maxSize: 5,
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      enableOptimisticUpdates: true
    }
  )

  // Handle form field changes using the profile editor hook
  const handleFieldChange = useCallback((field: keyof ProfileFormData, value: string) => {
    updateField(field, value)
  }, [updateField])

  // Handle form save using the profile editor hook
  const handleSave = useCallback(async () => {
    try {
      setErrorState({ hasError: false })
      await saveProfile()
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Failed to save profile')
      setErrorState({
        hasError: true,
        error: error instanceof Error ? error : new Error(errorMessage),
        context: 'save',
        canRetry: true
      })
      showErrorToast(error, 'Failed to save profile', 'ProfileEditor.handleSave')
    }
  }, [saveProfile])

  // Handle avatar upload using the avatar state hook
  const handleAvatarUpload = useCallback(async (file: File): Promise<string> => {
    try {
      setErrorState({ hasError: false })
      const result = await uploadAvatarWithState(file)
      return result?.url || ''
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Failed to upload avatar')
      setErrorState({
        hasError: true,
        error: error instanceof Error ? error : new Error(errorMessage),
        context: 'avatar-upload',
        canRetry: true
      })
      throw error // Re-throw to let AvatarUpload handle it
    }
  }, [uploadAvatarWithState])

  // Handle avatar removal using the avatar state hook
  const handleAvatarRemove = useCallback(async () => {
    try {
      setErrorState({ hasError: false })
      await removeAvatarWithState()
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Failed to remove avatar')
      setErrorState({
        hasError: true,
        error: error instanceof Error ? error : new Error(errorMessage),
        context: 'avatar-remove',
        canRetry: true
      })
      showErrorToast(error, 'Failed to remove avatar', 'ProfileEditor.handleAvatarRemove')
    }
  }, [removeAvatarWithState])

  // Handle dialog close with unsaved changes warning
  const handleClose = useCallback(() => {
    if (editorState.hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        resetForm()
        resetAvatarState()
        onClose()
      }
    } else {
      onClose()
    }
  }, [editorState.hasUnsavedChanges, resetForm, resetAvatarState, onClose])

  // Reset tab when dialog opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab)
    }
  }, [isOpen, initialTab])

  // Generate fallback seed for avatar
  const avatarFallbackSeed = useMemo(() => {
    if (currentUser?.email) return currentUser.email
    if (currentUser?.user_metadata?.full_name) return currentUser.user_metadata.full_name
    return 'default-user'
  }, [currentUser])

  // Handle avatar errors
  const handleAvatarError = useCallback((error: Error) => {
    setErrorState({
      hasError: true,
      error,
      context: 'avatar-display',
      canRetry: true
    })
  }, [])

  // Handle retry for various error contexts
  const handleRetry = useCallback(() => {
    setErrorState({ hasError: false })
    
    switch (errorState.context) {
      case 'save':
        handleSave()
        break
      case 'avatar-upload':
        // Avatar upload retry is handled by the AvatarUpload component
        break
      case 'avatar-remove':
        handleAvatarRemove()
        break
      case 'avatar-display':
        // Avatar display retry is handled by the EnhancedAvatar component
        break
      default:
        // Generic retry - just clear the error
        break
    }
  }, [errorState.context, handleSave, handleAvatarRemove])

  // Handle custom error from avatar upload component
  const handleAvatarUploadError = useCallback((error: Error, context: string) => {
    setErrorState({
      hasError: true,
      error,
      context: `avatar-${context}`,
      canRetry: context === 'upload' || context === 'network'
    })
  }, [])

  if (!isOpen) return null

  // Don't render dialog content until we have the required data for own profile
  if (isOwnProfile && (!currentMember?.id || !effectiveOrgId)) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="w-full max-w-[400px]">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading profile...</span>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <ComponentErrorBoundary>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <EnhancedAvatar
                src={currentUser?.user_metadata?.avatar_url}
                fallbackSeed={avatarFallbackSeed}
                size="lg"
                showErrorHandling={true}
                onAvatarError={handleAvatarError}
                maxRetries={2}
              />
              <div className="flex-1">
                <h2 className="text-xl font-semibold">
                  {isOwnProfile ? 'My Profile' : isAdminEdit ? 'Edit Member Profile' : 'Edit Profile'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {currentUser?.user_metadata?.full_name || currentUser?.email}
                  {isAdminEdit && !isOwnProfile && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Admin Edit
                    </span>
                  )}
                </p>
              </div>
              {editorState.hasUnsavedChanges && (
                <Badge variant="outline" className="text-xs">
                  Unsaved changes
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Global Error State */}
          {errorState.hasError && errorState.context !== 'avatar-upload' && (
            <div className="mb-4">
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-800 mb-1">
                    {errorState.context === 'save' && 'Failed to Save Profile'}
                    {errorState.context === 'avatar-remove' && 'Failed to Remove Avatar'}
                    {errorState.context === 'avatar-display' && 'Avatar Display Error'}
                    {!errorState.context && 'An Error Occurred'}
                  </p>
                  <p className="text-sm text-red-700">
                    {errorState.error?.message || 'Please try again or contact support if the problem persists.'}
                  </p>
                </div>
                {errorState.canRetry && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRetry}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                )}
              </div>
            </div>
          )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="avatar" className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Avatar
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Preferences
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6 mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Personal Information</h3>
              <Button
                onClick={handleSave}
                disabled={editorState.isSaving || !editorState.hasUnsavedChanges}
                size="sm"
              >
                {editorState.isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>

            <Separator />

            {profileLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-muted rounded w-24" />
                    <div className="h-9 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-4">
                {/* Secondary Email */}
                <div className="space-y-2">
                  <Label htmlFor="secondaryEmail">Secondary Email</Label>
                  <Input
                    id="secondaryEmail"
                    type="email"
                    value={editorState.formData.secondaryEmail || ''}
                    onChange={(e) => handleFieldChange('secondaryEmail', e.target.value)}
                    placeholder="secondary@example.com"
                    className={editorState.formErrors.secondaryEmail ? 'border-destructive' : ''}
                  />
                  {editorState.formErrors.secondaryEmail && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {editorState.formErrors.secondaryEmail}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={editorState.formData.phone || ''}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className={editorState.formErrors.phone ? 'border-destructive' : ''}
                  />
                  {editorState.formErrors.phone && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {editorState.formErrors.phone}
                    </p>
                  )}
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={editorState.formData.address || ''}
                    onChange={(e) => handleFieldChange('address', e.target.value)}
                    placeholder="Street address, city, state, country"
                    rows={3}
                    className={editorState.formErrors.address ? 'border-destructive' : ''}
                  />
                  {editorState.formErrors.address && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {editorState.formErrors.address}
                    </p>
                  )}
                </div>

                {/* LinkedIn */}
                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn Profile</Label>
                  <Input
                    id="linkedin"
                    type="url"
                    value={editorState.formData.linkedin || ''}
                    onChange={(e) => handleFieldChange('linkedin', e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    className={editorState.formErrors.linkedin ? 'border-destructive' : ''}
                  />
                  {editorState.formErrors.linkedin && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {editorState.formErrors.linkedin}
                    </p>
                  )}
                </div>

                {/* Social Media Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="skype">Skype</Label>
                    <Input
                      id="skype"
                      value={editorState.formData.skype || ''}
                      onChange={(e) => handleFieldChange('skype', e.target.value)}
                      placeholder="skype.username"
                      className={editorState.formErrors.skype ? 'border-destructive' : ''}
                    />
                    {editorState.formErrors.skype && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {editorState.formErrors.skype}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="twitter">Twitter</Label>
                    <Input
                      id="twitter"
                      value={editorState.formData.twitter || ''}
                      onChange={(e) => handleFieldChange('twitter', e.target.value)}
                      placeholder="@username"
                      className={editorState.formErrors.twitter ? 'border-destructive' : ''}
                    />
                    {editorState.formErrors.twitter && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {editorState.formErrors.twitter}
                      </p>
                    )}
                  </div>
                </div>

                {/* Personal Information Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="birthday">Birthday</Label>
                    <Input
                      id="birthday"
                      type="date"
                      value={editorState.formData.birthday || ''}
                      onChange={(e) => handleFieldChange('birthday', e.target.value)}
                      className={editorState.formErrors.birthday ? 'border-destructive' : ''}
                    />
                    {editorState.formErrors.birthday && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {editorState.formErrors.birthday}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maritalStatus">Marital Status</Label>
                    <Input
                      id="maritalStatus"
                      value={editorState.formData.maritalStatus || ''}
                      onChange={(e) => handleFieldChange('maritalStatus', e.target.value)}
                      placeholder="Single, Married, etc."
                      className={editorState.formErrors.maritalStatus ? 'border-destructive' : ''}
                    />
                    {editorState.formErrors.maritalStatus && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {editorState.formErrors.maritalStatus}
                      </p>
                    )}
                  </div>
                </div>

                {/* Family Information */}
                <div className="space-y-2">
                  <Label htmlFor="family">Family Information</Label>
                  <Textarea
                    id="family"
                    value={editorState.formData.family || ''}
                    onChange={(e) => handleFieldChange('family', e.target.value)}
                    placeholder="Family information"
                    rows={3}
                    className={editorState.formErrors.family ? 'border-destructive' : ''}
                  />
                  {editorState.formErrors.family && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {editorState.formErrors.family}
                    </p>
                  )}
                </div>

                {/* Other Information */}
                <div className="space-y-2">
                  <Label htmlFor="other">Other Information</Label>
                  <Textarea
                    id="other"
                    value={editorState.formData.other || ''}
                    onChange={(e) => handleFieldChange('other', e.target.value)}
                    placeholder="Additional information"
                    rows={3}
                    className={editorState.formErrors.other ? 'border-destructive' : ''}
                  />
                  {editorState.formErrors.other && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {editorState.formErrors.other}
                    </p>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="avatar" className="space-y-6 mt-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Profile Avatar</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Upload a profile picture or use our generated avatar based on your name.
              </p>
            </div>

            <AvatarUpload
              currentAvatar={avatarState.currentUrl || currentUser?.user_metadata?.avatar_url}
              fallbackSeed={avatarFallbackSeed}
              onUpload={handleAvatarUpload}
              onRemove={handleAvatarRemove}
              maxSize={5}
              allowedTypes={['image/jpeg', 'image/jpg', 'image/png', 'image/webp']}
              size="2xl"
              enableCropping={true}
              maxRetries={3}
              showDetailedErrors={true}
              onError={handleAvatarUploadError}
            />
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6 mt-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Preferences</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Customize your profile preferences and privacy settings.
              </p>
            </div>

            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Preferences settings will be available in a future update.
              </p>
            </div>
          </TabsContent>
        </Tabs>
        </ComponentErrorBoundary>
      </DialogContent>
    </Dialog>
  )
}