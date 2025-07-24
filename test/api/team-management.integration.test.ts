import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock Prisma client
const mockPrisma = {
  organizationMember: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  permissionSet: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  projectEngagement: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  timeOffEntry: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  customRole: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  default: mockPrisma,
}))

// Mock auth utilities
vi.mock('@/lib/api-auth-utils', () => ({
  getAuthenticatedUser: vi.fn(),
  requireOrganizationAccess: vi.fn(),
  requirePermission: vi.fn(),
}))

import { getAuthenticatedUser, requireOrganizationAccess, requirePermission } from '@/lib/api-auth-utils'

describe('Team Management API Integration Tests', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  }

  const mockOrganizationMember = {
    id: 'member-123',
    organizationId: 'org-123',
    userId: 'user-123',
    role: 'admin',
    permissionSetId: null,
    jobTitle: 'Developer',
    workingHoursPerWeek: 40,
    joinDate: new Date('2024-01-01'),
    user: mockUser,
    permissionSet: null,
    engagements: [],
    timeOffEntries: [],
    profileData: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAuthenticatedUser).mockResolvedValue(mockUser)
    vi.mocked(requireOrganizationAccess).mockResolvedValue(mockOrganizationMember)
    vi.mocked(requirePermission).mockResolvedValue(undefined)
  })

  describe('Organization Members API', () => {
    describe('GET /api/organizations/[id]/members', () => {
      it('should return organization members with filtering', async () => {
        const mockMembers = [mockOrganizationMember]
        mockPrisma.organizationMember.findMany.mockResolvedValue(mockMembers)

        const { GET } = await import('@/app/api/organizations/[id]/members/route')
        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/members')
        const response = await GET(request, { params: { id: 'org-123' } })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.members).toHaveLength(1)
        expect(data.members[0].id).toBe('member-123')
        expect(mockPrisma.organizationMember.findMany).toHaveBeenCalledWith({
          where: { organizationId: 'org-123' },
          include: expect.objectContaining({
            user: true,
            permissionSet: true,
            engagements: expect.any(Object),
            timeOffEntries: expect.any(Object),
            profileData: true,
          }),
        })
      })

      it('should handle role filtering', async () => {
        mockPrisma.organizationMember.findMany.mockResolvedValue([])

        const { GET } = await import('@/app/api/organizations/[id]/members/route')
        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/members?role=admin')
        const response = await GET(request, { params: { id: 'org-123' } })

        expect(response.status).toBe(200)
        expect(mockPrisma.organizationMember.findMany).toHaveBeenCalledWith({
          where: {
            organizationId: 'org-123',
            role: 'admin',
          },
          include: expect.any(Object),
        })
      })

      it('should handle search filtering', async () => {
        mockPrisma.organizationMember.findMany.mockResolvedValue([])

        const { GET } = await import('@/app/api/organizations/[id]/members/route')
        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/members?search=john')
        const response = await GET(request, { params: { id: 'org-123' } })

        expect(response.status).toBe(200)
        expect(mockPrisma.organizationMember.findMany).toHaveBeenCalledWith({
          where: {
            organizationId: 'org-123',
            user: {
              OR: [
                { name: { contains: 'john', mode: 'insensitive' } },
                { email: { contains: 'john', mode: 'insensitive' } },
              ],
            },
          },
          include: expect.any(Object),
        })
      })

      it('should require proper permissions', async () => {
        vi.mocked(requirePermission).mockRejectedValue(new Error('Insufficient permissions'))

        const { GET } = await import('@/app/api/organizations/[id]/members/route')
        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/members')
        const response = await GET(request, { params: { id: 'org-123' } })

        expect(response.status).toBe(403)
      })
    })

    describe('POST /api/organizations/[id]/members', () => {
      it('should create new organization member', async () => {
        const newMemberData = {
          userId: 'user-456',
          role: 'member',
          jobTitle: 'Designer',
          workingHoursPerWeek: 35,
        }

        const createdMember = {
          ...mockOrganizationMember,
          id: 'member-456',
          userId: 'user-456',
          role: 'member',
          jobTitle: 'Designer',
          workingHoursPerWeek: 35,
        }

        mockPrisma.organizationMember.create.mockResolvedValue(createdMember)

        const { POST } = await import('@/app/api/organizations/[id]/members/route')
        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/members', {
          method: 'POST',
          body: JSON.stringify(newMemberData),
          headers: { 'Content-Type': 'application/json' },
        })
        const response = await POST(request, { params: { id: 'org-123' } })
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.id).toBe('member-456')
        expect(data.role).toBe('member')
        expect(mockPrisma.organizationMember.create).toHaveBeenCalledWith({
          data: {
            organizationId: 'org-123',
            userId: 'user-456',
            role: 'member',
            jobTitle: 'Designer',
            workingHoursPerWeek: 35,
          },
          include: expect.any(Object),
        })
      })

      it('should validate required fields', async () => {
        const invalidData = {
          role: 'member',
          // Missing userId
        }

        const { POST } = await import('@/app/api/organizations/[id]/members/route')
        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/members', {
          method: 'POST',
          body: JSON.stringify(invalidData),
          headers: { 'Content-Type': 'application/json' },
        })
        const response = await POST(request, { params: { id: 'org-123' } })

        expect(response.status).toBe(400)
      })

      it('should require manage permissions', async () => {
        vi.mocked(requirePermission).mockRejectedValue(new Error('Insufficient permissions'))

        const { POST } = await import('@/app/api/organizations/[id]/members/route')
        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/members', {
          method: 'POST',
          body: JSON.stringify({ userId: 'user-456', role: 'member' }),
          headers: { 'Content-Type': 'application/json' },
        })
        const response = await POST(request, { params: { id: 'org-123' } })

        expect(response.status).toBe(403)
      })
    })
  })

  describe('Permission Sets API', () => {
    describe('GET /api/organizations/[id]/permission-sets', () => {
      it('should return organization permission sets', async () => {
        const mockPermissionSets = [
          {
            id: 'perm-123',
            organizationId: 'org-123',
            name: 'Custom Admin',
            permissions: {
              teamMembers: { viewAll: true, manageAll: true },
              projects: { viewAll: true, manageAll: false, viewAssigned: true, manageAssigned: true },
            },
            isDefault: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            members: [],
          },
        ]

        mockPrisma.permissionSet.findMany.mockResolvedValue(mockPermissionSets)

        const { GET } = await import('@/app/api/organizations/[id]/permission-sets/route')
        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/permission-sets')
        const response = await GET(request, { params: { id: 'org-123' } })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.permissionSets).toHaveLength(1)
        expect(data.permissionSets[0].name).toBe('Custom Admin')
      })
    })

    describe('POST /api/organizations/[id]/permission-sets', () => {
      it('should create new permission set', async () => {
        const newPermissionSetData = {
          name: 'Project Manager',
          permissions: {
            teamMembers: { viewAll: true, manageAll: false },
            projects: { viewAll: true, manageAll: true, viewAssigned: true, manageAssigned: true },
            invoicing: { viewAll: false, manageAll: false, viewAssigned: true, manageAssigned: false },
            clients: { viewAll: false, manageAll: false, viewAssigned: true, manageAssigned: false },
            worklogs: { manageAll: false },
          },
        }

        const createdPermissionSet = {
          id: 'perm-456',
          organizationId: 'org-123',
          ...newPermissionSetData,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        mockPrisma.permissionSet.create.mockResolvedValue(createdPermissionSet)

        const { POST } = await import('@/app/api/organizations/[id]/permission-sets/route')
        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/permission-sets', {
          method: 'POST',
          body: JSON.stringify(newPermissionSetData),
          headers: { 'Content-Type': 'application/json' },
        })
        const response = await POST(request, { params: { id: 'org-123' } })
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.name).toBe('Project Manager')
        expect(data.permissions.projects.manageAll).toBe(true)
      })

      it('should validate permission dependencies', async () => {
        const invalidPermissions = {
          name: 'Invalid Set',
          permissions: {
            teamMembers: { viewAll: false, manageAll: true }, // Invalid: manage without view
            projects: { viewAll: true, manageAll: false, viewAssigned: true, manageAssigned: true },
            invoicing: { viewAll: false, manageAll: false, viewAssigned: false, manageAssigned: false },
            clients: { viewAll: false, manageAll: false, viewAssigned: false, manageAssigned: false },
            worklogs: { manageAll: false },
          },
        }

        const { POST } = await import('@/app/api/organizations/[id]/permission-sets/route')
        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/permission-sets', {
          method: 'POST',
          body: JSON.stringify(invalidPermissions),
          headers: { 'Content-Type': 'application/json' },
        })
        const response = await POST(request, { params: { id: 'org-123' } })

        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toContain('Permission dependencies')
      })
    })
  })

  describe('Project Engagements API', () => {
    describe('GET /api/organizations/[id]/members/[memberId]/engagements', () => {
      it('should return member engagements with summary', async () => {
        const mockEngagements = [
          {
            id: 'eng-123',
            organizationMemberId: 'member-123',
            projectId: 'project-123',
            role: 'Developer',
            hoursPerWeek: 20,
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-06-30'),
            isActive: true,
            createdAt: new Date(),
            project: {
              id: 'project-123',
              name: 'Test Project',
              organizationId: 'org-123',
            },
          },
        ]

        mockPrisma.projectEngagement.findMany.mockResolvedValue(mockEngagements)

        const { GET } = await import('@/app/api/organizations/[id]/members/[memberId]/engagements/route')
        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/members/member-123/engagements')
        const response = await GET(request, { params: { id: 'org-123', memberId: 'member-123' } })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.engagements).toHaveLength(1)
        expect(data.summary.totalHours).toBe(20)
        expect(data.summary.activeEngagements).toBe(1)
      })
    })

    describe('POST /api/organizations/[id]/members/[memberId]/engagements', () => {
      it('should create new engagement', async () => {
        const newEngagementData = {
          projectId: 'project-456',
          role: 'Designer',
          hoursPerWeek: 15,
          startDate: '2024-03-01',
          endDate: '2024-08-31',
        }

        const createdEngagement = {
          id: 'eng-456',
          organizationMemberId: 'member-123',
          ...newEngagementData,
          startDate: new Date(newEngagementData.startDate),
          endDate: new Date(newEngagementData.endDate),
          isActive: true,
          createdAt: new Date(),
        }

        mockPrisma.projectEngagement.create.mockResolvedValue(createdEngagement)

        const { POST } = await import('@/app/api/organizations/[id]/members/[memberId]/engagements/route')
        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/members/member-123/engagements', {
          method: 'POST',
          body: JSON.stringify(newEngagementData),
          headers: { 'Content-Type': 'application/json' },
        })
        const response = await POST(request, { params: { id: 'org-123', memberId: 'member-123' } })
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.role).toBe('Designer')
        expect(data.hoursPerWeek).toBe(15)
      })

      it('should validate engagement capacity', async () => {
        // Mock member with high utilization
        const busyMember = {
          ...mockOrganizationMember,
          workingHoursPerWeek: 40,
          engagements: [
            {
              id: 'eng-existing',
              hoursPerWeek: 35,
              isActive: true,
              startDate: new Date('2024-01-01'),
              endDate: null,
            },
          ],
        }

        vi.mocked(requireOrganizationAccess).mockResolvedValue(busyMember)

        const newEngagementData = {
          projectId: 'project-456',
          role: 'Developer',
          hoursPerWeek: 20, // Would exceed capacity
          startDate: '2024-03-01',
          endDate: '2024-08-31',
        }

        const { POST } = await import('@/app/api/organizations/[id]/members/[memberId]/engagements/route')
        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/members/member-123/engagements', {
          method: 'POST',
          body: JSON.stringify(newEngagementData),
          headers: { 'Content-Type': 'application/json' },
        })
        const response = await POST(request, { params: { id: 'org-123', memberId: 'member-123' } })

        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toContain('capacity')
      })
    })
  })

  describe('Time-off API', () => {
    describe('POST /api/organizations/[id]/members/[memberId]/time-off', () => {
      it('should create new time-off entry', async () => {
        const newTimeOffData = {
          type: 'vacation',
          startDate: '2024-07-01',
          endDate: '2024-07-10',
          description: 'Summer vacation',
        }

        const createdTimeOff = {
          id: 'timeoff-123',
          organizationMemberId: 'member-123',
          ...newTimeOffData,
          startDate: new Date(newTimeOffData.startDate),
          endDate: new Date(newTimeOffData.endDate),
          status: 'pending',
          createdAt: new Date(),
        }

        mockPrisma.timeOffEntry.create.mockResolvedValue(createdTimeOff)

        const { POST } = await import('@/app/api/organizations/[id]/members/[memberId]/time-off/route')
        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/members/member-123/time-off', {
          method: 'POST',
          body: JSON.stringify(newTimeOffData),
          headers: { 'Content-Type': 'application/json' },
        })
        const response = await POST(request, { params: { id: 'org-123', memberId: 'member-123' } })
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.type).toBe('vacation')
        expect(data.description).toBe('Summer vacation')
      })

      it('should validate time-off dates', async () => {
        const invalidTimeOffData = {
          type: 'vacation',
          startDate: '2024-07-10',
          endDate: '2024-07-01', // End before start
          description: 'Invalid vacation',
        }

        const { POST } = await import('@/app/api/organizations/[id]/members/[memberId]/time-off/route')
        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/members/member-123/time-off', {
          method: 'POST',
          body: JSON.stringify(invalidTimeOffData),
          headers: { 'Content-Type': 'application/json' },
        })
        const response = await POST(request, { params: { id: 'org-123', memberId: 'member-123' } })

        expect(response.status).toBe(400)
      })
    })
  })

  describe('Custom Roles API', () => {
    describe('POST /api/organizations/[id]/roles', () => {
      it('should create new custom role', async () => {
        const newRoleData = {
          name: 'Senior Developer',
          color: '#3B82F6',
        }

        const createdRole = {
          id: 'role-123',
          organizationId: 'org-123',
          ...newRoleData,
          createdAt: new Date(),
        }

        mockPrisma.customRole.create.mockResolvedValue(createdRole)

        const { POST } = await import('@/app/api/organizations/[id]/roles/route')
        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/roles', {
          method: 'POST',
          body: JSON.stringify(newRoleData),
          headers: { 'Content-Type': 'application/json' },
        })
        const response = await POST(request, { params: { id: 'org-123' } })
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.name).toBe('Senior Developer')
        expect(data.color).toBe('#3B82F6')
      })

      it('should validate role name uniqueness', async () => {
        const duplicateRoleData = {
          name: 'Developer',
          color: '#3B82F6',
        }

        // Mock Prisma error for unique constraint violation
        const uniqueConstraintError = new Error('Unique constraint failed')
        uniqueConstraintError.code = 'P2002'
        mockPrisma.customRole.create.mockRejectedValue(uniqueConstraintError)

        const { POST } = await import('@/app/api/organizations/[id]/roles/route')
        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/roles', {
          method: 'POST',
          body: JSON.stringify(duplicateRoleData),
          headers: { 'Content-Type': 'application/json' },
        })
        const response = await POST(request, { params: { id: 'org-123' } })

        expect(response.status).toBe(409)
        const data = await response.json()
        expect(data.error).toContain('already exists')
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockPrisma.organizationMember.findMany.mockRejectedValue(new Error('Database connection failed'))

      const { GET } = await import('@/app/api/organizations/[id]/members/route')
      const request = new NextRequest('http://localhost:3000/api/organizations/org-123/members')
      const response = await GET(request, { params: { id: 'org-123' } })

      expect(response.status).toBe(500)
    })

    it('should handle invalid UUID parameters', async () => {
      const { GET } = await import('@/app/api/organizations/[id]/members/route')
      const request = new NextRequest('http://localhost:3000/api/organizations/invalid-uuid/members')
      const response = await GET(request, { params: { id: 'invalid-uuid' } })

      expect(response.status).toBe(400)
    })

    it('should handle malformed JSON requests', async () => {
      const { POST } = await import('@/app/api/organizations/[id]/members/route')
      const request = new NextRequest('http://localhost:3000/api/organizations/org-123/members', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      })
      const response = await POST(request, { params: { id: 'org-123' } })

      expect(response.status).toBe(400)
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce rate limits on API endpoints', async () => {
      // This would require implementing rate limiting middleware
      // For now, we'll test the rate limiting utility function
      const { checkRateLimit } = await import('@/lib/permission-utils')
      
      const identifier = 'test-user'
      const maxRequests = 3
      const windowMs = 60000

      // Make requests up to the limit
      for (let i = 0; i < maxRequests; i++) {
        const result = checkRateLimit(identifier, maxRequests, windowMs)
        expect(result.allowed).toBe(true)
      }

      // Next request should be blocked
      const blockedResult = checkRateLimit(identifier, maxRequests, windowMs)
      expect(blockedResult.allowed).toBe(false)
    })
  })

  describe('Audit Logging', () => {
    it('should create audit logs for sensitive operations', async () => {
      const newMemberData = {
        userId: 'user-456',
        role: 'admin',
        jobTitle: 'Manager',
      }

      mockPrisma.organizationMember.create.mockResolvedValue({
        ...mockOrganizationMember,
        id: 'member-456',
        userId: 'user-456',
        role: 'admin',
      })

      const { POST } = await import('@/app/api/organizations/[id]/members/route')
      const request = new NextRequest('http://localhost:3000/api/organizations/org-123/members', {
        method: 'POST',
        body: JSON.stringify(newMemberData),
        headers: { 'Content-Type': 'application/json' },
      })
      const response = await POST(request, { params: { id: 'org-123' } })

      expect(response.status).toBe(201)
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'member.create',
          resourceType: 'member',
          userId: 'user-123',
          organizationId: 'org-123',
        }),
      })
    })
  })
})