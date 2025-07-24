import { describe, it, expect, beforeEach } from 'vitest'
import {
  calculateMemberAvailability,
  calculatePeriodAvailability,
  validateEngagementCapacity,
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
} from '@/lib/availability-utils'

describe('Availability Utils', () => {
  const mockMemberData = {
    workingHoursPerWeek: 40,
    engagements: [
      {
        id: '1',
        projectId: 'project-1',
        hoursPerWeek: 20,
        isActive: true,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        role: 'Developer'
      },
      {
        id: '2',
        projectId: 'project-2',
        hoursPerWeek: 10,
        isActive: true,
        startDate: new Date('2024-06-01'),
        endDate: null,
        role: 'Consultant'
      }
    ],
    timeOffEntries: [
      {
        id: '1',
        type: 'vacation' as const,
        startDate: new Date('2024-07-15'),
        endDate: new Date('2024-07-25'),
        status: 'approved' as const,
        description: 'Summer vacation'
      },
      {
        id: '2',
        type: 'sick_leave' as const,
        startDate: new Date('2024-08-05'),
        endDate: new Date('2024-08-07'),
        status: 'approved' as const
      }
    ],
    joinDate: new Date('2024-01-01')
  }

  describe('calculateMemberAvailability', () => {
    it('should calculate basic availability correctly', () => {
      const result = calculateMemberAvailability(mockMemberData)
      
      expect(result.totalHours).toBe(40)
      expect(result.engagedHours).toBe(10) // Only second engagement is active in current date
      expect(result.availableHours).toBe(30)
      expect(result.utilizationPercentage).toBe(25)
    })

    it('should handle zero working hours', () => {
      const zeroHoursData = {
        workingHoursPerWeek: 0,
        engagements: [],
        timeOffEntries: []
      }
      
      const result = calculateMemberAvailability(zeroHoursData)
      
      expect(result.totalHours).toBe(0)
      expect(result.engagedHours).toBe(0)
      expect(result.availableHours).toBe(0)
      expect(result.utilizationPercentage).toBe(0)
    })

    it('should handle overallocated member', () => {
      const overallocatedData = {
        workingHoursPerWeek: 40,
        engagements: [
          {
            id: '1',
            projectId: 'project-1',
            hoursPerWeek: 30,
            isActive: true,
            startDate: new Date('2024-01-01'),
            endDate: null
          },
          {
            id: '2',
            projectId: 'project-2',
            hoursPerWeek: 20,
            isActive: true,
            startDate: new Date('2024-01-01'),
            endDate: null
          }
        ],
        timeOffEntries: []
      }
      
      const result = calculateMemberAvailability(overallocatedData)
      
      expect(result.totalHours).toBe(40)
      expect(result.engagedHours).toBe(50)
      expect(result.availableHours).toBe(0) // Math.max(0, 40 - 50)
      expect(result.utilizationPercentage).toBe(125)
    })

    it('should only count active engagements', () => {
      const dataWithInactiveEngagement = {
        ...mockMemberData,
        engagements: [
          ...mockMemberData.engagements,
          {
            id: '3',
            projectId: 'project-3',
            hoursPerWeek: 15,
            isActive: false,
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-12-31')
          }
        ]
      }
      
      const result = calculateMemberAvailability(dataWithInactiveEngagement)
      
      expect(result.engagedHours).toBe(30) // Should not include inactive engagement
    })
  })

  describe('calculatePeriodAvailability', () => {
    it('should calculate availability for a specific period', () => {
      const periodStart = new Date('2024-07-01')
      const periodEnd = new Date('2024-07-31')
      
      const result = calculatePeriodAvailability(mockMemberData, periodStart, periodEnd)
      
      expect(result.totalHours).toBe(40)
      expect(result.engagedHours).toBe(30)
      expect(result.hasTimeOff).toBe(true)
      expect(result.timeOffDays).toBeGreaterThan(0)
    })

    it('should handle period with no time off', () => {
      const periodStart = new Date('2024-09-01')
      const periodEnd = new Date('2024-09-30')
      
      const result = calculatePeriodAvailability(mockMemberData, periodStart, periodEnd)
      
      expect(result.hasTimeOff).toBe(false)
      expect(result.timeOffDays).toBe(0)
    })
  })

  describe('validateEngagementCapacity', () => {
    it('should validate valid engagement', () => {
      const newEngagement = {
        projectId: 'project-3',
        hoursPerWeek: 5,
        isActive: true,
        startDate: new Date('2024-08-01'),
        endDate: new Date('2024-12-31')
      }
      
      const result = validateEngagementCapacity(mockMemberData, newEngagement)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject engagement that exceeds capacity', () => {
      const newEngagement = {
        projectId: 'project-3',
        hoursPerWeek: 15,
        isActive: true,
        startDate: new Date('2024-08-01'),
        endDate: new Date('2024-12-31')
      }
      
      const result = validateEngagementCapacity(mockMemberData, newEngagement)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Engagement would exceed available capacity')
    })

    it('should reject engagement with invalid hours', () => {
      const newEngagement = {
        projectId: 'project-3',
        hoursPerWeek: 200,
        isActive: true,
        startDate: new Date('2024-08-01'),
        endDate: new Date('2024-12-31')
      }
      
      const result = validateEngagementCapacity(mockMemberData, newEngagement)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Hours per week cannot exceed 168')
    })

    it('should handle engagement on same project', () => {
      const newEngagement = {
        projectId: 'project-1', // Same project as existing engagement
        hoursPerWeek: 10,
        isActive: true,
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-08-31')
      }
      
      const result = validateEngagementCapacity(mockMemberData, newEngagement)
      
      expect(result.warnings).toContain('Member already has an engagement on this project')
    })
  })

  describe('validateTimeOffEntry', () => {
    it('should validate valid time-off entry', () => {
      const newTimeOff = {
        type: 'vacation' as const,
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-09-10'),
        status: 'pending' as const
      }
      
      const result = validateTimeOffEntry(mockMemberData.timeOffEntries, newTimeOff)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject overlapping time-off', () => {
      const overlappingTimeOff = {
        type: 'sick_leave' as const,
        startDate: new Date('2024-07-20'),
        endDate: new Date('2024-07-30'),
        status: 'pending' as const
      }
      
      const result = validateTimeOffEntry(mockMemberData.timeOffEntries, overlappingTimeOff)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Time-off period overlaps with existing entry')
    })

    it('should reject invalid date range', () => {
      const invalidTimeOff = {
        type: 'vacation' as const,
        startDate: new Date('2024-08-15'),
        endDate: new Date('2024-08-10'), // End before start
        status: 'pending' as const
      }
      
      const result = validateTimeOffEntry([], invalidTimeOff)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('End date must be after start date')
    })
  })

  describe('formatting functions', () => {
    it('should format hours correctly', () => {
      expect(formatHours(25.5)).toBe('25.5h')
      expect(formatHours(0)).toBe('0h')
      expect(formatHours(40)).toBe('40h')
    })

    it('should format hours per week correctly', () => {
      expect(formatHoursPerWeek(40)).toBe('40h/week')
      expect(formatHoursPerWeek(0)).toBe('0h/week')
    })

    it('should format utilization correctly', () => {
      expect(formatUtilization(75.5)).toBe('75.5%')
      expect(formatUtilization(100)).toBe('100%')
      expect(formatUtilization(0)).toBe('0%')
    })

    it('should get correct utilization color', () => {
      expect(getUtilizationColor(50)).toBe('text-green-600')
      expect(getUtilizationColor(85)).toBe('text-yellow-600')
      expect(getUtilizationColor(110)).toBe('text-red-600')
    })
  })

  describe('getAvailabilityStatus', () => {
    it('should return correct status for available member', () => {
      const availability = {
        totalHours: 40,
        engagedHours: 20,
        availableHours: 20,
        utilization: 50
      }
      
      const status = getAvailabilityStatus(availability)
      
      expect(status.status).toBe('available')
      expect(status.color).toBe('text-green-600')
    })

    it('should return correct status for busy member', () => {
      const availability = {
        totalHours: 40,
        engagedHours: 35,
        availableHours: 5,
        utilization: 87.5
      }
      
      const status = getAvailabilityStatus(availability)
      
      expect(status.status).toBe('busy')
      expect(status.color).toBe('text-yellow-600')
    })

    it('should return correct status for overallocated member', () => {
      const availability = {
        totalHours: 40,
        engagedHours: 50,
        availableHours: -10,
        utilization: 125
      }
      
      const status = getAvailabilityStatus(availability)
      
      expect(status.status).toBe('overallocated')
      expect(status.color).toBe('text-red-600')
    })
  })

  describe('calculateVacationDaysUsed', () => {
    it('should calculate vacation days correctly', () => {
      const vacationDays = calculateVacationDaysUsed(mockMemberData.timeOffEntries, 2024)
      
      expect(vacationDays).toBeGreaterThan(0)
    })

    it('should return 0 for year with no vacation', () => {
      const vacationDays = calculateVacationDaysUsed(mockMemberData.timeOffEntries, 2025)
      
      expect(vacationDays).toBe(0)
    })
  })

  describe('engagement helpers', () => {
    it('should get upcoming engagements', () => {
      const upcoming = getUpcomingEngagements(mockMemberData.engagements)
      
      expect(Array.isArray(upcoming)).toBe(true)
    })

    it('should get ending engagements', () => {
      const ending = getEndingEngagements(mockMemberData.engagements)
      
      expect(Array.isArray(ending)).toBe(true)
    })
  })
})