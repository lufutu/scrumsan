import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createMocks } from 'node-mocks-http'
import { prisma } from '@/lib/prisma'
import { createTestUser, createTestOrganization, createTestProject } from '@/test/factories/team-management.factory'

describe('Team Management System Integration', () => {
  let testUser: any
  let testOrg: any
  let testProject: any

  beforeEach(async () => {
    // Create test data
    testUser = await createTestUser()
    testOrg = await createTestOrganization(testUser.id)
    testProject = await createTestProject(testOrg.id)
  })

  afterEach(async () => {
    // Cleanup test data
    await prisma.projectEngagement.deleteMany()
    await prisma.timeOffEntry.deleteMany()
    await prisma.memberProfile.deleteMany()
    await prisma.timelineEvent.deleteMany()
    await prisma.customRole.deleteMany()
    await prisma.permissionSet.deleteMany()
    await prisma.organizationMember.deleteMany()
    await prisma.project.deleteMany()
    await prisma.organization.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('Organization Integration', () => {
    it('should maintain referential integrity when organization is deleted', async () => {
      // Create member with full profile
      const member = await prisma.organizationMember.create({
        data: {
          organizationId: testOrg.id,
          userId: testUser.id,
          role: 'member',
          workingHoursPerWeek: 40,
          profileData: {
            create: {
              secondaryEmail: 'test@example.com',
              visibility: {}
            }
          },
          engagements: {
            create: {
              projectId: testProject.id,
              hoursPerWeek: 20,
              startDate: new Date(),
              role: 'Developer'
            }
          }
        }
      })

      // Delete organization should cascade delete all related data
      await prisma.organization.delete({
        where: { id: testOrg.id }
      })

      // Verify cascade deletion
      const memberExists = await prisma.organizationMember.findUnique({
        where: { id: member.id }
      })
      expect(memberExists).toBeNull()

      const profileExists = await prisma.memberProfile.findFirst({
        where: { organizationMemberId: member.id }
      })
      expect(profileExists).toBeNull()

      const engagementExists = await prisma.projectEngagement.findFirst({
        where: { organizationMemberId: member.id }
      })
      expect(engagementExists).toBeNull()
    })

    it('should handle organization member role changes correctly', async () => {
      const member = await prisma.organizationMember.create({
        data: {
          organizationId: testOrg.id,
          userId: testUser.id,
          role: 'member',
          workingHoursPerWeek: 40
        }
      })

      // Promote to admin
      await prisma.organizationMember.update({
        where: { id: member.id },
        data: { role: 'admin' }
      })

      const updatedMember = await prisma.organizationMember.findUnique({
        where: { id: member.id }
      })

      expect(updatedMember?.role).toBe('admin')
    })
  })

  describe('Project Integration', () => {
    it('should handle project deletion with active engagements', async () => {
      const member = await prisma.organizationMember.create({
        data: {
          organizationId: testOrg.id,
          userId: testUser.id,
          role: 'member',
          workingHoursPerWeek: 40
        }
      })

      const engagement = await prisma.projectEngagement.create({
        data: {
          organizationMemberId: member.id,
          projectId: testProject.id,
          hoursPerWeek: 20,
          startDate: new Date(),
          role: 'Developer'
        }
      })

      // Delete project should cascade delete engagements
      await prisma.project.delete({
        where: { id: testProject.id }
      })

      const engagementExists = await prisma.projectEngagement.findUnique({
        where: { id: engagement.id }
      })
      expect(engagementExists).toBeNull()

      // Member should still exist
      const memberExists = await prisma.organizationMember.findUnique({
        where: { id: member.id }
      })
      expect(memberExists).not.toBeNull()
    })

    it('should calculate availability correctly with multiple project engagements', async () => {
      const member = await prisma.organizationMember.create({
        data: {
          organizationId: testOrg.id,
          userId: testUser.id,
          role: 'member',
          workingHoursPerWeek: 40
        }
      })

      const project2 = await createTestProject(testOrg.id)

      // Create multiple engagements
      await prisma.projectEngagement.createMany({
        data: [
          {
            organizationMemberId: member.id,
            projectId: testProject.id,
            hoursPerWeek: 20,
            startDate: new Date(),
            role: 'Developer'
          },
          {
            organizationMemberId: member.id,
            projectId: project2.id,
            hoursPerWeek: 15,
            startDate: new Date(),
            role: 'Tester'
          }
        ]
      })

      const memberWithEngagements = await prisma.organizationMember.findUnique({
        where: { id: member.id },
        include: {
          engagements: {
            where: { isActive: true }
          }
        }
      })

      const totalEngagedHours = memberWithEngagements?.engagements.reduce(
        (sum, eng) => sum + eng.hoursPerWeek, 0
      ) || 0

      const availableHours = (memberWithEngagements?.workingHoursPerWeek || 0) - totalEngagedHours

      expect(totalEngagedHours).toBe(35)
      expect(availableHours).toBe(5)
    })
  })

  describe('Permission System Integration', () => {
    it('should enforce permission inheritance correctly', async () => {
      // Create custom permission set
      const permissionSet = await prisma.permissionSet.create({
        data: {
          organizationId: testOrg.id,
          name: 'Custom Manager',
          permissions: {
            teamMembers: { viewAll: true, manageAll: false },
            projects: { viewAll: true, manageAll: false, viewAssigned: true, manageAssigned: true },
            invoicing: { viewAll: false, manageAll: false, viewAssigned: true, manageAssigned: false },
            clients: { viewAll: false, manageAll: false, viewAssigned: true, manageAssigned: false },
            worklogs: { manageAll: false }
          }
        }
      })

      const member = await prisma.organizationMember.create({
        data: {
          organizationId: testOrg.id,
          userId: testUser.id,
          role: 'member',
          permissionSetId: permissionSet.id,
          workingHoursPerWeek: 40
        }
      })

      const memberWithPermissions = await prisma.organizationMember.findUnique({
        where: { id: member.id },
        include: { permissionSet: true }
      })

      expect(memberWithPermissions?.permissionSet?.name).toBe('Custom Manager')
      expect(memberWithPermissions?.permissionSet?.permissions).toMatchObject({
        teamMembers: { viewAll: true, manageAll: false }
      })
    })

    it('should handle permission set deletion with member reassignment', async () => {
      const permissionSet = await prisma.permissionSet.create({
        data: {
          organizationId: testOrg.id,
          name: 'Temporary Role',
          permissions: {
            teamMembers: { viewAll: true, manageAll: false },
            projects: { viewAll: true, manageAll: false, viewAssigned: true, manageAssigned: true },
            invoicing: { viewAll: false, manageAll: false, viewAssigned: false, manageAssigned: false },
            clients: { viewAll: false, manageAll: false, viewAssigned: false, manageAssigned: false },
            worklogs: { manageAll: false }
          }
        }
      })

      const member = await prisma.organizationMember.create({
        data: {
          organizationId: testOrg.id,
          userId: testUser.id,
          role: 'member',
          permissionSetId: permissionSet.id,
          workingHoursPerWeek: 40
        }
      })

      // Delete permission set should set member's permissionSetId to null
      await prisma.permissionSet.delete({
        where: { id: permissionSet.id }
      })

      const updatedMember = await prisma.organizationMember.findUnique({
        where: { id: member.id }
      })

      expect(updatedMember?.permissionSetId).toBeNull()
    })
  })

  describe('Data Consistency', () => {
    it('should maintain data consistency across related models', async () => {
      const member = await prisma.organizationMember.create({
        data: {
          organizationId: testOrg.id,
          userId: testUser.id,
          role: 'member',
          workingHoursPerWeek: 40,
          profileData: {
            create: {
              secondaryEmail: 'test@example.com',
              visibility: { secondaryEmail: 'admin' }
            }
          },
          engagements: {
            create: {
              projectId: testProject.id,
              hoursPerWeek: 20,
              startDate: new Date(),
              role: 'Developer'
            }
          },
          timeOffEntries: {
            create: {
              type: 'vacation',
              startDate: new Date(),
              endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              status: 'approved'
            }
          }
        },
        include: {
          profileData: true,
          engagements: true,
          timeOffEntries: true
        }
      })

      expect(member.profileData).not.toBeNull()
      expect(member.engagements).toHaveLength(1)
      expect(member.timeOffEntries).toHaveLength(1)
      expect(member.engagements[0].hoursPerWeek).toBe(20)
      expect(member.timeOffEntries[0].type).toBe('vacation')
    })
  })
})