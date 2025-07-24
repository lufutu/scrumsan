/**
 * @fileoverview React hooks for member profile management
 * 
 * This module provides React hooks for managing detailed member profiles,
 * including personal information, contact details, and privacy settings.
 * 
 * Key features:
 * - Member profile CRUD operations with validation
 * - Privacy and visibility controls
 * - Field-level access control based on user roles
 * - Comprehensive data validation and error handling
 * 
 * @author Team Management System
 * @version 1.0.0
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { toast } from 'sonner'
import { cacheKeys, invalidationPatterns } from '@/lib/query-optimization'

/**
 * Generic fetcher function for API requests
 * @param url - API endpoint URL
 * @returns Promise resolving to JSON response
 * @throws Error if request fails
 */
const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
})

/**
 * Complete member profile data structure
 * @interface MemberProfile
 */
export interface MemberProfile {
  /** Unique identifier for the profile */
  id: string
  /** ID of the organization member this profile belongs to */
  organizationMemberId: string
  /** Secondary email address */
  secondaryEmail?: string | null
  /** Physical address */
  address?: string | null
  /** Phone number */
  phone?: string | null
  /** LinkedIn profile URL */
  linkedin?: string | null
  /** Skype username */
  skype?: string | null
  /** Twitter handle */
  twitter?: string | null
  /** Birthday date */
  birthday?: string | null
  /** Marital status */
  maritalStatus?: string | null
  /** Family information */
  family?: string | null
  /** Other additional information */
  other?: string | null
  /** Visibility settings for each field */
  visibility: Record<string, 'admin' | 'member'>
  /** Timestamp when the profile was created */
  createdAt: string
  /** Timestamp when the profile was last updated */
  updatedAt: string
}

/**
 * Data structure for profile updates
 * @interface ProfileUpdateData
 */
export interface ProfileUpdateData {
  /** Secondary email address */
  secondaryEmail?: string | null
  /** Physical address */
  address?: string | null
  /** Phone number */
  phone?: string | null
  /** LinkedIn profile URL */
  linkedin?: string | null
  /** Skype username */
  skype?: string | null
  /** Twitter handle */
  twitter?: string | null
  /** Birthday date */
  birthday?: string | null
  /** Marital status */
  maritalStatus?: string | null
  /** Family information */
  family?: string | null
  /** Other additional information */
  other?: string | null
  /** Visibility settings for fields */
  visibility?: Record<string, 'admin' | 'member'>
}

/**
 * Hook for managing member profiles
 * 
 * Provides comprehensive member profile management including personal information,
 * contact details, privacy settings, and field-level access control.
 * 
 * @param organizationId - ID of the organization
 * @param memberId - ID of the member whose profile to manage
 * @returns Object containing profile data, operations, and utility functions
 * 
 * @example
 * ```typescript
 * const {
 *   profile,
 *   updateProfile,
 *   updateVisibility,
 *   canViewField,
 *   validateProfileData
 * } = useMemberProfile('org-123', 'member-456');
 * ```
 */
