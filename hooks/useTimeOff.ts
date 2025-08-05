'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
})

export interface TimeOffEntry {
  id: string
  organizationMemberId: string
  type: 'vacation' | 'parental_leave' | 'sick_leave' | 'paid_time_off' | 'unpaid_time_off' | 'other'
  startDate: string
  endDate: string
  description?: string | null
  approvedBy?: string | null
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  approver?: {
    id: string
    fullName: string | null
    email: string
  } | null
}

export interface TimeOffCreateData {
  type: 'vacation' | 'parental_leave' | 'sick_leave' | 'paid_time_off' | 'unpaid_time_off' | 'other'
  startDate: string
  endDate: string
  description?: string | null
}

export interface TimeOffUpdateData {
  type?: 'vacation' | 'parental_leave' | 'sick_leave' | 'paid_time_off' | 'unpaid_time_off' | 'other'
  startDate?: string
  endDate?: string
  description?: string | null
  status?: 'pending' | 'approved' | 'rejected'
}

export const TIME_OFF_TYPES = {
  vacation: 'Vacation',
  parental_leave: 'Parental Leave',
  sick_leave: 'Sick Leave',
  paid_time_off: 'Paid Time Off',
  unpaid_time_off: 'Unpaid Time Off',
  other: 'Other'
} as const

export const TIME_OFF_STATUSES = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected'
} as const

