/**
 * Utility functions for project engagement management and availability calculations
 * This file focuses on engagement-specific utilities and integrates with availability-utils.ts
 * for comprehensive availability calculations including time-off integration.
 */

// Re-export types from availability-utils for backward compatibility
export type { 
  EngagementData,
  MemberAvailabilityData,
  AvailabilityResult,
  PeriodAvailability,
  EngagementValidationResult,
  TimeOffData
} from './availability-utils'

// Re-export comprehensive functions from availability-utils
export {
  calculateMemberAvailability as calculateComprehensiveAvailability,
  calculatePeriodAvailability,
  validateEngagementCapacity as validateComprehensiveEngagementCapacity,
  validateTimeOffEntry,
  formatHours,
  formatHoursPerWeek,
  formatUtilization,
  formatAvailabilitySummary,
  getUtilizationColor,
  getAvailabilityStatus,
  calculateVacationDaysUsed,
  getUpcomingEngagements,
  getEndingEngagements
} from './availability-utils'

// Legacy interface for backward compatibility
export interface MemberAvailability {
  totalHours: number
  engagedHours: number
  availableHours: number
  activeEngagementsCount: number
  utilizationPercentage: number
}

/**
 * Calculate basic member availability based on working hours and engagements only
 * For comprehensive availability including time-off, use calculateMemberAvailability from availability-utils.ts
 * @deprecated Use calculateMemberAvailability from availability-utils.ts for full functionality
 */
export function calculateMemberAvailability(
  workingHoursPerWeek: number | null,
  engagements: Array<{ hoursPerWeek: number; isActive: boolean; startDate: Date; endDate?: Date | null }>
): MemberAvailability {
  const totalHours = workingHoursPerWeek || 40
  const now = new Date()
  
  // Filter for currently active engagements
  const activeEngagements = engagements.filter(e => {
    if (!e.isActive) return false
    if (e.startDate > now) return false
    if (e.endDate && e.endDate < now) return false
    return true
  })
  
  const engagedHours = activeEngagements.reduce(
    (sum, engagement) => sum + engagement.hoursPerWeek,
    0
  )
  const availableHours = Math.max(0, totalHours - engagedHours)
  const utilizationPercentage = totalHours > 0 ? (engagedHours / totalHours) * 100 : 0

  return {
    totalHours,
    engagedHours,
    availableHours,
    activeEngagementsCount: activeEngagements.length,
    utilizationPercentage: Math.round(utilizationPercentage * 100) / 100, // Round to 2 decimal places
  }
}

/**
 * Validate if new engagement hours would exceed member capacity (basic validation)
 * For comprehensive validation including conflicts and time-off, use validateEngagementCapacity from availability-utils.ts
 * @deprecated Use validateEngagementCapacity from availability-utils.ts for full functionality
 */
export function validateEngagementCapacity(
  workingHoursPerWeek: number | null,
  currentEngagements: Array<{ hoursPerWeek: number; isActive: boolean; startDate: Date; endDate?: Date | null }>,
  newHours: number,
  excludeEngagementIndex?: number
): { valid: boolean; error?: string; available: number } {
  const totalHours = workingHoursPerWeek || 40
  const now = new Date()
  
  const activeEngagements = currentEngagements.filter((e, index) => {
    if (index === excludeEngagementIndex) return false
    if (!e.isActive) return false
    if (e.startDate > now) return false
    if (e.endDate && e.endDate < now) return false
    return true
  })
  
  const currentEngagedHours = activeEngagements.reduce(
    (sum, engagement) => sum + engagement.hoursPerWeek,
    0
  )
  const available = totalHours - currentEngagedHours
  
  if (newHours > available) {
    return {
      valid: false,
      error: `Engagement hours (${newHours}) would exceed available capacity. Available: ${available} hours, Total capacity: ${totalHours} hours`,
      available,
    }
  }

  return { valid: true, available }
}

/**
 * Check if two date ranges overlap
 */
export function dateRangesOverlap(
  start1: Date,
  end1: Date | null,
  start2: Date,
  end2: Date | null
): boolean {
  // If either engagement has no end date, treat it as ongoing (far future)
  const effectiveEnd1 = end1 || new Date('2099-12-31')
  const effectiveEnd2 = end2 || new Date('2099-12-31')

  // Check if ranges overlap: start1 <= end2 && start2 <= end1
  return start1 <= effectiveEnd2 && start2 <= effectiveEnd1
}

/**
 * Validate engagement date range
 */
export function validateEngagementDates(
  startDate: Date,
  endDate: Date | null
): { valid: boolean; error?: string } {
  if (endDate && endDate <= startDate) {
    return {
      valid: false,
      error: 'End date must be after start date',
    }
  }

  // Check if start date is too far in the past (more than 10 years)
  const tenYearsAgo = new Date()
  tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10)
  
  if (startDate < tenYearsAgo) {
    return {
      valid: false,
      error: 'Start date cannot be more than 10 years in the past',
    }
  }

  // Check if end date is too far in the future (more than 10 years)
  if (endDate) {
    const tenYearsFromNow = new Date()
    tenYearsFromNow.setFullYear(tenYearsFromNow.getFullYear() + 10)
    
    if (endDate > tenYearsFromNow) {
      return {
        valid: false,
        error: 'End date cannot be more than 10 years in the future',
      }
    }
  }

  return { valid: true }
}

/**
 * Check for overlapping engagements on the same project
 */
export function hasOverlappingEngagement(
  existingEngagements: Array<EngagementData & { projectId: string; id?: string }>,
  newProjectId: string,
  newStartDate: Date,
  newEndDate: Date | null,
  excludeEngagementId?: string
): boolean {
  return existingEngagements.some(engagement => {
    // Skip if it's the same engagement being updated
    if (excludeEngagementId && engagement.id === excludeEngagementId) {
      return false
    }

    // Only check active engagements on the same project
    if (!engagement.isActive || engagement.projectId !== newProjectId) {
      return false
    }

    return dateRangesOverlap(
      engagement.startDate,
      engagement.endDate,
      newStartDate,
      newEndDate
    )
  })
}





/**
 * Get engagement status based on dates
 */
export function getEngagementStatus(
  startDate: Date,
  endDate: Date | null,
  isActive: boolean
): 'upcoming' | 'active' | 'completed' | 'inactive' {
  if (!isActive) {
    return 'inactive'
  }

  const now = new Date()
  
  if (startDate > now) {
    return 'upcoming'
  }
  
  if (endDate && endDate < now) {
    return 'completed'
  }
  
  return 'active'
}

/**
 * Calculate engagement duration in days
 */
export function calculateEngagementDuration(
  startDate: Date,
  endDate: Date | null
): number | null {
  if (!endDate) {
    return null // Ongoing engagement
  }
  
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays
}

/**
 * Get color for engagement status
 */
export function getEngagementStatusColor(status: ReturnType<typeof getEngagementStatus>): string {
  switch (status) {
    case 'active':
      return '#10B981' // green
    case 'upcoming':
      return '#3B82F6' // blue
    case 'completed':
      return '#6B7280' // gray
    case 'inactive':
      return '#EF4444' // red
    default:
      return '#6B7280' // gray
  }
}