export function useMemberProfile(organizationId: string, memberId: string) {
  const queryClient = useQueryClient()
  
  const { data, error, isLoading, refetch } = useQuery<MemberProfile>({
    queryKey: cacheKeys.memberProfile(organizationId, memberId),
    queryFn: () => {
      if (!organizationId || !memberId) throw new Error('Organization ID and Member ID are required')
      return fetcher(`/api/organizations/${organizationId}/members/${memberId}/profile`)
    },
    enabled: !!(organizationId && memberId),
    staleTime: 5 * 60 * 1000, // 5 minutes for profile data
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
  })

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: ProfileUpdateData) => {
      if (!organizationId || !memberId) throw new Error('Organization ID and Member ID are required')

      const response = await fetch(`/api/organizations/${organizationId}/members/${memberId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update profile')
      }

      return response.json()
    },
    onSuccess: (updatedProfile) => {
      // Invalidate related queries
      invalidationPatterns.memberSpecific(organizationId, memberId).forEach(pattern => {
        queryClient.invalidateQueries({ queryKey: pattern })
      })
      
      // Update cache directly
      queryClient.setQueryData(cacheKeys.memberProfile(organizationId, memberId), updatedProfile)
      
      toast.success('Profile updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const updateProfile = useCallback((profileData: ProfileUpdateData) => {
    return updateProfileMutation.mutateAsync(profileData)
  }, [updateProfileMutation])

  /**
   * Update visibility setting for a specific profile field
   * 
   * @param field - Name of the profile field to update visibility for
   * @param visibility - New visibility level ('admin' or 'member')
   * @returns Promise that resolves when the update is complete
   */
  const updateVisibility = useCallback(async (field: string, visibility: 'admin' | 'member') => {
    if (!data) throw new Error('Profile data not loaded')

    const updatedVisibility = {
      ...data.visibility,
      [field]: visibility
    }

    return updateProfile({ visibility: updatedVisibility })
  }, [data, updateProfile])

  /**
   * Get the current visibility setting for a profile field
   * 
   * @param field - Name of the profile field to check
   * @returns Current visibility level for the field
   */
  const getFieldVisibility = useCallback((field: string): 'admin' | 'member' => {
    if (!data?.visibility) return 'member'
    return data.visibility[field] || 'member'
  }, [data])

  /**
   * Check if a user can view a specific profile field based on their role
   * 
   * @param field - Name of the profile field to check
   * @param userRole - Role of the user requesting access
   * @returns True if the user can view the field
   */
  const canViewField = useCallback((field: string, userRole: 'owner' | 'admin' | 'member'): boolean => {
    const fieldVisibility = getFieldVisibility(field)
    
    if (userRole === 'owner') return true
    if (userRole === 'admin') return true
    if (fieldVisibility === 'member') return true
    
    return false
  }, [getFieldVisibility])

  /**
   * Get default visibility settings for new profiles
   * 
   * Provides sensible default visibility settings that balance privacy
   * with organizational transparency needs.
   * 
   * @returns Default visibility configuration object
   */
  const getDefaultVisibility = useCallback((): Record<string, 'admin' | 'member'> => ({
    secondaryEmail: 'admin',
    address: 'admin',
    phone: 'admin',
    linkedin: 'member',
    skype: 'member',
    twitter: 'member',
    birthday: 'admin',
    maritalStatus: 'admin',
    family: 'admin',
    other: 'member'
  }), [])

  /**
   * Validate profile data for format and business rules
   * 
   * Performs comprehensive validation of profile data including email formats,
   * phone numbers, social media URLs, and date constraints.
   * 
   * @param profileData - Profile data to validate
   * @returns Array of validation error messages, empty if valid
   */
  const validateProfileData = useCallback((profileData: ProfileUpdateData): string[] => {
    const errors: string[] = []

    // Email validation
    if (profileData.secondaryEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.secondaryEmail)) {
      errors.push('Invalid secondary email format')
    }

    // Phone validation (basic)
    if (profileData.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(profileData.phone.replace(/[\s\-\(\)]/g, ''))) {
      errors.push('Invalid phone number format')
    }

    // LinkedIn URL validation
    if (profileData.linkedin && profileData.linkedin.trim() && 
        !profileData.linkedin.match(/^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-]+\/?$/)) {
      errors.push('Invalid LinkedIn URL format')
    }

    // Twitter handle validation
    if (profileData.twitter && profileData.twitter.trim() && 
        !profileData.twitter.match(/^@?[a-zA-Z0-9_]{1,15}$/)) {
      errors.push('Invalid Twitter handle format')
    }

    // Birthday validation
    if (profileData.birthday) {
      const birthDate = new Date(profileData.birthday)
      const today = new Date()
      if (birthDate > today) {
        errors.push('Birthday cannot be in the future')
      }
    }

    return errors
  }, [])

  return {
    profile: data,
    isLoading,
    error,
    updateProfile,
    updateVisibility,
    getFieldVisibility,
    canViewField,
    getDefaultVisibility,
    validateProfileData,
    refetch,
    isUpdating: updateProfileMutation.isPending,
  }
}