/**
 * @fileoverview React hooks for team member management
 * 
 * This module provides comprehensive React hooks for managing organization team members,
 * including CRUD operations, filtering, searching, and optimistic updates. It integrates
 * with React Query for caching and provides both regular and infinite query options.
 * 
 * Key features:
 * - Team member CRUD operations with optimistic updates
 * - Advanced filtering and search capabilities
 * - Infinite scrolling support for large datasets
 * - Availability calculations and member profile management
 * - Comprehensive error handling and loading states
 * 
 * @author Team Management System
 * @version 1.0.0
 */

'use client'

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { cacheKeys, invalidationPatterns } from '@/lib/query-optimization'
import { useOptimisticUpdates, optimisticUpdatePatterns } from '@/lib/optimistic-updates'
import { useDebounce } from '@/hooks/useDebounce'

/**
 * Generic fetcher function for API requests
 * @param url - API endpoint URL
 * @returns Promise resolving to JSON response
 * @throws Error if request fails
 */
const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) {
    console.error('Fetch failed:', res.status, res.statusText)
    throw new Error('Failed to fetch')
  }
  return res.json()
})

/**
 * Complete organization member data structure
 * @interface OrganizationMember
 */
export interface OrganizationMember {
  /** Unique identifier for the organization membership */
  id: string
  /** ID of the organization */
  organizationId: string
  /** ID of the user */
  userId: string
  /** Role of the member in the organization */
  role: 'owner' | 'admin' | 'member'
  /** ID of assigned custom permission set */
  permissionSetId?: string | null
  /** Job title or position */
  jobTitle?: string | null
  /** Working hours per week */
  workingHoursPerWeek: number
  /** Date when the member joined the organization */
  joinDate?: string | null
  /** Timestamp when the membership was created */
  createdAt: string
  /** User information */
  user: {
    id: string
    fullName: string | null
    email: string
    avatarUrl?: string | null
  }
  /** Custom permission set data */
  permissionSet?: {
    id: string
    name: string
    permissions: Record<string, unknown>
  } | null
  /** Array of project engagements */
  engagements: Array<{
    id: string
    projectId: string
    role?: string | null
    hoursPerWeek: number
    startDate: string
    endDate?: string | null
    isActive: boolean
    project: {
      id: string
      name: string
    }
  }>
  /** Array of time-off entries */
  timeOffEntries: Array<{
    id: string
    type: string
    startDate: string
    endDate: string
    description?: string | null
    status: string
  }>
  /** Extended profile information */
  profileData?: {
    id: string
    secondaryEmail?: string | null
    address?: string | null
    phone?: string | null
    linkedin?: string | null
    skype?: string | null
    twitter?: string | null
    birthday?: string | null
    maritalStatus?: string | null
    family?: string | null
    other?: string | null
    visibility: Record<string, unknown>
  } | null
}

/**
 * Pending invitation data structure
 * @interface PendingInvitation
 */
export interface PendingInvitation {
  /** Unique identifier for the invitation */
  id: string
  /** Email address of the invited user */
  email: string
  /** Role to be assigned when invitation is accepted */
  role: 'admin' | 'member'
  /** Job title for the invited user */
  jobTitle?: string | null
  /** ID of assigned custom permission set */
  permissionSetId?: string | null
  /** Working hours per week */
  workingHoursPerWeek: number
  /** ID of the user who sent the invitation */
  invitedBy: string
  /** Secure token for the invitation */
  token: string
  /** When the invitation expires */
  expiresAt: string
  /** When the invitation was created */
  createdAt: string
  /** User who sent the invitation */
  inviter: {
    id: string
    fullName: string | null
    email: string
  }
  /** Custom permission set data */
  permissionSet?: {
    id: string
    name: string
    permissions: Record<string, unknown>
  } | null
}

/**
 * Filter options for team member queries
 * @interface FilterOptions
 */
export interface FilterOptions {
  /** Filter by member roles */
  roles?: string[]
  /** Filter by assigned projects */
  projects?: string[]
  /** Filter by total working hours range */
  totalHours?: { min: number; max: number }
  /** Filter by available hours range */
  availabilityHours?: { min: number; max: number }
  /** Filter by permission types */
  permissions?: string[]
  /** Search term for names, emails, or job titles */
  search?: string
}

