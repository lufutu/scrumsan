'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { cacheKeys } from '@/lib/query-optimization'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch')
  }
  return response.json()
}

export interface ProjectEngagement {
  id: string
  organizationMemberId: string
  projectId: string
  role?: string | null
  hoursPerWeek: number
  startDate: string
  endDate?: string | null
  isActive: boolean
  createdAt: string
  project: {
    id: string
    name: string
    description?: string | null
  }
}

export interface EngagementCreateData {
  projectId: string
  role?: string | null
  hoursPerWeek: number
  startDate: string
  endDate?: string | null
}

export interface EngagementUpdateData {
  role?: string | null
  hoursPerWeek?: number
  startDate?: string
  endDate?: string | null
  isActive?: boolean
}

export function useEngagements(organizationId: string, memberId: string) {
  const queryClient = useQueryClient()
  
  const { data, error, isLoading, refetch } = useQuery<ProjectEngagement[]>({
    queryKey: cacheKeys.memberEngagements(organizationId, memberId),
    queryFn: () => fetcher(`/api/organizations/${organizationId}/members/${memberId}/engagements`),
    enabled: !!organizationId && !!memberId,
  })

  const createEngagementMutation = useMutation({
    mutationFn: async (engagementData: EngagementCreateData) => {
      if (!organizationId || !memberId) throw new Error('Organization ID and Member ID are required')

      const response = await fetch(`/api/organizations/${organizationId}/members/${memberId}/engagements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(engagementData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create engagement')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cacheKeys.memberEngagements(organizationId, memberId) })
      queryClient.invalidateQueries({ queryKey: cacheKeys.organizationMembers(organizationId) })
      toast.success('Engagement created successfully')
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  const updateEngagementMutation = useMutation({
    mutationFn: async ({ engagementId, data }: { engagementId: string; data: EngagementUpdateData }) => {
      if (!organizationId || !memberId) throw new Error('Organization ID and Member ID are required')

      const response = await fetch(`/api/organizations/${organizationId}/members/${memberId}/engagements/${engagementId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update engagement')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cacheKeys.memberEngagements(organizationId, memberId) })
      queryClient.invalidateQueries({ queryKey: cacheKeys.organizationMembers(organizationId) })
      toast.success('Engagement updated successfully')
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  const deleteEngagementMutation = useMutation({
    mutationFn: async (engagementId: string) => {
      if (!organizationId || !memberId) throw new Error('Organization ID and Member ID are required')

      const response = await fetch(`/api/organizations/${organizationId}/members/${memberId}/engagements/${engagementId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete engagement')
      }

      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cacheKeys.memberEngagements(organizationId, memberId) })
      queryClient.invalidateQueries({ queryKey: cacheKeys.organizationMembers(organizationId) })
      toast.success('Engagement deleted successfully')
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  const calculateTotalHours = useCallback((engagements?: ProjectEngagement[]): number => {
    const engagementsToUse = Array.isArray(engagements) ? engagements : Array.isArray(data) ? data : []
    return engagementsToUse
      .filter(e => e.isActive)
      .reduce((sum, e) => sum + e.hoursPerWeek, 0)
  }, [data])

  const calculateAvailability = useCallback((
    workingHoursPerWeek: number, 
    engagements?: ProjectEngagement[]
  ): number => {
    const totalEngagedHours = calculateTotalHours(engagements)
    return Math.max(0, workingHoursPerWeek - totalEngagedHours)
  }, [calculateTotalHours])

  const getActiveEngagements = useCallback((engagements?: ProjectEngagement[]): ProjectEngagement[] => {
    const engagementsToUse = Array.isArray(engagements) ? engagements : Array.isArray(data) ? data : []
    return engagementsToUse.filter(e => e.isActive)
  }, [data])

  const getPastEngagements = useCallback((engagements?: ProjectEngagement[]): ProjectEngagement[] => {
    const engagementsToUse = Array.isArray(engagements) ? engagements : Array.isArray(data) ? data : []
    return engagementsToUse.filter(e => !e.isActive)
  }, [data])

  const getEngagementsByProject = useCallback((
    projectId: string, 
    engagements?: ProjectEngagement[]
  ): ProjectEngagement[] => {
    const engagementsToUse = Array.isArray(engagements) ? engagements : Array.isArray(data) ? data : []
    return engagementsToUse.filter(e => e.projectId === projectId)
  }, [data])

  const validateEngagement = useCallback((
    engagementData: EngagementCreateData | EngagementUpdateData,
    workingHoursPerWeek: number,
    existingEngagements?: ProjectEngagement[],
    excludeEngagementId?: string
  ): string[] => {
    const errors: string[] = []
    const engagementsToCheck = Array.isArray(existingEngagements) ? existingEngagements : Array.isArray(data) ? data : []

    // Validate hours per week
    if ('hoursPerWeek' in engagementData && engagementData.hoursPerWeek !== undefined) {
      if (engagementData.hoursPerWeek <= 0) {
        errors.push('Hours per week must be greater than 0')
      }

      if (engagementData.hoursPerWeek > workingHoursPerWeek) {
        errors.push('Hours per week cannot exceed total working hours')
      }

      // Check total hours don't exceed working hours
      const otherEngagements = engagementsToCheck.filter(e => 
        e.isActive && e.id !== excludeEngagementId
      )
      const otherHours = otherEngagements.reduce((sum, e) => sum + e.hoursPerWeek, 0)
      
      if (otherHours + engagementData.hoursPerWeek > workingHoursPerWeek) {
        errors.push('Total engagement hours would exceed working hours per week')
      }
    }

    // Validate dates
    if ('startDate' in engagementData && 'endDate' in engagementData && 
        engagementData.startDate && engagementData.endDate) {
      const startDate = new Date(engagementData.startDate)
      const endDate = new Date(engagementData.endDate)
      
      if (endDate <= startDate) {
        errors.push('End date must be after start date')
      }
    }

    return errors
  }, [data])

  const isOverallocated = useCallback((
    workingHoursPerWeek: number,
    engagements?: ProjectEngagement[]
  ): boolean => {
    const totalHours = calculateTotalHours(engagements)
    return totalHours > workingHoursPerWeek
  }, [calculateTotalHours])

  return {
    engagements: data,
    isLoading,
    error,
    createEngagement: createEngagementMutation.mutate,
    updateEngagement: (engagementId: string, data: EngagementUpdateData) => 
      updateEngagementMutation.mutate({ engagementId, data }),
    deleteEngagement: deleteEngagementMutation.mutate,
    calculateTotalHours,
    calculateAvailability,
    getActiveEngagements,
    getPastEngagements,
    getEngagementsByProject,
    validateEngagement,
    isOverallocated,
    mutate: refetch,
  }
}