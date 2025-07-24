/**
 * @fileoverview Comprehensive availability calculation utilities for team management
 * 
 * This module provides utilities for calculating member availability, validating engagements,
 * managing time-off entries, and formatting availability data for display. It integrates
 * engagement hours, time-off entries, and working hours to provide accurate availability
 * calculations and validation.
 * 
 * Key features:
 * - Member availability calculations with time-off integration
 * - Period-based availability calculations
 * - Engagement capacity validation with conflict detection
 * - Time-off validation and overlap checking
 * - Formatting utilities for display
 * - Utilization tracking and color coding
 * 
 * @author Team Management System
 * @version 1.0.0
 */

import { addDays, differenceInDays, isAfter, isBefore, isWithinInterval, parseISO } from 'date-fns'

/**
 * Represents engagement data for availability calculations
 * @interface EngagementData
 */
export interface EngagementData {
  /** Unique identifier for the engagement (optional for new engagements) */
  id?: string
  /** ID of the project this engagement is associated with */
  projectId: string
  /** Number of hours per week allocated to this engagement */
  hoursPerWeek: number
  /** Whether this engagement is currently active */
  isActive: boolean
  /** Start date of the engagement */
  startDate: Date
  /** End date of the engagement (null for ongoing engagements) */
  endDate?: Date | null
  /** Role or position in this engagement (optional) */
  role?: string
}

/**
 * Represents time-off data for availability calculations
 * @interface TimeOffData
 */
export interface TimeOffData {
  /** Unique identifier for the time-off entry (optional for new entries) */
  id?: string
  /** Type of time-off being taken */
  type: 'vacation' | 'parental_leave' | 'sick_leave' | 'paid_time_off' | 'unpaid_time_off' | 'other'
  /** Start date of the time-off period */
  startDate: Date
  /** End date of the time-off period */
  endDate: Date
  /** Approval status of the time-off request */
  status: 'pending' | 'approved' | 'rejected'
  /** Optional description or notes about the time-off */
  description?: string
}

/**
 * Complete member data required for availability calculations
 * @interface MemberAvailabilityData
 */
export interface MemberAvailabilityData {
  /** Total working hours per week for this member */
  workingHoursPerWeek: number
  /** Array of all engagements for this member */
  engagements: EngagementData[]
  /** Array of all time-off entries for this member */
  timeOffEntries: TimeOffData[]
  /** Date when the member joined the organization (optional) */
  joinDate?: Date | null
}

/**
 * Comprehensive availability calculation result
 * @interface AvailabilityResult
 */
export interface AvailabilityResult {
  /** Total working hours per week */
  totalHours: number
  /** Hours currently engaged in active projects */
  engagedHours: number
  /** Available hours for new engagements */
  availableHours: number
  /** Number of currently active engagements */
  activeEngagementsCount: number
  /** Percentage of total hours currently utilized */
  utilizationPercentage: number
  /** Number of time-off days taken this month */
  timeOffDaysThisMonth: number
  /** Number of time-off days taken this year */
  timeOffDaysThisYear: number
  /** Whether the member is currently on time-off */
  isCurrentlyOnTimeOff: boolean
  /** Array of upcoming time-off entries (next 30 days) */
  upcomingTimeOff: TimeOffData[]
}

/**
 * Availability calculation result for a specific time period
 * @interface PeriodAvailability
 */
export interface PeriodAvailability {
  /** Start date of the period */
  startDate: Date
  /** End date of the period */
  endDate: Date
  /** Total working hours in the period */
  totalHours: number
  /** Hours engaged in projects during the period */
  engagedHours: number
  /** Available hours for new work (not accounting for time-off) */
  availableHours: number
  /** Number of time-off days in the period */
  timeOffDays: number
  /** Number of working days in the period (excluding weekends) */
  workingDays: number
  /** Effective available hours after accounting for time-off */
  effectiveAvailableHours: number
}

/**
 * Result of engagement capacity validation
 * @interface EngagementValidationResult
 */
export interface EngagementValidationResult {
  /** Whether the engagement is valid and can be created/updated */
  valid: boolean
  /** Array of validation error messages */
  errors: string[]
  /** Array of warning messages (non-blocking) */
  warnings: string[]
  /** Number of hours available for new engagements */
  availableHours: number
  /** Array of engagements that conflict with the new one */
  conflictingEngagements: EngagementData[]
}

