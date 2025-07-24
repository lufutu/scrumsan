import { describe, it, expect } from 'vitest'
import {
  formatHours,
  formatHoursPerWeek,
  formatUtilization,
  calculateVacationDaysUsed,
  getUpcomingEngagements,
  getEndingEngagements
} from '@/lib/availability-utils'

describe('Availability Utils - Simple Tests', () => {
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
      expect(formatUtilization(100)).toBe('100.0%')
      expect(formatUtilization(0)).toBe('0.0%')
    })
  })

  describe('vacation days calculation', () => {
    it('should calculate vacation days correctly', () => {
      const timeOffEntries = [
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
      ]
      
      const vacationDays = calculateVacationDaysUsed(timeOffEntries, 2024)
      expect(vacationDays).toBeGreaterThan(0)
    })

    it('should return 0 for year with no vacation', () => {
      const timeOffEntries = [
        {
          id: '1',
          type: 'vacation' as const,
          startDate: new Date('2024-07-15'),
          endDate: new Date('2024-07-25'),
          status: 'approved' as const
        }
      ]
      
      const vacationDays = calculateVacationDaysUsed(timeOffEntries, 2025)
      expect(vacationDays).toBe(0)
    })
  })

  describe('engagement helpers', () => {
    const mockEngagements = [
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
    ]

    it('should get upcoming engagements', () => {
      const upcoming = getUpcomingEngagements(mockEngagements)
      expect(Array.isArray(upcoming)).toBe(true)
    })

    it('should get ending engagements', () => {
      const ending = getEndingEngagements(mockEngagements)
      expect(Array.isArray(ending)).toBe(true)
    })
  })
})