export function useTimeOff(organizationId: string, memberId: string) {
  const queryClient = useQueryClient()
  
  const { data, error, isLoading } = useQuery<TimeOffEntry[]>({
    queryKey: ['timeOff', organizationId, memberId],
    queryFn: () => fetcher(`/api/organizations/${organizationId}/members/${memberId}/time-off`),
    enabled: !!(organizationId && memberId),
  })
  
  const mutate = () => queryClient.invalidateQueries({ queryKey: ['timeOff', organizationId, memberId] })

  const createTimeOff = useCallback(async (timeOffData: TimeOffCreateData) => {
    if (!organizationId || !memberId) throw new Error('Organization ID and Member ID are required')

    try {
      const response = await fetch(`/api/organizations/${organizationId}/members/${memberId}/time-off`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(timeOffData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create time-off entry')
      }

      await mutate()
      toast.success('Time-off entry created successfully')
      return await response.json()
    } catch (error: any) {
      console.error('Failed to create time-off entry:', error)
      toast.error(error.message || 'Failed to create time-off entry')
      throw error
    }
  }, [organizationId, memberId, mutate])

  const updateTimeOff = useCallback(async (entryId: string, timeOffData: TimeOffUpdateData) => {
    if (!organizationId || !memberId) throw new Error('Organization ID and Member ID are required')

    try {
      const response = await fetch(`/api/organizations/${organizationId}/members/${memberId}/time-off/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(timeOffData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update time-off entry')
      }

      await mutate()
      toast.success('Time-off entry updated successfully')
      return await response.json()
    } catch (error: any) {
      console.error('Failed to update time-off entry:', error)
      toast.error(error.message || 'Failed to update time-off entry')
      throw error
    }
  }, [organizationId, memberId, mutate])

  const deleteTimeOff = useCallback(async (entryId: string) => {
    if (!organizationId || !memberId) throw new Error('Organization ID and Member ID are required')

    try {
      const response = await fetch(`/api/organizations/${organizationId}/members/${memberId}/time-off/${entryId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete time-off entry')
      }

      await mutate()
      toast.success('Time-off entry deleted successfully')
    } catch (error: any) {
      console.error('Failed to delete time-off entry:', error)
      toast.error(error.message || 'Failed to delete time-off entry')
      throw error
    }
  }, [organizationId, memberId, mutate])

  const approveTimeOff = useCallback(async (entryId: string) => {
    return updateTimeOff(entryId, { status: 'approved' })
  }, [updateTimeOff])

  const rejectTimeOff = useCallback(async (entryId: string) => {
    return updateTimeOff(entryId, { status: 'rejected' })
  }, [updateTimeOff])

  const getTimeOffByStatus = useCallback((
    status: 'pending' | 'approved' | 'rejected',
    entries?: TimeOffEntry[]
  ): TimeOffEntry[] => {
    const entriesToUse = entries || data || []
    return entriesToUse.filter(entry => entry.status === status)
  }, [data])

  const getTimeOffByType = useCallback((
    type: TimeOffEntry['type'],
    entries?: TimeOffEntry[]
  ): TimeOffEntry[] => {
    const entriesToUse = entries || data || []
    return entriesToUse.filter(entry => entry.type === type)
  }, [data])

  const getTimeOffInDateRange = useCallback((
    startDate: string,
    endDate: string,
    entries?: TimeOffEntry[]
  ): TimeOffEntry[] => {
    const entriesToUse = entries || data || []
    const rangeStart = new Date(startDate)
    const rangeEnd = new Date(endDate)

    return entriesToUse.filter(entry => {
      const entryStart = new Date(entry.startDate)
      const entryEnd = new Date(entry.endDate)
      
      // Check if there's any overlap
      return entryStart <= rangeEnd && entryEnd >= rangeStart
    })
  }, [data])

  const calculateTotalDays = useCallback((
    entries?: TimeOffEntry[],
    type?: TimeOffEntry['type'],
    status?: 'pending' | 'approved' | 'rejected'
  ): number => {
    let entriesToUse = entries || data || []
    
    if (type) {
      entriesToUse = entriesToUse.filter(entry => entry.type === type)
    }
    
    if (status) {
      entriesToUse = entriesToUse.filter(entry => entry.status === status)
    }

    return entriesToUse.reduce((total, entry) => {
      const startDate = new Date(entry.startDate)
      const endDate = new Date(entry.endDate)
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 to include both start and end dates
      return total + diffDays
    }, 0)
  }, [data])

  const calculateVacationDaysUsed = useCallback((
    year?: number,
    entries?: TimeOffEntry[]
  ): number => {
    let entriesToUse = entries || data || []
    
    // Filter for vacation entries that are approved
    entriesToUse = entriesToUse.filter(entry => 
      entry.type === 'vacation' && entry.status === 'approved'
    )

    // If year is specified, filter by year
    if (year) {
      entriesToUse = entriesToUse.filter(entry => {
        const entryYear = new Date(entry.startDate).getFullYear()
        return entryYear === year
      })
    }

    return calculateTotalDays(entriesToUse)
  }, [data, calculateTotalDays])

  const validateTimeOff = useCallback((
    timeOffData: TimeOffCreateData | TimeOffUpdateData,
    existingEntries?: TimeOffEntry[],
    excludeEntryId?: string
  ): string[] => {
    const errors: string[] = []
    const entriesToCheck = existingEntries || data || []

    // Validate dates
    if ('startDate' in timeOffData && 'endDate' in timeOffData && 
        timeOffData.startDate && timeOffData.endDate) {
      const startDate = new Date(timeOffData.startDate)
      const endDate = new Date(timeOffData.endDate)
      
      if (endDate < startDate) {
        errors.push('End date must be after or equal to start date')
      }

      // Check for overlapping entries
      const overlapping = entriesToCheck.filter(entry => {
        if (entry.id === excludeEntryId) return false
        if (entry.status === 'rejected') return false
        
        const entryStart = new Date(entry.startDate)
        const entryEnd = new Date(entry.endDate)
        
        return startDate <= entryEnd && endDate >= entryStart
      })

      if (overlapping.length > 0) {
        errors.push('Time-off period overlaps with existing entries')
      }
    }

    // Validate start date is not in the past (for new entries)
    if ('startDate' in timeOffData && timeOffData.startDate && !excludeEntryId) {
      const startDate = new Date(timeOffData.startDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Reset time to start of day
      
      if (startDate < today) {
        errors.push('Start date cannot be in the past')
      }
    }

    return errors
  }, [data])

  const isOnTimeOff = useCallback((
    date: string | Date,
    entries?: TimeOffEntry[]
  ): boolean => {
    const entriesToUse = entries || data || []
    const checkDate = new Date(date)
    
    return entriesToUse.some(entry => {
      if (entry.status !== 'approved') return false
      
      const startDate = new Date(entry.startDate)
      const endDate = new Date(entry.endDate)
      
      return checkDate >= startDate && checkDate <= endDate
    })
  }, [data])

  return {
    timeOffEntries: data,
    isLoading,
    error,
    createTimeOff,
    updateTimeOff,
    deleteTimeOff,
    approveTimeOff,
    rejectTimeOff,
    getTimeOffByStatus,
    getTimeOffByType,
    getTimeOffInDateRange,
    calculateTotalDays,
    calculateVacationDaysUsed,
    validateTimeOff,
    isOnTimeOff,
    mutate,
  }
}