/**
 * Calculate comprehensive member availability including time-off integration
 * 
 * This function provides a complete availability analysis for a team member,
 * including current engagement hours, time-off statistics, and utilization metrics.
 * 
 * @param data - Complete member data including working hours, engagements, and time-off
 * @returns Comprehensive availability result with all metrics
 * 
 * @example
 * ```typescript
 * const availability = calculateMemberAvailability({
 *   workingHoursPerWeek: 40,
 *   engagements: [
 *     { projectId: '1', hoursPerWeek: 20, isActive: true, startDate: new Date() }
 *   ],
 *   timeOffEntries: []
 * });
 * console.log(availability.availableHours); // 20
 * ```
 */
export function calculateMemberAvailability(data: MemberAvailabilityData): AvailabilityResult {
  const { workingHoursPerWeek, engagements, timeOffEntries } = data
  const now = new Date()
  
  // Calculate basic engagement availability
  const activeEngagements = engagements.filter(e => e.isActive && isEngagementActive(e, now))
  const engagedHours = activeEngagements.reduce((sum, e) => sum + e.hoursPerWeek, 0)
  const availableHours = Math.max(0, workingHoursPerWeek - engagedHours)
  const utilizationPercentage = workingHoursPerWeek > 0 ? (engagedHours / workingHoursPerWeek) * 100 : 0
  
  // Calculate time-off statistics
  const approvedTimeOff = timeOffEntries.filter(t => t.status === 'approved')
  const timeOffDaysThisMonth = calculateTimeOffDaysInPeriod(
    approvedTimeOff,
    getMonthStart(now),
    getMonthEnd(now)
  )
  const timeOffDaysThisYear = calculateTimeOffDaysInPeriod(
    approvedTimeOff,
    getYearStart(now),
    getYearEnd(now)
  )
  
  // Check if currently on time-off
  const isCurrentlyOnTimeOff = approvedTimeOff.some(timeOff =>
    isWithinInterval(now, { start: timeOff.startDate, end: timeOff.endDate })
  )
  
  // Get upcoming time-off (next 30 days)
  const thirtyDaysFromNow = addDays(now, 30)
  const upcomingTimeOff = approvedTimeOff.filter(timeOff =>
    isAfter(timeOff.startDate, now) && isBefore(timeOff.startDate, thirtyDaysFromNow)
  )
  
  return {
    totalHours: workingHoursPerWeek,
    engagedHours,
    availableHours,
    activeEngagementsCount: activeEngagements.length,
    utilizationPercentage: Math.round(utilizationPercentage * 100) / 100,
    timeOffDaysThisMonth,
    timeOffDaysThisYear,
    isCurrentlyOnTimeOff,
    upcomingTimeOff
  }
}

/**
 * Calculate availability for a specific time period
 * 
 * This function calculates availability metrics for a specific date range,
 * accounting for engagement overlaps and time-off periods within that range.
 * 
 * @param data - Complete member data including working hours, engagements, and time-off
 * @param startDate - Start date of the period to analyze
 * @param endDate - End date of the period to analyze
 * @returns Period-specific availability metrics
 * 
 * @example
 * ```typescript
 * const periodAvailability = calculatePeriodAvailability(
 *   memberData,
 *   new Date('2024-01-01'),
 *   new Date('2024-01-31')
 * );
 * console.log(periodAvailability.effectiveAvailableHours);
 * ```
 */
export function calculatePeriodAvailability(
  data: MemberAvailabilityData,
  startDate: Date,
  endDate: Date
): PeriodAvailability {
  const { workingHoursPerWeek, engagements, timeOffEntries } = data
  
  // Calculate working days in period (excluding weekends)
  const workingDays = calculateWorkingDays(startDate, endDate)
  const totalHours = (workingHoursPerWeek / 5) * workingDays // Assuming 5-day work week
  
  // Calculate engaged hours for the period
  const relevantEngagements = engagements.filter(e => 
    e.isActive && engagementOverlapsPeriod(e, startDate, endDate)
  )
  const engagedHours = relevantEngagements.reduce((sum, e) => {
    const overlapDays = calculateEngagementOverlapDays(e, startDate, endDate)
    return sum + ((e.hoursPerWeek / 5) * overlapDays)
  }, 0)
  
  // Calculate time-off days in period
  const approvedTimeOff = timeOffEntries.filter(t => t.status === 'approved')
  const timeOffDays = calculateTimeOffDaysInPeriod(approvedTimeOff, startDate, endDate)
  
  // Calculate effective available hours (accounting for time-off)
  const timeOffHours = (workingHoursPerWeek / 5) * timeOffDays
  const effectiveAvailableHours = Math.max(0, totalHours - engagedHours - timeOffHours)
  
  return {
    startDate,
    endDate,
    totalHours,
    engagedHours,
    availableHours: Math.max(0, totalHours - engagedHours),
    timeOffDays,
    workingDays,
    effectiveAvailableHours
  }
}

