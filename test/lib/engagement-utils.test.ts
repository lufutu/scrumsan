import { describe, it, expect } from 'vitest'
import {
  calculateEngagementHours,
  validateEngagementOverlap,
  getEngagementsByProject,
  getActiveEngagements,
  calculateProjectUtilization,
  formatEngagementPeriod,
  isEngagementActive,
  getEngagementDuration,
  calculateEngagementCost,
  getEngagementsByDateRange
} from '@/lib/engagement-utils'

describe('Engagement Utils', () => {
  const mockEngagements = [
    {
      id: '1',
      organizationMemberId: 'member-1',
      projectId: 'project-1',
      role: 'Developer',
      hoursPerWeek: 20,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-06-30'),
      isActive: true,
      createdAt: new Date('2024-01-01'),
      project: {
        id: 'project-1',
        name: 'Project Alpha',
        organizationId: 'org-1'
      }
    },
    {
      id: '2',
      organizationMemberId: 'member-1',
      projectId: 'project-2',
      role: 'Consultant',
      hoursPerWeek: 10,
      startDate: new Date('2024-03-01'),
      endDate: null, // Ongoing
      isActive: true,
      createdAt: new Date('2024-03-01'),
      project: {
        id: 'project-2',
        name: 'Project Beta',
        organizationId: 'org-1'
      }
    },
    {
      id: '3',
      organizationMemberId: 'member-2',
      projectId: 'project-1',
      role: 'Designer',
      hoursPerWeek: 15,
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-08-31'),
      isActive: true,
      createdAt: new Date('2024-02-01'),
      project: {
        id: 'project-1',
        name: 'Project Alpha',
        organizationId: 'org-1'
      }
    },
    {
      id: '4',
      organizationMemberId: 'member-1',
      projectId: 'project-3',
      role: 'Developer',
      hoursPerWeek: 25,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-03-31'),
      isActive: false, // Completed
      createdAt: new Date('2024-01-01'),
      project: {
        id: 'project-3',
        name: 'Project Gamma',
        organizationId: 'org-1'
      }
    }
  ]

  describe('calculateEngagementHours', () => {
    it('should calculate total hours for active engagements', () => {
      const totalHours = calculateEngagementHours(mockEngagements, true)
      expect(totalHours).toBe(45) // 20 + 10 + 15 (only active engagements)
    })

    it('should calculate total hours for all engagements', () => {
      const totalHours = calculateEngagementHours(mockEngagements, false)
      expect(totalHours).toBe(70) // 20 + 10 + 15 + 25 (all engagements)
    })

    it('should handle empty engagement list', () => {
      const totalHours = calculateEngagementHours([], true)
      expect(totalHours).toBe(0)
    })

    it('should filter by member', () => {
      const member1Hours = calculateEngagementHours(
        mockEngagements.filter(e => e.organizationMemberId === 'member-1'),
        true
      )
      expect(member1Hours).toBe(30) // 20 + 10 (member-1 active engagements)
    })
  })

  describe('validateEngagementOverlap', () => {
    it('should detect overlapping engagements', () => {
      const newEngagement = {
        organizationMemberId: 'member-1',
        projectId: 'project-4',
        startDate: new Date('2024-04-01'),
        endDate: new Date('2024-07-31'),
        hoursPerWeek: 20
      }

      const result = validateEngagementOverlap(mockEngagements, newEngagement)
      
      expect(result.hasOverlap).toBe(true)
      expect(result.overlappingEngagements.length).toBeGreaterThan(0)
    })

    it('should allow non-overlapping engagements', () => {
      const newEngagement = {
        organizationMemberId: 'member-1',
        projectId: 'project-4',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-31'),
        hoursPerWeek: 20
      }

      const result = validateEngagementOverlap(mockEngagements, newEngagement)
      
      expect(result.hasOverlap).toBe(false)
      expect(result.overlappingEngagements).toHaveLength(0)
    })

    it('should handle ongoing engagements (no end date)', () => {
      const newEngagement = {
        organizationMemberId: 'member-1',
        projectId: 'project-4',
        startDate: new Date('2024-06-01'),
        endDate: null, // Ongoing
        hoursPerWeek: 15
      }

      const result = validateEngagementOverlap(mockEngagements, newEngagement)
      
      expect(result.hasOverlap).toBe(true) // Should overlap with ongoing project-2
    })

    it('should exclude inactive engagements from overlap check', () => {
      const newEngagement = {
        organizationMemberId: 'member-1',
        projectId: 'project-4',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-03-15'),
        hoursPerWeek: 20
      }

      const result = validateEngagementOverlap(mockEngagements, newEngagement)
      
      // Should not overlap with inactive project-3 engagement
      const overlapsWithActive = result.overlappingEngagements.every(e => e.isActive)
      expect(overlapsWithActive).toBe(true)
    })
  })

  describe('getEngagementsByProject', () => {
    it('should return engagements for specific project', () => {
      const project1Engagements = getEngagementsByProject(mockEngagements, 'project-1')
      
      expect(project1Engagements).toHaveLength(2)
      expect(project1Engagements.every(e => e.projectId === 'project-1')).toBe(true)
    })

    it('should return empty array for non-existent project', () => {
      const nonExistentEngagements = getEngagementsByProject(mockEngagements, 'project-999')
      
      expect(nonExistentEngagements).toHaveLength(0)
    })

    it('should optionally filter by active status', () => {
      const activeProject1Engagements = getEngagementsByProject(mockEngagements, 'project-1', true)
      
      expect(activeProject1Engagements).toHaveLength(2)
      expect(activeProject1Engagements.every(e => e.isActive)).toBe(true)
    })
  })

  describe('getActiveEngagements', () => {
    it('should return only active engagements', () => {
      const activeEngagements = getActiveEngagements(mockEngagements)
      
      expect(activeEngagements).toHaveLength(3)
      expect(activeEngagements.every(e => e.isActive)).toBe(true)
    })

    it('should handle empty list', () => {
      const activeEngagements = getActiveEngagements([])
      
      expect(activeEngagements).toHaveLength(0)
    })
  })

  describe('calculateProjectUtilization', () => {
    it('should calculate project utilization correctly', () => {
      const utilization = calculateProjectUtilization(mockEngagements, 'project-1')
      
      expect(utilization.totalHours).toBe(35) // 20 + 15
      expect(utilization.activeHours).toBe(35) // Both are active
      expect(utilization.memberCount).toBe(2)
    })

    it('should handle project with no engagements', () => {
      const utilization = calculateProjectUtilization(mockEngagements, 'project-999')
      
      expect(utilization.totalHours).toBe(0)
      expect(utilization.activeHours).toBe(0)
      expect(utilization.memberCount).toBe(0)
    })
  })

  describe('formatEngagementPeriod', () => {
    it('should format engagement with end date', () => {
      const engagement = mockEngagements[0]
      const formatted = formatEngagementPeriod(engagement)
      
      expect(formatted).toContain('Jan 1, 2024')
      expect(formatted).toContain('Jun 30, 2024')
    })

    it('should format ongoing engagement', () => {
      const engagement = mockEngagements[1]
      const formatted = formatEngagementPeriod(engagement)
      
      expect(formatted).toContain('Mar 1, 2024')
      expect(formatted).toContain('Ongoing')
    })
  })

  describe('isEngagementActive', () => {
    it('should return true for active engagement within date range', () => {
      const engagement = mockEngagements[0]
      const testDate = new Date('2024-03-15')
      
      expect(isEngagementActive(engagement, testDate)).toBe(true)
    })

    it('should return false for engagement outside date range', () => {
      const engagement = mockEngagements[0]
      const testDate = new Date('2024-08-15')
      
      expect(isEngagementActive(engagement, testDate)).toBe(false)
    })

    it('should return true for ongoing engagement', () => {
      const engagement = mockEngagements[1]
      const testDate = new Date('2024-08-15')
      
      expect(isEngagementActive(engagement, testDate)).toBe(true)
    })

    it('should return false for inactive engagement', () => {
      const engagement = mockEngagements[3] // isActive: false
      const testDate = new Date('2024-02-15')
      
      expect(isEngagementActive(engagement, testDate)).toBe(false)
    })
  })

  describe('getEngagementDuration', () => {
    it('should calculate duration for engagement with end date', () => {
      const engagement = mockEngagements[0]
      const duration = getEngagementDuration(engagement)
      
      expect(duration.days).toBeGreaterThan(0)
      expect(duration.weeks).toBeGreaterThan(0)
      expect(duration.months).toBeGreaterThan(0)
    })

    it('should handle ongoing engagement', () => {
      const engagement = mockEngagements[1]
      const duration = getEngagementDuration(engagement)
      
      expect(duration.isOngoing).toBe(true)
      expect(duration.days).toBeGreaterThan(0) // Days since start
    })

    it('should calculate duration from custom date', () => {
      const engagement = mockEngagements[0]
      const fromDate = new Date('2024-03-01')
      const duration = getEngagementDuration(engagement, fromDate)
      
      expect(duration.days).toBeLessThan(getEngagementDuration(engagement).days)
    })
  })

  describe('calculateEngagementCost', () => {
    it('should calculate cost with hourly rate', () => {
      const engagement = mockEngagements[0]
      const hourlyRate = 50
      const cost = calculateEngagementCost(engagement, hourlyRate)
      
      expect(cost.weeklyRate).toBe(1000) // 20 hours * $50
      expect(cost.totalCost).toBeGreaterThan(0)
    })

    it('should handle ongoing engagement cost calculation', () => {
      const engagement = mockEngagements[1]
      const hourlyRate = 75
      const cost = calculateEngagementCost(engagement, hourlyRate)
      
      expect(cost.weeklyRate).toBe(750) // 10 hours * $75
      expect(cost.isOngoing).toBe(true)
    })

    it('should calculate cost for specific period', () => {
      const engagement = mockEngagements[0]
      const hourlyRate = 60
      const startDate = new Date('2024-02-01')
      const endDate = new Date('2024-04-30')
      const cost = calculateEngagementCost(engagement, hourlyRate, startDate, endDate)
      
      expect(cost.totalCost).toBeGreaterThan(0)
      expect(cost.totalCost).toBeLessThan(calculateEngagementCost(engagement, hourlyRate).totalCost)
    })
  })

  describe('getEngagementsByDateRange', () => {
    it('should return engagements within date range', () => {
      const startDate = new Date('2024-02-01')
      const endDate = new Date('2024-05-31')
      const engagements = getEngagementsByDateRange(mockEngagements, startDate, endDate)
      
      expect(engagements.length).toBeGreaterThan(0)
      expect(engagements.every(e => {
        const engagementStart = new Date(e.startDate)
        const engagementEnd = e.endDate ? new Date(e.endDate) : new Date()
        return engagementStart <= endDate && engagementEnd >= startDate
      })).toBe(true)
    })

    it('should include ongoing engagements', () => {
      const startDate = new Date('2024-06-01')
      const endDate = new Date('2024-08-31')
      const engagements = getEngagementsByDateRange(mockEngagements, startDate, endDate)
      
      const hasOngoingEngagement = engagements.some(e => e.endDate === null)
      expect(hasOngoingEngagement).toBe(true)
    })

    it('should return empty array for non-overlapping date range', () => {
      const startDate = new Date('2025-01-01')
      const endDate = new Date('2025-12-31')
      const engagements = getEngagementsByDateRange(mockEngagements, startDate, endDate)
      
      expect(engagements).toHaveLength(0)
    })

    it('should optionally filter by active status', () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-12-31')
      const activeEngagements = getEngagementsByDateRange(mockEngagements, startDate, endDate, true)
      
      expect(activeEngagements.every(e => e.isActive)).toBe(true)
    })
  })
})