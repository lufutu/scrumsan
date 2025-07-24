/**
 * @fileoverview React hooks for profile editor state management
 * 
 * This module provides comprehensive React hooks for managing profile editing operations,
 * including optimistic updates, error handling, rollback logic, and caching strategies
 * for avatar configurations.
 * 
 * Key features:
 * - Profile editing operations with optimistic updates
 * - Avatar upload and management with caching
 * - Comprehensive error handling and rollback logic
 * - Real-time form state management
 * - Avatar configuration caching strategies
 * 
 * @author Avatar Profile Enhancement System
 * @version 1.0.0
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

import { cacheKeys, invalidationPatterns } from '@/lib/query-optimization'
import { useOptimisticUpdates } from '@/lib/optimistic-updates'
import { uploadAvatarToS3, deleteFileFromS3ByUrl } from '@/lib/aws/s3'
import { generateCachedAvatarConfig, clearAvatarCache, getFallbackSeed } from '@/lib/avatar-utils'
import { useMemberProfile, ProfileUpdateData } from '@/hooks/useMemberProfile'

/**
 * Profile form data structure
 */
export interface ProfileFormData {
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

/**
 * Avatar upload result
 */
export interface AvatarUploadResult {
  url: string
  filename: string
  key: string
}

/**
 * Form validation errors
 */
export interface FormErrors {
  [key: string]: string
}

/**
 * Profile editor state
 */
export interface ProfileEditorState {
  formData: ProfileFormData
  formErrors: FormErrors
  hasUnsavedChanges: boolean
  isSaving: boolean
  isUploadingAvatar: boolean
  isDirty: boolean
}

/**
 * Avatar configuration with caching metadata
 */
export interface CachedAvatarConfig {
  seed: string
  config: any
  generatedAt: Date
  version: string
  cacheKey: string
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
 * Hook for managing profile editor state with optimistic updates
 * 
 * Provides comprehensive profile editing functionality including form state management,
 * validation, optimistic updates, and error handling with rollback capabilities.
 * 
 * @param organizationId - ID of the organization
 * @param memberId - ID of the member whose profile to edit
 * @param userId - ID of the user (for avatar operations)
 * @param options - Configuration options for the hook behavior
 * @returns Object containing profile editor state and operations
 * 
 * @example
 * ```typescript
 * const {
 *   state,
 *   updateField,
 *   saveProfile,
 *   uploadAvatar,
 *   removeAvatar,
 *   validateForm,
 *   resetForm
 * } = useProfileEditor('org-123', 'member-456', 'user-789');
 * ```
 */
export function useProfileEditor(
  organizationId: string,
  memberId: string,
  userId: string,
  options: {
    enableOptimisticUpdates?: boolean
    autoSave?: boolean
    autoSaveDelay?: number
  } = {}
) {
  const { enableOptimisticUpdates = true, autoSave = false, autoSaveDelay = 2000 } = options
  const queryClient = useQueryClient()

  // Get member profile data
  const {
    profile,
    isLoading: profileLoading,
    updateProfile,
    validateProfileData,
    error: profileError
  } = useMemberProfile(organizationId, memberId)

  // Form state management
  const [formData, setFormData] = useState<ProfileFormData>({})
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [originalFormData, setOriginalFormData] = useState<ProfileFormData>({})

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      const initialData: ProfileFormData = {
        secondaryEmail: profile.secondaryEmail || '',
        address: profile.address || '',
        phone: profile.phone || '',
        linkedin: profile.linkedin || '',
        skype: profile.skype || '',
        twitter: profile.twitter || '',
        birthday: profile.birthday || '',
        maritalStatus: profile.maritalStatus || '',
        family: profile.family || '',
        other: profile.other || '',
      }
      setFormData(initialData)
      setOriginalFormData(initialData)
      setHasUnsavedChanges(false)
      setFormErrors({})
    }
  }, [profile])

  // Check if form is dirty (has changes from original)
  const isDirty = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(originalFormData)
  }, [formData, originalFormData])

  // Profile editor state
  const state: ProfileEditorState = {
    formData,
    formErrors,
    hasUnsavedChanges,
    isSaving,
    isUploadingAvatar,
    isDirty
  }

  // Set up optimistic updates for profile data
  const { optimisticUpdate } = useOptimisticUpdates(
    profile ? [profile] : [],
    (updatedProfiles) => {
      if (enableOptimisticUpdates && updatedProfiles.length > 0) {
        queryClient.setQueryData(
          cacheKeys.memberProfile(organizationId, memberId),
          updatedProfiles[0]
        )
      }
    }
  )

  /**
   * Update a form field with validation
   */
  const updateField = useCallback((field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasUnsavedChanges(true)
    
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }))
    }
  }, [formErrors])

  /**
   * Validate the entire form
   */
  const validateForm = useCallback((): boolean => {
    try {
      // Convert empty strings to undefined for validation
      const dataToValidate = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => [
          key,
          value === '' ? undefined : value
        ])
      )
      
      profileFormSchema.parse(dataToValidate)
      setFormErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: FormErrors = {}
        error.errors.forEach(err => {
          if (err.path.length > 0) {
            errors[err.path[0] as string] = err.message
          }
        })
        setFormErrors(errors)
      }
      return false
    }
  }, [formData])

  /**
   * Save profile with optimistic updates
   */
  const saveProfile = useCallback(async (): Promise<void> => {
    if (!validateForm()) {
      toast.error('Please fix validation errors before saving')
      return
    }

    setIsSaving(true)
    try {
      // Convert empty strings to null for API
      const dataToSave = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => [
          key,
          value === '' ? null : value
        ])
      ) as ProfileUpdateData

      if (enableOptimisticUpdates && profile) {
        // Use optimistic update
        const optimisticProfile = { ...profile, ...dataToSave }
        await optimisticUpdate(
          optimisticProfile,
          () => updateProfile(dataToSave),
          {
            successMessage: 'Profile updated successfully!',
            errorMessage: 'Failed to save profile. Please try again.'
          }
        )
      } else {
        // Direct update without optimistic behavior
        await updateProfile(dataToSave)
        toast.success('Profile updated successfully!')
      }

      setHasUnsavedChanges(false)
      setOriginalFormData(formData)
    } catch (error) {
      console.error('Failed to save profile:', error)
      if (!enableOptimisticUpdates) {
        toast.error('Failed to save profile. Please try again.')
      }
    } finally {
      setIsSaving(false)
    }
  }, [formData, validateForm, updateProfile, enableOptimisticUpdates, profile, optimisticUpdate])

  /**
   * Reset form to original state
   */
  const resetForm = useCallback(() => {
    setFormData(originalFormData)
    setFormErrors({})
    setHasUnsavedChanges(false)
  }, [originalFormData])

  /**
   * Upload avatar with optimistic updates
   */
  const uploadAvatar = useCallback(async (file: File): Promise<AvatarUploadResult> => {
    if (!userId) {
      throw new Error('User ID is required for avatar upload')
    }

    setIsUploadingAvatar(true)
    try {
      const result = await uploadAvatarToS3(userId, file)
      
      // Invalidate user-related queries to refresh avatar
      queryClient.invalidateQueries({ 
        queryKey: ['user', userId] 
      })
      
      // Clear avatar cache for this user
      const userEmail = profile?.organizationMemberId // This might need adjustment based on actual user data structure
      if (userEmail) {
        clearAvatarCache(userEmail)
      }
      
      toast.success('Avatar uploaded successfully!')
      return result
    } catch (error) {
      console.error('Avatar upload failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload avatar'
      toast.error(errorMessage)
      throw error
    } finally {
      setIsUploadingAvatar(false)
    }
  }, [userId, queryClient, profile])

  /**
   * Remove avatar
   */
  const removeAvatar = useCallback(async (avatarUrl?: string): Promise<void> => {
    try {
      if (avatarUrl) {
        await deleteFileFromS3ByUrl(avatarUrl)
      }
      
      // Invalidate user-related queries
      queryClient.invalidateQueries({ 
        queryKey: ['user', userId] 
      })
      
      toast.success('Avatar removed successfully!')
    } catch (error) {
      console.error('Avatar removal failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove avatar'
      toast.error(errorMessage)
      throw error
    }
  }, [userId, queryClient])

  return {
    state,
    profile,
    isLoading: profileLoading,
    error: profileError,
    updateField,
    validateForm,
    saveProfile,
    resetForm,
    uploadAvatar,
    removeAvatar
  }
}

/**
 * Hook for managing avatar configurations with caching
 * 
 * Provides avatar configuration management with intelligent caching strategies
 * to improve performance and reduce redundant generation.
 * 
 * @param seed - The seed string for avatar generation
 * @param options - Configuration options for caching behavior
 * @returns Object containing avatar configuration and cache management functions
 * 
 * @example
 * ```typescript
 * const {
 *   avatarConfig,
 *   isLoading,
 *   refreshConfig,
 *   clearCache
 * } = useAvatarConfig('user@example.com', {
 *   enableCaching: true,
 *   cacheVersion: '1.0'
 * });
 * ```
 */
export function useAvatarConfig(
  seed: string,
  options: {
    enableCaching?: boolean
    cacheVersion?: string
    fallbackSeeds?: string[]
  } = {}
) {
  const { enableCaching = true, cacheVersion = '1.0', fallbackSeeds = [] } = options

  // Generate effective seed with fallbacks
  const effectiveSeed = useMemo(() => {
    return getFallbackSeed(seed, ...fallbackSeeds)
  }, [seed, fallbackSeeds])

  // Query for avatar configuration
  const { data: avatarConfig, isLoading, error, refetch } = useQuery<CachedAvatarConfig>({
    queryKey: ['avatarConfig', effectiveSeed, cacheVersion],
    queryFn: () => {
      const config = enableCaching 
        ? generateCachedAvatarConfig(effectiveSeed, cacheVersion)
        : {
            seed: effectiveSeed,
            config: generateCachedAvatarConfig(effectiveSeed, cacheVersion).config,
            generatedAt: new Date(),
            version: cacheVersion
          }
      
      return {
        ...config,
        cacheKey: `avatarConfig-${effectiveSeed}-${cacheVersion}`
      }
    },
    staleTime: enableCaching ? 24 * 60 * 60 * 1000 : 0, // 24 hours if caching enabled
    gcTime: enableCaching ? 7 * 24 * 60 * 60 * 1000 : 0, // 7 days if caching enabled
    enabled: !!effectiveSeed
  })

  /**
   * Refresh avatar configuration
   */
  const refreshConfig = useCallback(() => {
    if (enableCaching) {
      clearAvatarCache(effectiveSeed)
    }
    refetch()
  }, [effectiveSeed, enableCaching, refetch])

  /**
   * Clear avatar cache for this seed
   */
  const clearCache = useCallback(() => {
    if (enableCaching) {
      clearAvatarCache(effectiveSeed)
    }
  }, [effectiveSeed, enableCaching])

  return {
    avatarConfig,
    isLoading,
    error,
    refreshConfig,
    clearCache,
    effectiveSeed
  }
}

/**
 * Hook for managing multiple avatar configurations (batch operations)
 * 
 * Useful for managing avatar configurations for multiple users or team members
 * with optimized batch caching and loading strategies.
 * 
 * @param seeds - Array of seed strings for avatar generation
 * @param options - Configuration options for batch operations
 * @returns Object containing batch avatar configurations and management functions
 * 
 * @example
 * ```typescript
 * const {
 *   avatarConfigs,
 *   isLoading,
 *   refreshAll,
 *   clearAllCache
 * } = useBatchAvatarConfigs(['user1@example.com', 'user2@example.com'], {
 *   enableCaching: true,
 *   batchSize: 10
 * });
 * ```
 */
export function useBatchAvatarConfigs(
  seeds: string[],
  options: {
    enableCaching?: boolean
    cacheVersion?: string
    batchSize?: number
  } = {}
) {
  const { enableCaching = true, cacheVersion = '1.0', batchSize = 20 } = options

  // Process seeds in batches to avoid overwhelming the system
  const batchedSeeds = useMemo(() => {
    const batches: string[][] = []
    for (let i = 0; i < seeds.length; i += batchSize) {
      batches.push(seeds.slice(i, i + batchSize))
    }
    return batches
  }, [seeds, batchSize])

  // Query for batch avatar configurations
  const { data: avatarConfigs, isLoading, error, refetch } = useQuery<Record<string, CachedAvatarConfig>>({
    queryKey: ['batchAvatarConfigs', seeds, cacheVersion],
    queryFn: async () => {
      const configs: Record<string, CachedAvatarConfig> = {}
      
      // Process each batch
      for (const batch of batchedSeeds) {
        await Promise.all(
          batch.map(async (seed) => {
            const effectiveSeed = getFallbackSeed(seed)
            const config = enableCaching 
              ? generateCachedAvatarConfig(effectiveSeed, cacheVersion)
              : {
                  seed: effectiveSeed,
                  config: generateCachedAvatarConfig(effectiveSeed, cacheVersion).config,
                  generatedAt: new Date(),
                  version: cacheVersion
                }
            
            configs[seed] = {
              ...config,
              cacheKey: `avatarConfig-${effectiveSeed}-${cacheVersion}`
            }
          })
        )
      }
      
      return configs
    },
    staleTime: enableCaching ? 24 * 60 * 60 * 1000 : 0, // 24 hours if caching enabled
    gcTime: enableCaching ? 7 * 24 * 60 * 60 * 1000 : 0, // 7 days if caching enabled
    enabled: seeds.length > 0
  })

  /**
   * Refresh all avatar configurations
   */
  const refreshAll = useCallback(() => {
    if (enableCaching) {
      seeds.forEach(seed => clearAvatarCache(seed))
    }
    refetch()
  }, [seeds, enableCaching, refetch])

  /**
   * Clear all avatar cache
   */
  const clearAllCache = useCallback(() => {
    if (enableCaching) {
      seeds.forEach(seed => clearAvatarCache(seed))
    }
  }, [seeds, enableCaching])

  return {
    avatarConfigs: avatarConfigs || {},
    isLoading,
    error,
    refreshAll,
    clearAllCache,
    batchedSeeds
  }
}