/**
 * Validate engagement capacity and conflicts
 * 
 * This function performs comprehensive validation of a new or updated engagement,
 * checking for capacity constraints, conflicts with existing engagements,
 * and potential issues like overallocation or unrealistic dates.
 * 
 * @param data - Complete member data for validation context
 * @param newEngagement - The engagement to validate (without ID for new engagements)
 * @param excludeEngagementId - ID of engagement to exclude from validation (for updates)
 * @returns Validation result with errors, warnings, and conflict information
 * 
 * @example
 * ```typescript
 * const validation = validateEngagementCapacity(memberData, {
 *   projectId: 'project-1',
 *   hoursPerWeek: 25,
 *   isActive: true,
 *   startDate: new Date()
 * });
 * 
 * if (!validation.valid) {
 *   console.log('Validation errors:', validation.errors);
 * }
 * ```
 */
export function validateEngagementCapacity(
  data: MemberAvailabilityData,
  newEngagement: Omit<EngagementData, 'id'>,
  excludeEngagementId?: string
): EngagementValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const { workingHoursPerWeek, engagements } = data
  
  // Filter out the engagement being updated
  const otherEngagements = engagements.filter(e => e.id !== excludeEngagementId)
  
  // Check basic hour capacity
  const currentEngagedHours = otherEngagements
    .filter(e => e.isActive)
    .reduce((sum, e) => sum + e.hoursPerWeek, 0)
  
  const availableHours = workingHoursPerWeek - currentEngagedHours
  
  if (newEngagement.hoursPerWeek > availableHours) {
    errors.push(
      `Engagement hours (${newEngagement.hoursPerWeek}h/week) exceed available capacity. ` +
      `Available: ${availableHours}h/week, Total capacity: ${workingHoursPerWeek}h/week`
    )
  }
  
  // Check for overlapping engagements on the same project
  const conflictingEngagements = otherEngagements.filter(e =>
    e.projectId === newEngagement.projectId &&
    e.isActive &&
    engagementsOverlap(e, newEngagement)
  )
  
  if (conflictingEngagements.length > 0) {
    errors.push(
      `Member already has an active engagement on this project during the specified period`
    )
  }
  
  // Check for high utilization warning
  const newUtilization = ((currentEngagedHours + newEngagement.hoursPerWeek) / workingHoursPerWeek) * 100
  if (newUtilization > 90) {
    warnings.push(
      `This engagement will result in ${newUtilization.toFixed(1)}% utilization, which may lead to overwork`
    )
  }
  
  // Check for date validation
  if (newEngagement.endDate && newEngagement.endDate <= newEngagement.startDate) {
    errors.push('End date must be after start date')
  }
  
  // Check for unrealistic future dates
  const tenYearsFromNow = new Date()
  tenYearsFromNow.setFullYear(tenYearsFromNow.getFullYear() + 10)
  
  if (newEngagement.endDate && isAfter(newEngagement.endDate, tenYearsFromNow)) {
    warnings.push('End date is more than 10 years in the future')
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    availableHours,
    conflictingEngagements
  }
}

/**
 * Validate time-off entry for conflicts and capacity
 * 
 * This function validates a new or updated time-off entry, checking for
 * date validity, overlaps with existing entries, and potential issues
 * like excessive vacation usage.
 * 
 * @param timeOffEntries - Array of existing time-off entries
 * @param newTimeOff - The time-off entry to validate (without ID for new entries)
 * @param excludeEntryId - ID of entry to exclude from validation (for updates)
 * @returns Validation result with errors and warnings
 * 
 * @example
 * ```typescript
 * const validation = validateTimeOffEntry(existingTimeOff, {
 *   type: 'vacation',
 *   startDate: new Date('2024-06-01'),
 *   endDate: new Date('2024-06-07'),
 *   status: 'pending'
 * });
 * 
 * if (!validation.valid) {
 *   console.log('Time-off validation failed:', validation.errors);
 * }
 * ```
 */
