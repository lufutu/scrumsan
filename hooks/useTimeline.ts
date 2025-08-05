'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface TimelineEvent {
  id: string
  organizationMemberId: string
  eventName: string
  eventDate: string
  description?: string | null
  createdBy: string
  createdAt: string
  creator: {
    id: string
    email: string
    fullName: string | null
    avatarUrl: string | null
  }
}

export interface TimelineEventCreateData {
  eventName: string
  eventDate: string
  description?: string
}

export interface TimelineEventUpdateData {
  eventName?: string
  eventDate?: string
  description?: string
}

export interface TimelineResponse {
  member: {
    id: string
    user: {
      id: string
      email: string
      fullName: string | null
      avatarUrl: string | null
    }
  }
  timelineEvents: TimelineEvent[]
}

export function useTimeline(organizationId: string, memberId: string) {
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch timeline events
  const {
    data: timelineData,
    error,
  } = useQuery<TimelineResponse>({
    queryKey: ['timeline', organizationId, memberId],
    queryFn: async () => {
      const response = await fetch(`/api/organizations/${organizationId}/members/${memberId}/timeline`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch timeline events')
      }
      return response.json()
    },
    enabled: !!(organizationId && memberId),
  })

  const queryClient = useQueryClient()
  const refetch = () => queryClient.invalidateQueries({ queryKey: ['timeline', organizationId, memberId] })

  const isLoading = !timelineData && !error

  // Create timeline event
  const createTimelineEvent = useCallback(async (data: TimelineEventCreateData) => {
    setIsCreating(true)
    try {
      const response = await fetch(`/api/organizations/${organizationId}/members/${memberId}/timeline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create timeline event')
      }

      const result = await response.json()
      refetch()
      return result
    } finally {
      setIsCreating(false)
    }
  }, [organizationId, memberId, refetch])

  // Update timeline event
  const updateTimelineEvent = useCallback(async (eventId: string, data: TimelineEventUpdateData) => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/organizations/${organizationId}/members/${memberId}/timeline/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update timeline event')
      }

      const result = await response.json()
      refetch()
      return result
    } finally {
      setIsUpdating(false)
    }
  }, [organizationId, memberId, refetch])

  // Delete timeline event
  const deleteTimelineEvent = useCallback(async (eventId: string) => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/organizations/${organizationId}/members/${memberId}/timeline/${eventId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete timeline event')
      }

      const result = await response.json()
      refetch()
      return result
    } finally {
      setIsDeleting(false)
    }
  }, [organizationId, memberId, refetch])

  // Helper functions
  const addTimelineEvent = useCallback(async (data: TimelineEventCreateData) => {
    return await createTimelineEvent(data)
  }, [createTimelineEvent])

  const editTimelineEvent = useCallback(async (eventId: string, data: TimelineEventUpdateData) => {
    return await updateTimelineEvent(eventId, data)
  }, [updateTimelineEvent])

  const removeTimelineEvent = useCallback(async (eventId: string) => {
    return await deleteTimelineEvent(eventId)
  }, [deleteTimelineEvent])

  return {
    // Data
    timelineEvents: timelineData?.timelineEvents || [],
    member: timelineData?.member,
    
    // Loading states
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    
    // Error state
    error: error as Error | null,
    
    // Actions
    addTimelineEvent,
    editTimelineEvent,
    removeTimelineEvent,
    refetch,
  }
}