/**
 * Hook for managing organization team members
 * 
 * Provides comprehensive team member management including CRUD operations,
 * filtering, searching, and availability calculations. Supports both regular
 * and infinite queries for different use cases.
 * 
 * @param organizationId - ID of the organization to manage members for
 * @param filters - Optional filter criteria for member queries
 * @param options - Configuration options for the hook behavior
 * @returns Object containing member data, operations, and loading states
 * 
 * @example
 * ```typescript
 * const {
 *   members,
 *   addMember,
 *   updateMember,
 *   removeMember,
 *   isLoading
 * } = useTeamMembers('org-123', {
 *   roles: ['admin', 'member'],
 *   search: 'john'
 * });
 * ```
 */
export function useTeamMembers(organizationId: string, filters?: FilterOptions, options?: {
  /** Enable infinite scrolling for large datasets */
  enableInfiniteQuery?: boolean
  /** Number of items per page for infinite queries */
  pageSize?: number
  /** Enable optimistic updates for better UX */
  enableOptimisticUpdates?: boolean
}) {
  const queryClient = useQueryClient()
  const { enableInfiniteQuery = false, pageSize = 25, enableOptimisticUpdates = true } = options || {}

  // Debounce search term to reduce API calls
  const debouncedSearch = useDebounce(filters?.search, 300)
  const debouncedFilters = useMemo(() => ({
    ...filters,
    search: debouncedSearch
  }), [filters, debouncedSearch])

  // Build query parameters with memoization
  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    if (debouncedFilters?.roles?.length) {
      debouncedFilters.roles.forEach(role => params.append('roles', role))
    }
    if (debouncedFilters?.projects?.length) {
      debouncedFilters.projects.forEach(project => params.append('projects', project))
    }
    if (debouncedFilters?.totalHours) {
      params.append('minHours', debouncedFilters.totalHours.min.toString())
      params.append('maxHours', debouncedFilters.totalHours.max.toString())
    }
    if (debouncedFilters?.availabilityHours) {
      params.append('minAvailability', debouncedFilters.availabilityHours.min.toString())
      params.append('maxAvailability', debouncedFilters.availabilityHours.max.toString())
    }
    if (debouncedFilters?.permissions?.length) {
      debouncedFilters.permissions.forEach(permission => params.append('permissions', permission))
    }
    if (debouncedFilters?.search) {
      params.append('search', debouncedFilters.search)
    }
    if (enableInfiniteQuery) {
      params.append('limit', pageSize.toString())
    }
    return params.toString()
  }, [debouncedFilters, enableInfiniteQuery, pageSize])

  const queryKey = cacheKeys.teamMembers(organizationId, debouncedFilters)
  
  // Regular query for smaller datasets
  const regularQuery = useQuery<{members: OrganizationMember[], pendingInvitations: PendingInvitation[]}>({
    queryKey,
    queryFn: async () => {
      if (!organizationId) throw new Error('Organization ID is required')
      const url = `/api/organizations/${organizationId}/members${queryParams ? `?${queryParams}` : ''}`
      const response = await fetcher(url)
      // Return both members and pending invitations
      return {
        members: response.members || [],
        pendingInvitations: response.pendingInvitations || []
      }
    },
    enabled: !!organizationId && !enableInfiniteQuery,
    staleTime: 2 * 60 * 1000, // 2 minutes for member data
    retry: 1, // Reduce retries to prevent double calls
    gcTime: 5 * 60 * 1000, // 5 minutes cache time
    refetchOnWindowFocus: false, // Reduce unnecessary refetches
    refetchOnMount: 'always',
  })

  // Infinite query for large datasets with pagination
  const infiniteQuery = useInfiniteQuery<{
    members: OrganizationMember[]
    nextCursor?: string
    hasMore: boolean
    total: number
  }>({
    queryKey: [...queryKey, 'infinite'],
    queryFn: ({ pageParam }: { pageParam: number }) => {
      if (!organizationId) throw new Error('Organization ID is required')
      const params = new URLSearchParams(queryParams)
      params.append('page', pageParam.toString())
      const url = `/api/organizations/${organizationId}/members?${params.toString()}`
      return fetcher(url)
    },
    enabled: !!organizationId && enableInfiniteQuery,
    getNextPageParam: (lastPage, pages) => {
      return lastPage.hasMore ? pages.length + 1 : undefined
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    initialPageParam: 1 as number,
  })

  // Use appropriate query based on configuration
  const query = enableInfiniteQuery ? infiniteQuery : regularQuery
  const queryData = enableInfiniteQuery 
    ? infiniteQuery.data?.pages[0] // For infinite query, we'll use first page for now
    : regularQuery.data
  
  const members = enableInfiniteQuery 
    ? infiniteQuery.data?.pages.flatMap(page => page.members) || []
    : queryData?.members || []
  
  const pendingInvitations = queryData?.pendingInvitations || []

  // Set up optimistic updates
  const { optimisticCreate, optimisticUpdate, optimisticDelete } = useOptimisticUpdates(
    members || [],
    (updatedMembers) => {
      if (enableOptimisticUpdates) {
        // Update the query data with the new members while preserving pending invitations
        const currentData = queryClient.getQueryData(queryKey) as {members: OrganizationMember[], pendingInvitations: PendingInvitation[]} | undefined
        queryClient.setQueryData(queryKey, {
          members: updatedMembers,
          pendingInvitations: currentData?.pendingInvitations || []
        })
      }
    }
  )

  const addMemberMutation = useMutation({
    mutationFn: async (memberData: {
      email: string
      role?: 'admin' | 'member'
      permissionSetId?: string
      jobTitle?: string
      workingHoursPerWeek?: number
    }) => {
      if (!organizationId) throw new Error('Organization ID is required')

      const response = await fetch(`/api/organizations/${organizationId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberData),
      })

      if (!response.ok) {
        const error = await response.json()
        // Don't throw error since onError will handle it and show toast
        return { error: error.error || 'Failed to add member', success: false }
      }

      return response.json()
    },
    onSuccess: (result) => {
      // Check if result contains an error
      if (result.error) {
        toast.error(result.error)
        return
      }
      
      // Invalidate related queries to refresh data
      invalidationPatterns.teamMembersOnly(organizationId).forEach(pattern => {
        queryClient.invalidateQueries({ queryKey: pattern })
      })
      
      // Invalidate the main query to refetch both members and invitations
      queryClient.invalidateQueries({ queryKey })
      
      // Show appropriate success message
      if (result.status === 'invited') {
        toast.success('Invitation sent successfully')
      } else {
        toast.success('Member added successfully')
      }
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const addMember = useCallback(async (memberData: {
    email: string
    role?: 'admin' | 'member'
    permissionSetId?: string
    jobTitle?: string
    workingHoursPerWeek?: number
  }) => {
    // Don't use optimistic updates for adding members since it can result in either
    // a new member or a new invitation, making optimistic updates complex
    return addMemberMutation.mutateAsync(memberData)
  }, [addMemberMutation])

  const updateMemberMutation = useMutation({
    mutationFn: async ({ memberId, memberData }: {
      memberId: string
      memberData: Partial<{
        role: 'admin' | 'member'
        permissionSetId: string | null
        jobTitle: string | null
        workingHoursPerWeek: number
        joinDate: string | null
      }>
    }) => {
      if (!organizationId) throw new Error('Organization ID is required')

      const response = await fetch(`/api/organizations/${organizationId}/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberData),
      })

      if (!response.ok) {
        const error = await response.json()
        const message = error.error || 'Failed to update member'
        console.error('Failed to update member:', message, error)
        throw new Error(message)
      }

      return response.json()
    },
    onSuccess: (updatedMember, { memberId }) => {
      // Invalidate related queries using optimized patterns
      invalidationPatterns.memberSpecific(organizationId, memberId).forEach(pattern => {
        queryClient.invalidateQueries({ queryKey: pattern })
      })
      
      // Update cache directly
      queryClient.setQueryData(queryKey, (oldData: {members: OrganizationMember[], pendingInvitations: PendingInvitation[]} | undefined) => {
        return {
          members: oldData?.members?.map(member => 
            member.id === memberId ? { ...member, ...updatedMember } : member
          ) || [],
          pendingInvitations: oldData?.pendingInvitations || []
        }
      })
      
      toast.success('Member updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const updateMember = useCallback(async (memberId: string, memberData: Partial<{
    role: 'admin' | 'member'
    permissionSetId: string | null
    jobTitle: string | null
    workingHoursPerWeek: number
    joinDate: string | null
  }>) => {
    if (!enableOptimisticUpdates || !members) {
      return updateMemberMutation.mutateAsync({ memberId, memberData })
    }

    const existingMember = members.find(m => m.id === memberId)
    if (!existingMember) {
      throw new Error('Member not found')
    }

    const updatedMember = { ...existingMember, ...memberData }

    return optimisticUpdate(
      updatedMember,
      () => updateMemberMutation.mutateAsync({ memberId, memberData }),
      {
        successMessage: `${updatedMember.user.fullName || updatedMember.user.email}'s information updated`,
        errorMessage: 'Failed to update member information'
      }
    )
  }, [updateMemberMutation, enableOptimisticUpdates, members, optimisticUpdate])

  const removeMemberMutation = useMutation({
    mutationFn: async ({ memberId, options }: {
      memberId: string
      options?: { boardIds?: string[] }
    }) => {
      if (!organizationId) throw new Error('Organization ID is required')

      const response = await fetch(`/api/organizations/${organizationId}/members/${memberId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options || {}),
      })

      if (!response.ok) {
        const error = await response.json()
        const message = error.error || 'Failed to remove member'
        console.error('Failed to remove member:', message, error)
        throw new Error(message)
      }

      return response.json()
    },
    onSuccess: (_, { memberId }) => {
      // Invalidate related queries using optimized patterns
      invalidationPatterns.memberSpecific(organizationId, memberId).forEach(pattern => {
        queryClient.invalidateQueries({ queryKey: pattern })
      })
      
      // Remove from cache directly
      queryClient.setQueryData(queryKey, (oldData: {members: OrganizationMember[], pendingInvitations: PendingInvitation[]} | undefined) => {
        return {
          members: oldData?.members?.filter(member => member.id !== memberId) || [],
          pendingInvitations: oldData?.pendingInvitations || []
        }
      })
      
      toast.success('Member removed successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const removeMember = useCallback(async (memberId: string, options?: {
    boardIds?: string[]
  }) => {
    if (!enableOptimisticUpdates || !members) {
      return removeMemberMutation.mutateAsync({ memberId, options })
    }

    const memberToRemove = members.find(m => m.id === memberId)
    if (!memberToRemove) {
      throw new Error('Member not found')
    }

    return optimisticDelete(
      memberToRemove,
      () => removeMemberMutation.mutateAsync({ memberId, options }),
      {
        successMessage: `${memberToRemove.user.fullName || memberToRemove.user.email} removed from organization`,
        errorMessage: 'Failed to remove member from organization'
      }
    )
  }, [removeMemberMutation, enableOptimisticUpdates, members, optimisticDelete])

  /**
   * Calculate available hours for a team member
   * 
   * @param member - The organization member to calculate availability for
   * @returns Number of available hours per week
   */
  const calculateAvailability = useCallback((member: OrganizationMember): number => {
    const totalHours = member.workingHoursPerWeek
    const engagedHours = member.engagements
      .filter(e => e.isActive)
      .reduce((sum, e) => sum + e.hoursPerWeek, 0)
    return Math.max(0, totalHours - engagedHours)
  }, [])

  /**
   * Filter members by search term
   * 
   * @param searchTerm - Optional search term to filter by
   * @returns Filtered array of members matching the search term
   */
  const getFilteredMembers = useCallback((searchTerm?: string) => {
    if (!members) return []
    if (!searchTerm?.trim()) return members

    const term = searchTerm.toLowerCase()
    return members.filter(member => 
      member.user.fullName?.toLowerCase().includes(term) ||
      member.user.email.toLowerCase().includes(term) ||
      member.jobTitle?.toLowerCase().includes(term)
    )
  }, [members])

  /**
   * Resend a pending invitation
   */
  const resendInvitation = useMutation({
    mutationKey: ['resendInvitation', organizationId],
    mutationFn: async (invitationId: string) => {
      console.log('🔄 Resend invitation mutation called for:', invitationId)
      
      // Add a small delay to prevent rapid successive calls
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const response = await fetch(`/api/organizations/${organizationId}/invitations/${invitationId}/resend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const error = await response.json()
        const message = error.error || 'Failed to resend invitation'
        console.error('Failed to resend invitation:', message, error)
        throw new Error(message)
      }
      
      return response.json()
    },
    onSuccess: () => {
      console.log('✅ Resend invitation successful')
      toast.success('Invitation resent successfully')
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (error: Error) => {
      console.log('❌ Resend invitation failed:', error.message)
      toast.error(error.message)
    },
    // Prevent duplicate calls
    retry: false,
    gcTime: 0, // Don't cache the mutation
  })

  /**
   * Cancel a pending invitation
   */
  const cancelInvitation = useMutation({
    mutationKey: ['cancelInvitation', organizationId],
    mutationFn: async (invitationId: string) => {
      console.log('🗑️ Cancel invitation mutation called for:', invitationId)
      
      // Add a small delay to prevent rapid successive calls
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const response = await fetch(`/api/organizations/${organizationId}/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const error = await response.json()
        const message = error.error || 'Failed to cancel invitation'
        console.error('Failed to cancel invitation:', message, error)
        throw new Error(message)
      }
      
      return response.json()
    },
    onSuccess: () => {
      console.log('✅ Cancel invitation successful')
      toast.success('Invitation cancelled successfully')
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (error: Error) => {
      console.log('❌ Cancel invitation failed:', error.message)
      toast.error(error.message)
    },
    // Prevent duplicate calls
    retry: false,
    gcTime: 0, // Don't cache the mutation
  })

  return {
    members,
    pendingInvitations,
    isLoading: query.isLoading,
    error: query.error,
    addMember,
    updateMember,
    removeMember,
    calculateAvailability,
    getFilteredMembers,
    refetch: query.refetch,
    isAddingMember: addMemberMutation.isPending,
    isUpdatingMember: updateMemberMutation.isPending,
    isRemovingMember: removeMemberMutation.isPending,
    resendInvitation: (invitationId: string) => {
      if (!resendInvitation.isPending) {
        resendInvitation.mutate(invitationId)
      }
    },
    cancelInvitation: (invitationId: string) => {
      if (!cancelInvitation.isPending) {
        cancelInvitation.mutate(invitationId)
      }
    },
    isResendingInvitation: resendInvitation.isPending,
    isCancellingInvitation: cancelInvitation.isPending,
    // Infinite query specific
    ...(enableInfiniteQuery && {
      fetchNextPage: infiniteQuery.fetchNextPage,
      hasNextPage: infiniteQuery.hasNextPage,
      isFetchingNextPage: infiniteQuery.isFetchingNextPage,
      totalMembers: infiniteQuery.data?.pages[0]?.total,
    }),
  }
}

/**
 * Hook for managing a single team member
 * 
 * Provides access to individual team member data with automatic caching
 * and error handling.
 * 
 * @param organizationId - ID of the organization
 * @param memberId - ID of the specific member to fetch
 * @returns Object containing member data and loading state
 * 
 * @example
 * ```typescript
 * const { member, isLoading, error } = useTeamMember('org-123', 'member-456');
 * ```
 */
export function useTeamMember(organizationId: string, memberId: string) {
  const { data, error, isLoading, refetch } = useQuery<OrganizationMember>({
    queryKey: ['teamMember', organizationId, memberId],
    queryFn: () => {
      if (!organizationId || !memberId) throw new Error('Organization ID and Member ID are required')
      return fetcher(`/api/organizations/${organizationId}/members/${memberId}`)
    },
    enabled: !!(organizationId && memberId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })

  return {
    member: data,
    isLoading,
    error,
    refetch,
  }
}