export function validateTimeOffEntry(
  timeOffEntries: TimeOffData[],
  newTimeOff: Omit<TimeOffData, 'id'>,
  excludeEntryId?: string
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Filter out the entry being updated
  const otherEntries = timeOffEntries.filter(e => e.id !== excludeEntryId)
  
  // Check date validity
  if (newTimeOff.endDate <= newTimeOff.startDate) {
    errors.push('End date must be after start date')
  }
  
  // Check for overlapping time-off entries
  const overlappingEntries = otherEntries.filter(entry =>
    entry.status !== 'rejected' &&
    timeOffPeriodsOverlap(entry, newTimeOff)
  )
  
  if (overlappingEntries.length > 0) {
    errors.push('Time-off period overlaps with existing time-off entries')
  }
  
  // Check for excessive vacation days (warning)
  if (newTimeOff.type === 'vacation') {
    const currentYear = new Date().getFullYear()
    const yearStart = new Date(currentYear, 0, 1)
    const yearEnd = new Date(currentYear, 11, 31)
    
    const vacationDaysThisYear = calculateTimeOffDaysInPeriod(
      otherEntries.filter(e => e.type === 'vacation' && e.status === 'approved'),
      yearStart,
      yearEnd
    )
    
    const newVacationDays = differenceInDays(newTimeOff.endDate, newTimeOff.startDate) + 1
    const totalVacationDays = vacationDaysThisYear + newVacationDays
    
    if (totalVacationDays > 25) { // Assuming 25 days annual vacation
      warnings.push(
        `This vacation request will result in ${totalVacationDays} vacation days this year, ` +
        `which exceeds the typical annual allowance`
      )
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Format hours for display with proper units
 * 
 * Formats hour values for consistent display across the application,
 * with optional unit inclusion and proper decimal handling.
 * 
 * @param hours - Number of hours to format
 * @param includeUnit - Whether to include the 'h' unit suffix (default: true)
 * @returns Formatted hours string
 * 
 * @example
 * ```typescript
 * formatHours(8) // "8h"
 * formatHours(8.5) // "8.5h"
 * formatHours(0) // "0h"
 * formatHours(8, false) // "8"
 * ```
 */
export function formatHours(hours: number, includeUnit: boolean = true): string {
  if (hours === 0) {
    return includeUnit ? '0h' : '0'
  }
  
  if (hours === Math.floor(hours)) {
    return includeUnit ? `${hours}h` : hours.toString()
  }
  
  return includeUnit ? `${hours.toFixed(1)}h` : hours.toFixed(1)
}

/**
 * Format hours per week for display
 * 
 * Formats hours with the "/week" suffix for engagement and capacity displays.
 * 
 * @param hours - Number of hours per week
 * @returns Formatted hours per week string
 * 
 * @example
 * ```typescript
 * formatHoursPerWeek(40) // "40h/week"
 * formatHoursPerWeek(20.5) // "20.5h/week"
 * ```
 */
export function formatHoursPerWeek(hours: number): string {
  return `${formatHours(hours)}/week`
}

/**
 * Format utilization percentage
 * 
 * Formats utilization percentages with consistent decimal precision.
 * 
 * @param percentage - Utilization percentage (0-100+)
 * @returns Formatted percentage string with % symbol
 * 
 * @example
 * ```typescript
 * formatUtilization(75.5) // "75.5%"
 * formatUtilization(100) // "100.0%"
 * ```
 */
export function formatUtilization(percentage: number): string {
  return `${percentage.toFixed(1)}%`
}

/**
 * Format availability summary for display
 * 
 * Creates a human-readable summary of member availability status,
 * taking into account current time-off status and utilization levels.
 * 
 * @param availability - Complete availability result from calculateMemberAvailability
 * @returns Human-readable availability summary string
 * 
 * @example
 * ```typescript
 * const summary = formatAvailabilitySummary(availability);
 * // Returns: "20h of 40h available" or "Currently on time-off"
 * ```
 */
export function formatAvailabilitySummary(availability: AvailabilityResult): string {
  const { availableHours, totalHours, utilizationPercentage } = availability
  
  if (availability.isCurrentlyOnTimeOff) {
    return 'Currently on time-off'
  }
  
  if (availableHours === 0) {
    return 'Fully allocated'
  }
  
  if (utilizationPercentage < 50) {
    return `${formatHours(availableHours)} available (${formatUtilization(100 - utilizationPercentage)} free)`
  }
  
  return `${formatHours(availableHours)} of ${formatHours(totalHours)} available`
}

/**
 * Get color indicator for utilization level
 * 
 * Returns appropriate color codes for different utilization levels
 * to provide visual feedback in the UI.
 * 
 * @param percentage - Utilization percentage (0-100+)
 * @returns Hex color code for the utilization level
 * 
 * @example
 * ```typescript
 * getUtilizationColor(50) // "#3B82F6" (blue - moderate)
 * getUtilizationColor(95) // "#F59E0B" (amber - high)
 * getUtilizationColor(105) // "#EF4444" (red - overallocated)
 * ```
 */
export function getUtilizationColor(percentage: number): string {
  if (percentage >= 100) return '#EF4444' // red - overallocated
  if (percentage >= 90) return '#F59E0B' // amber - high utilization
  if (percentage >= 70) return '#10B981' // green - good utilization
  if (percentage >= 40) return '#3B82F6' // blue - moderate utilization
  return '#6B7280' // gray - low utilization
}

/**
 * Get availability status for display
 * 
 * Determines the overall availability status of a member based on their
 * current utilization and time-off status, returning appropriate visual indicators.
 * 
 * @param availability - Complete availability result from calculateMemberAvailability
 * @returns Object containing status, color, and display label
 * 
 * @example
 * ```typescript
 * const status = getAvailabilityStatus(availability);
 * // Returns: { status: 'available', color: '#10B981', label: 'Available' }
 * ```
 */
export function getAvailabilityStatus(availability: AvailabilityResult): {
  status: 'available' | 'busy' | 'overallocated' | 'on_time_off'
  color: string
  label: string
} {
  if (availability.isCurrentlyOnTimeOff) {
    return {
      status: 'on_time_off',
      color: '#8B5CF6', // purple
      label: 'On Time-off'
    }
  }
  
  if (availability.utilizationPercentage >= 100) {
    return {
      status: 'overallocated',
      color: '#EF4444', // red
      label: 'Overallocated'
    }
  }
  
  if (availability.utilizationPercentage >= 90) {
    return {
      status: 'busy',
      color: '#F59E0B', // amber
      label: 'Busy'
    }
  }
  
  return {
    status: 'available',
    color: '#10B981', // green
    label: 'Available'
  }
}

// Helper functions

/**
 * Check if engagement is currently active based on dates
 * 
 * Determines if an engagement is active at a specific reference date,
 * considering both the isActive flag and date boundaries.
 * 
 * @param engagement - The engagement to check
 * @param referenceDate - The date to check against (typically current date)
 * @returns True if the engagement is active at the reference date
 * @internal
 */
function isEngagementActive(engagement: EngagementData, referenceDate: Date): boolean {
  if (!engagement.isActive) return false
  
  const start = engagement.startDate
  const end = engagement.endDate
  
  if (isBefore(referenceDate, start)) return false
  if (end && isAfter(referenceDate, end)) return false
  
  return true
}

/**
 * Check if two engagements overlap in time
 * 
 * Determines if two engagements have overlapping date ranges,
 * treating null end dates as ongoing (far future).
 * 
 * @param eng1 - First engagement to compare
 * @param eng2 - Second engagement to compare
 * @returns True if the engagements have overlapping time periods
 * @internal
 */
function engagementsOverlap(eng1: EngagementData, eng2: EngagementData): boolean {
  const start1 = eng1.startDate
  const end1 = eng1.endDate || new Date('2099-12-31')
  const start2 = eng2.startDate
  const end2 = eng2.endDate || new Date('2099-12-31')
  
  return isBefore(start1, end2) && isBefore(start2, end1)
}

/**
 * Check if engagement overlaps with a time period
 */
function engagementOverlapsPeriod(
  engagement: EngagementData,
  periodStart: Date,
  periodEnd: Date
): boolean {
  const engStart = engagement.startDate
  const engEnd = engagement.endDate || new Date('2099-12-31')
  
  return isBefore(engStart, periodEnd) && isBefore(periodStart, engEnd)
}

/**
 * Calculate how many days an engagement overlaps with a period
 */
function calculateEngagementOverlapDays(
  engagement: EngagementData,
  periodStart: Date,
  periodEnd: Date
): number {
  const engStart = engagement.startDate
  const engEnd = engagement.endDate || periodEnd
  
  const overlapStart = isAfter(engStart, periodStart) ? engStart : periodStart
  const overlapEnd = isBefore(engEnd, periodEnd) ? engEnd : periodEnd
  
  if (isAfter(overlapStart, overlapEnd)) return 0
  
  return calculateWorkingDays(overlapStart, overlapEnd)
}

/**
 * Check if two time-off periods overlap
 */
function timeOffPeriodsOverlap(timeOff1: TimeOffData, timeOff2: TimeOffData): boolean {
  return isBefore(timeOff1.startDate, timeOff2.endDate) && 
         isBefore(timeOff2.startDate, timeOff1.endDate)
}

/**
 * Calculate time-off days within a specific period
 */
function calculateTimeOffDaysInPeriod(
  timeOffEntries: TimeOffData[],
  periodStart: Date,
  periodEnd: Date
): number {
  return timeOffEntries.reduce((total, timeOff) => {
    const overlapStart = isAfter(timeOff.startDate, periodStart) ? timeOff.startDate : periodStart
    const overlapEnd = isBefore(timeOff.endDate, periodEnd) ? timeOff.endDate : periodEnd
    
    if (isAfter(overlapStart, overlapEnd)) return total
    
    return total + differenceInDays(overlapEnd, overlapStart) + 1
  }, 0)
}

/**
 * Calculate working days between two dates (excluding weekends)
 */
function calculateWorkingDays(startDate: Date, endDate: Date): number {
  let workingDays = 0
  let currentDate = new Date(startDate)
  
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      workingDays++
    }
    currentDate = addDays(currentDate, 1)
  }
  
  return workingDays
}

/**
 * Get start of month for a given date
 */
function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

/**
 * Get end of month for a given date
 */
function getMonthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

/**
 * Get start of year for a given date
 */
function getYearStart(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1)
}

