'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
})

interface MemberBoard {
  id: string
  name: string
  description?: string
  boardType?: string
  color?: string
  taskCount: number
  sprintCount: number
  projectAccess: Array<{
    projectId: string
    projectName: string
    memberRole?: string
    joinedAt: Date
  }>
}

interface MemberBoardsResponse {
  boards: MemberBoard[]
  targetMember: {
    id: string
    user: {
      id: string
      email: string
      fullName?: string
    }
    role: string
  }
  canRemoveFrom: number
}

interface RemovalOptions {
  boardsToRemoveFrom?: string[]
  transferOwnership?: {
    newOwnerId: string
  }
  isVoluntaryLeave?: boolean
}

interface RemovalResult {
  message: string
  removedMember: {
    id: string
    user: {
      id: string
      email: string
      fullName?: string
    }
    role: string
  }
  cleanupSummary: {
    engagements: number
    timeOffEntries: number
    timelineEvents: number
    profileData: number
  }
  boardsRemovedFrom: string[]
  ownershipTransferred?: {
    newOwnerId: string
  }
}

export function useMemberRemoval(organizationId: string, memberId: string) {
  const [isRemovalDialogOpen, setIsRemovalDialogOpen] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [removalError, setRemovalError] = useState<Error | null>(null)
  const [leaveError, setLeaveError] = useState<Error | null>(null)

  const queryClient = useQueryClient()

  // Fetch boards that the member can be removed from
  const {
    data: memberBoards,
    isLoading: boardsLoading,
    error: boardsError,
  } = useQuery<MemberBoardsResponse>({
    queryKey: ['memberBoards', organizationId, memberId],
    queryFn: () => fetcher(`/api/organizations/${organizationId}/members/${memberId}/boards`),
    enabled: !!(organizationId && memberId),
  })

  // Remove member function
  const removeMemberAction = useCallback(async (options: RemovalOptions) => {
    setIsRemoving(true)
    setRemovalError(null)

    try {
      const response = await fetch(`/api/organizations/${organizationId}/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove member')
      }

      const data: RemovalResult = await response.json()

      // Invalidate relevant React Query caches
      queryClient.invalidateQueries({ queryKey: ['organizationMembers', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['memberBoards', organizationId, memberId] })
      
      // Show success message
      toast.success(data.message)

      // Close dialog
      setIsRemovalDialogOpen(false)

      return data
    } catch (error) {
      const err = error as Error
      setRemovalError(err)
      toast.error(err.message)
      throw err
    } finally {
      setIsRemoving(false)
    }
  }, [organizationId, memberId])

  // Voluntary leave function (for current user)
  const leaveOrganizationAction = useCallback(async (transferOwnership?: { newOwnerId: string }) => {
    setIsLeaving(true)
    setLeaveError(null)

    try {
      const response = await fetch(`/api/organizations/${organizationId}/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transferOwnership,
          isVoluntaryLeave: true,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to leave organization')
      }

      const data: RemovalResult = await response.json()

      // Invalidate relevant React Query caches
      queryClient.invalidateQueries({ queryKey: ['organizationMembers', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      
      // Show success message
      toast.success(data.message)

      // Redirect to organizations page or home
      window.location.href = '/organizations'

      return data
    } catch (error) {
      const err = error as Error
      setLeaveError(err)
      toast.error(err.message)
      throw err
    } finally {
      setIsLeaving(false)
    }
  }, [organizationId, memberId])

  const removeMember = useCallback((options: RemovalOptions) => {
    return removeMemberAction(options)
  }, [removeMemberAction])

  const leaveOrganization = useCallback((transferOwnership?: { newOwnerId: string }) => {
    return leaveOrganizationAction(transferOwnership)
  }, [leaveOrganizationAction])

  const openRemovalDialog = useCallback(() => {
    setIsRemovalDialogOpen(true)
  }, [])

  const closeRemovalDialog = useCallback(() => {
    setIsRemovalDialogOpen(false)
  }, [])

  return {
    // Data
    memberBoards,
    
    // Loading states
    boardsLoading,
    isRemoving,
    isLeaving,
    
    // Error states
    boardsError,
    removalError,
    leaveError,
    
    // Actions
    removeMember,
    leaveOrganization,
    
    // Dialog state
    isRemovalDialogOpen,
    openRemovalDialog,
    closeRemovalDialog,
  }
}