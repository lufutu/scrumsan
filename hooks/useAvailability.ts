'use client'

import { useMemo } from 'react'
import { useEngagements, ProjectEngagement } from './useEngagements'
import { useTimeOff, TimeOffEntry } from './useTimeOff'
import {
  calculateMemberAvailability,
  calculatePeriodAvailability,
  validateEngagementCapacity,
  formatAvailabilitySummary,
  getAvailabilityStatus,
  getUpcomingEngagements,
  getEndingEngagements,
  type MemberAvailabilityData,
  type AvailabilityResult,
  type PeriodAvailability,
  type EngagementData,
  type TimeOffData
} from '../lib/availability-utils'

export interface UseAvailabilityOptions {
  organizationId: string
  memberId: string
  workingHoursPerWeek?: number
}

export interface UseAvailabilityResult {
  // Data
  availability: AvailabilityResult | null
  isLoading: boolean
  error: string | null
  
  // Computed values
  availabilitySummary: string
  availabilityStatus: ReturnType<typeof getAvailabilityStatus> | null
  upcomingEngagements: EngagementData[]
  endingEngagements: EngagementData[]
  
  // Functions
  calculatePeriodAvailability: (startDate: Date, endDate: Date) => PeriodAvailability | null
  validateNewEngagement: (engagement: Omit<EngagementData, 'id'>) => ReturnType<typeof validateEngagementCapacity> | null
  refreshData: () => Promise<void>
}

/**
 * Hook for comprehensive availability calculations including engagements and time-off
 */
export function useAvailability({
  organizationId,
  memberId,
  workingHoursPerWeek = 40
}: UseAvailabilityOptions): UseAvailabilityResult {
  // Fetch engagements and time-off data
  const {
    data: engagements,
    error: engagementsError,
    isLoading: engagementsLoading,
    mutate: mutateEngagements
  } = useEngagements(organizationId, memberId)

  const {
    data: timeOffEntries,
    error: timeOffError,
    isLoading: timeOffLoading,
    mutate: mutateTimeOff
  } = useTimeOff(organizationId, memberId)

  // Transform data for availability calculations
  const availabilityData: MemberAvailabilityData | null = useMemo(() => {
    if (!engagements || !timeOffEntries) return null

    const transformedEngagements: EngagementData[] = engagements.map(eng => ({
      id: eng.id,
      projectId: eng.projectId,
      hoursPerWeek: eng.hoursPerWeek,
      isActive: eng.isActive,
      startDate: new Date(eng.startDate),
      endDate: eng.endDate ? new Date(eng.endDate) : null,
      role: eng.role || undefined
    }))

    const transformedTimeOff: TimeOffData[] = timeOffEntries.map(timeOff => ({
      id: timeOff.id,
      type: timeOff.type,
      startDate: new Date(timeOff.startDate),
      endDate: new Date(timeOff.endDate),
      status: timeOff.status,
      description: timeOff.description
    }))

    return {
      workingHoursPerWeek,
      engagements: transformedEngagements,
      timeOffEntries: transformedTimeOff
    }
  }, [engagements, timeOffEntries, workingHoursPerWeek])

  // Calculate availability
  const availability = useMemo(() => {
    if (!availabilityData) return null
    return calculateMemberAvailability(availabilityData)
  }, [availabilityData])

  // Calculate derived values
  const availabilitySummary = useMemo(() => {
    if (!availability) return 'Loading...'
    return formatAvailabilitySummary(availability)
  }, [availability])

  const availabilityStatus = useMemo(() => {
    if (!availability) return null
    return getAvailabilityStatus(availability)
  }, [availability])

  const upcomingEngagements = useMemo(() => {
    if (!availabilityData) return []
    return getUpcomingEngagements(availabilityData.engagements)
  }, [availabilityData])

  const endingEngagements = useMemo(() => {
    if (!availabilityData) return []
    return getEndingEngagements(availabilityData.engagements)
  }, [availabilityData])

  // Helper functions
  const calculatePeriodAvailabilityFn = useMemo(() => {
    return (startDate: Date, endDate: Date): PeriodAvailability | null => {
      if (!availabilityData) return null
      return calculatePeriodAvailability(availabilityData, startDate, endDate)
    }
  }, [availabilityData])

  const validateNewEngagement = useMemo(() => {
    return (engagement: Omit<EngagementData, 'id'>) => {
      if (!availabilityData) return null
      return validateEngagementCapacity(availabilityData, engagement)
    }
  }, [availabilityData])

  const refreshData = async () => {
    await Promise.all([
      mutateEngagements(),
      mutateTimeOff()
    ])
  }

  // Determine loading and error states
  const isLoading = engagementsLoading || timeOffLoading
  const error = engagementsError || timeOffError || null

  return {
    // Data
    availability,
    isLoading,
    error,
    
    // Computed values
    availabilitySummary,
    availabilityStatus,
    upcomingEngagements,
    endingEngagements,
    
    // Functions
    calculatePeriodAvailability: calculatePeriodAvailabilityFn,
    validateNewEngagement,
    refreshData
  }
}

/**
 * Hook for calculating availability for multiple members
 */
export function useTeamAvailability(
  organizationId: string,
  memberIds: string[],
  workingHoursPerWeek: number = 40
) {
  // This would be implemented to fetch and calculate availability for multiple members
  // For now, returning a placeholder structure
  return {
    teamAvailability: [],
    isLoading: false,
    error: null,
    totalCapacity: 0,
    totalEngaged: 0,
    totalAvailable: 0,
    averageUtilization: 0
  }
}

// Export types for external use
export type {
  MemberAvailabilityData,
  AvailabilityResult,
  PeriodAvailability,
  EngagementData,
  TimeOffData
} from '../lib/availability-utils'