/**
 * Get end of year for a given date
 */
function getYearEnd(date: Date): Date {
  return new Date(date.getFullYear(), 11, 31)
}

/**
 * Calculate total vacation days used in a specific year
 * 
 * Counts the total number of approved vacation days taken in a given year,
 * useful for tracking against annual vacation allowances.
 * 
 * @param timeOffEntries - Array of all time-off entries for the member
 * @param year - Year to calculate for (defaults to current year)
 * @returns Total number of vacation days used in the specified year
 * 
 * @example
 * ```typescript
 * const vacationDays = calculateVacationDaysUsed(timeOffEntries, 2024);
 * console.log(`Used ${vacationDays} vacation days in 2024`);
 * ```
 */
export function calculateVacationDaysUsed(
  timeOffEntries: TimeOffData[],
  year: number = new Date().getFullYear()
): number {
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year, 11, 31)
  
  const vacationEntries = timeOffEntries.filter(
    entry => entry.type === 'vacation' && entry.status === 'approved'
  )
  
  return calculateTimeOffDaysInPeriod(vacationEntries, yearStart, yearEnd)
}

/**
 * Get upcoming engagements (starting within next 30 days)
 * 
 * Filters engagements to find those starting within a specified number of days,
 * useful for planning and notification purposes.
 * 
 * @param engagements - Array of all engagements to filter
 * @param days - Number of days to look ahead (default: 30)
 * @returns Array of engagements starting within the specified timeframe
 * 
 * @example
 * ```typescript
 * const upcoming = getUpcomingEngagements(memberEngagements, 14);
 * console.log(`${upcoming.length} engagements starting in next 2 weeks`);
 * ```
 */
export function getUpcomingEngagements(
  engagements: EngagementData[],
  days: number = 30
): EngagementData[] {
  const now = new Date()
  const futureDate = addDays(now, days)
  
  return engagements.filter(engagement =>
    engagement.isActive &&
    isAfter(engagement.startDate, now) &&
    isBefore(engagement.startDate, futureDate)
  )
}

/**
 * Get ending engagements (ending within next 30 days)
 * 
 * Filters engagements to find those ending within a specified number of days,
 * useful for planning resource transitions and workload management.
 * 
 * @param engagements - Array of all engagements to filter
 * @param days - Number of days to look ahead (default: 30)
 * @returns Array of engagements ending within the specified timeframe
 * 
 * @example
 * ```typescript
 * const ending = getEndingEngagements(memberEngagements, 7);
 * console.log(`${ending.length} engagements ending this week`);
 * ```
 */
export function getEndingEngagements(
  engagements: EngagementData[],
  days: number = 30
): EngagementData[] {
  const now = new Date()
  const futureDate = addDays(now, days)
  
  return engagements.filter(engagement =>
    engagement.isActive &&
    engagement.endDate &&
    isAfter(engagement.endDate, now) &&
    isBefore(engagement.endDate, futureDate)
  )
}