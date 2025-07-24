'use client'

import { useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface ProfileStatistics {
  totalMembers: number
  membersWithAvatars: number
  membersWithProfiles: number
  recentProfileUpdates: number
  avatarCompletionRate: number
  profileCompletionRate: number
}

interface RoleDistribution {
  role: string
  count: number
}

interface ProfileOverview {
  statistics: ProfileStatistics
  roleDistribution: RoleDistribution[]
}

interface BulkActionResult {
  memberId: string
  success: boolean
  message?: string
  error?: string
}

interface BulkActionResponse {
  success: boolean
  action: string
  summary: {
    total: number
    successful: number
    failed: number
  }
  results: BulkActionResult[]
}

interface BulkActionOptions {
  visibility?: Record<string, string>
}

/**
 * Hook for admin profile management operations
 */
export function useAdminProfileManagement(organizationId: string) {
  const queryClient = useQueryClient()
  const [isProcessing, setIsProcessing] = useState(false)

  // Fetch profile management overview
  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useQuery<ProfileOverview>({
    queryKey: ['admin-profile-overview', organizationId],
    queryFn: async () => {
      const response = await fetch(`/api/organizations/${organizationId}/admin/profiles`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch profile overview')
      }
      return response.json()
    },
    enabled: !!organizationId,
  })

  // Bulk avatar reset mutation
  const bulkAvatarResetMutation = useMutation({
    mutationFn: async (memberIds: string[]): Promise<BulkActionResponse> => {
      const response = await fetch(`/api/organizations/${organizationId}/admin/profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reset_avatars',
          memberIds,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to reset avatars')
      }

      return response.json()
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['team-members', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['admin-profile-overview', organizationId] })
      
      const { summary } = data
      if (summary.failed > 0) {
        toast.warning(
          `Reset ${summary.successful} avatars successfully, ${summary.failed} failed`
        )
      } else {
        toast.success(`Successfully reset ${summary.successful} avatars`)
      }
    },
    onError: (error) => {
      console.error('Bulk avatar reset failed:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to reset avatars')
    },
  })

  // Individual avatar reset mutation
  const avatarResetMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await fetch(
        `/api/organizations/${organizationId}/admin/profiles/${memberId}/avatar/reset`,
        {
          method: 'POST',
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to reset avatar')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['team-members', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['admin-profile-overview', organizationId] })
      toast.success('Avatar reset successfully')
    },
    onError: (error) => {
      console.error('Avatar reset failed:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to reset avatar')
    },
  })

  // Bulk visibility update mutation
  const bulkVisibilityUpdateMutation = useMutation({
    mutationFn: async ({ 
      memberIds, 
      visibilitySettings 
    }: { 
      memberIds: string[]
      visibilitySettings: Record<string, string>
    }): Promise<BulkActionResponse> => {
      const response = await fetch(`/api/organizations/${organizationId}/admin/profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_visibility',
          memberIds,
          options: {
            visibility: visibilitySettings,
          },
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update visibility settings')
      }

      return response.json()
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['team-members', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['member-profile'] })
      
      const { summary } = data
      if (summary.failed > 0) {
        toast.warning(
          `Updated ${summary.successful} profiles successfully, ${summary.failed} failed`
        )
      } else {
        toast.success(`Successfully updated ${summary.successful} profiles`)
      }
    },
    onError: (error) => {
      console.error('Bulk visibility update failed:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update visibility settings')
    },
  })

  // Export profiles function
  const exportProfiles = useCallback(async (memberIds: string[]) => {
    try {
      setIsProcessing(true)
      
      const response = await fetch(`/api/organizations/${organizationId}/admin/profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'export_profiles',
          memberIds,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to export profiles')
      }

      const data = await response.json()
      
      // Convert data to CSV and download
      if (data.data && data.data.length > 0) {
        const csvData = data.data.map((profile: any) => ({
          'Full Name': profile.organizationMember.user.fullName || '',
          'Email': profile.organizationMember.user.email || '',
          'Role': profile.organizationMember.role,
          'Job Title': profile.organizationMember.jobTitle || '',
          'Secondary Email': profile.secondaryEmail || '',
          'Phone': profile.phone || '',
          'Address': profile.address || '',
          'LinkedIn': profile.linkedin || '',
          'Skype': profile.skype || '',
          'Twitter': profile.twitter || '',
          'Birthday': profile.birthday ? new Date(profile.birthday).toLocaleDateString() : '',
          'Marital Status': profile.maritalStatus || '',
          'Has Avatar': profile.organizationMember.user.avatarUrl ? 'Yes' : 'No',
          'Profile Updated': profile.updatedAt ? new Date(profile.updatedAt).toLocaleDateString() : '',
        }))
        
        const csvContent = [
          Object.keys(csvData[0]).join(','),
          ...csvData.map(row => 
            Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
          )
        ].join('\n')
        
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `member-profiles-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        toast.success(`Exported ${data.summary.exported} profiles`)
      } else {
        toast.warning('No profile data to export')
      }
    } catch (error) {
      console.error('Export profiles failed:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to export profiles')
    } finally {
      setIsProcessing(false)
    }
  }, [organizationId])

  // Bulk operations wrapper
  const performBulkAction = useCallback(async (
    action: 'reset_avatars' | 'update_visibility' | 'export_profiles',
    memberIds: string[],
    options?: BulkActionOptions
  ) => {
    if (memberIds.length === 0) {
      toast.error('Please select at least one member')
      return
    }

    switch (action) {
      case 'reset_avatars':
        return bulkAvatarResetMutation.mutateAsync(memberIds)
      
      case 'update_visibility':
        if (!options?.visibility) {
          toast.error('Visibility settings are required')
          return
        }
        return bulkVisibilityUpdateMutation.mutateAsync({
          memberIds,
          visibilitySettings: options.visibility,
        })
      
      case 'export_profiles':
        return exportProfiles(memberIds)
      
      default:
        toast.error('Invalid bulk action')
    }
  }, [bulkAvatarResetMutation, bulkVisibilityUpdateMutation, exportProfiles])

  return {
    // Data
    overview,
    overviewLoading,
    overviewError,
    
    // State
    isProcessing: isProcessing || 
      bulkAvatarResetMutation.isPending || 
      avatarResetMutation.isPending || 
      bulkVisibilityUpdateMutation.isPending,
    
    // Actions
    resetAvatar: avatarResetMutation.mutateAsync,
    bulkResetAvatars: bulkAvatarResetMutation.mutateAsync,
    bulkUpdateVisibility: bulkVisibilityUpdateMutation.mutateAsync,
    exportProfiles,
    performBulkAction,
    refetchOverview,
    
    // Mutation states
    isResettingAvatar: avatarResetMutation.isPending,
    isBulkResettingAvatars: bulkAvatarResetMutation.isPending,
    isBulkUpdatingVisibility: bulkVisibilityUpdateMutation.isPending,
  }
}