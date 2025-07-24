import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { createTestUser, createTestOrganization, createTestProject } from '@/test/factories/team-management.factory'

describe('Data Migration Scenarios and Edge Cases', () => {
  let testUser: any
  let testOrg: any
  let testProject: any

  beforeEach(async () => {
    testUser = await createTestUser()
    testOrg = await createTestOrganization(testUser.id)
    testProject = await createTestProject(testOrg.id)
  })

  afterEach(async () => {
    // Cleanup in correct order to avoid foreign key constraints
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

  describe('Legacy Data Migration', () => {
    it('should handle migration of existing organization members without team management fields', async () => {
      // Simulate legacy member without new fields
      const legacyMember = await prisma.organizationMember.create({
        data: {
          organizationId: testOrg.id,
          userId: testUser.id,
          role: 'member'
          // Missing: permissionSetId, jobTitle, workingHoursPerWeek, joinDate
        }
      })

      // Verify defaults are applied
      expect(legacyMember.permissionSetId).toBeNull()
      expect(legacyMember.jobTitle).toBeNull()
      expect(legacyMember.workingHoursPerWeek).toBe(40) // Default value
      expect(legacyMember.joinDate).toBeNull()

      // Should be able to update with new fields
      const updatedMember = await prisma.organizationMember.update({
        where: { id: legacyMember.id },
        data: {
          jobTitle: 'Developer',
          workingHoursPerWeek: 35,
          joinDate: new Date()
        }
      })

      expect(updatedMember.jobTitle).toBe('Developer')
      expect(updatedMember.workingHoursPerWeek).toBe(35)
      expect(updatedMember.joinDate).not.toBeNull()
    })

    it('should handle migration from ProjectMember to ProjectEngagement', async () => {
      const member = await prisma.organizationMember.create({
        data: {
          organizationId: testOrg.id,
          userId: testUser.id,
          role: 'member',
          workingHoursPerWeek: 40
        }
      })

      // Create engagement (new model)
      const engagement = await prisma.projectEngagement.create({
        data: {
          organizationMemberId: member.id,
          projectId: testProject.id,
          hoursPerWeek: 20,
          startDate: new Date(),
          role: 'Developer'
        }
      })

      // Verify engagement is properly linked
      const memberWithEngagements = await prisma.organizationMember.findUnique({
        where: { id: member.id },
        include: { engagements: true }
      })

      expect(memberWithEngagements?.engagements).toHaveLength(1)
      expect(memberWithEngagements?.engagements[0].role).toBe('Developer')
    })

    it('should handle bulk migration of permission sets', async () => {
      // Create multiple members with different roles
      const members = await Promise.all([
        prisma.organizationMember.create({
          data: {
            organizationId: testOrg.id,
            userId: testUser.id,
            role: 'admin',
            workingHoursPerWeek: 40
          }
        }),
        prisma.organizationMember.create({
          data: {
            organizationId: testOrg.id,
            userId: (await createTestUser()).id,
            role: 'member',
            workingHoursPerWeek: 40
          }
        })
      ])

      // Create default permission sets for migration
      const adminPermissionSet = await prisma.permissionSet.create({
        data: {
          organizationId: testOrg.id,
          name: 'Default Admin',
          isDefault: true,
          permissions: {
            teamMembers: { viewAll: true, manageAll: true },
            projects: { viewAll: true, manageAll: true, viewAssigned: true, manageAssigned: true },
            invoicing: { viewAll: true, manageAll: true, viewAssigned: true, manageAssigned: true },
            clients: { viewAll: true, manageAll: true, viewAssigned: true, manageAssigned: true },
            worklogs: { manageAll: true }
          }
        }
      })

      const memberPermissionSet = await prisma.permissionSet.create({
        data: {
          organizationId: testOrg.id,
          name: 'Default Member',
          isDefault: true,
          permissions: {
            teamMembers: { viewAll: true, manageAll: false },
            projects: { viewAll: false, manageAll: false, viewAssigned: true, manageAssigned: false },
            invoicing: { viewAll: false, manageAll: false, viewAssigned: true, manageAssigned: false },
            clients: { viewAll: false, manageAll: false, viewAssigned: true, manageAssigned: false },
            worklogs: { manageAll: false }
          }
        }
      })

      // Simulate migration: assign permission sets based on roles
      await prisma.organizationMember.updateMany({
        where: { role: 'admin', organizationId: testOrg.id },
        data: { permissionSetId: adminPermissionSet.id }
      })

      await prisma.organizationMember.updateMany({
        where: { role: 'member', organizationId: testOrg.id },
        data: { permissionSetId: memberPermissionSet.id }
      })

      // Verify migration
      const updatedMembers = await prisma.organizationMember.findMany({
        where: { organizationId: testOrg.id },
        include: { permissionSet: true }
      })

      const adminMember = updatedMembers.find(m => m.role === 'admin')
      const regularMember = updatedMembers.find(m => m.role === 'member')

      expect(adminMember?.permissionSet?.name).toBe('Default Admin')
      expect(regularMember?.permissionSet?.name).toBe('Default Member')
    })
  })

  describe('Edge Cases and Data Integrity', () => {
    it('should handle orphaned data cleanup', async () => {
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
          }
        }
      })

      // Delete member should cascade delete profile
      await prisma.organizationMember.delete({
        where: { id: member.id }
      })

      const orphanedProfile = await prisma.memberProfile.findFirst({
        where: { organizationMemberId: member.id }
      })

      expect(orphanedProfile).toBeNull()
    })

    it('should handle concurrent engagement modifications', async () => {
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

      // Simulate concurrent updates
      const updates = await Promise.allSettled([
        prisma.projectEngagement.update({
          where: { id: engagement.id },
          data: { hoursPerWeek: 25 }
        }),
        prisma.projectEngagement.update({
          where: { id: engagement.id },
          data: { role: 'Senior Developer' }
        })
      ])

      // At least one update should succeed
      const successfulUpdates = updates.filter(result => result.status === 'fulfilled')
      expect(successfulUpdates.length).toBeGreaterThan(0)
    })

    it('should handle invalid date ranges in time-off entries', async () => {
      const member = await prisma.organizationMember.create({
        data: {
          organizationId: testOrg.id,
          userId: testUser.id,
          role: 'member',
          workingHoursPerWeek: 40
        }
      })

      const startDate = new Date()
      const endDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000) // End before start

      // Should handle invalid date range gracefully
      await expect(
        prisma.timeOffEntry.create({
          data: {
            organizationMemberId: member.id,
            type: 'vacation',
            startDate: startDate,
            endDate: endDate,
            status: 'pending'
          }
        })
      ).resolves.toBeDefined() // Database allows this, validation should happen at application level
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

      const members = await Promise.all([
        prisma.organizationMember.create({
          data: {
            organizationId: testOrg.id,
            userId: testUser.id,
            role: 'member',
            permissionSetId: permissionSet.id,
            workingHoursPerWeek: 40
          }
        }),
        prisma.organizationMember.create({
          data: {
            organizationId: testOrg.id,
            userId: (await createTestUser()).id,
            role: 'member',
            permissionSetId: permissionSet.id,
            workingHoursPerWeek: 40
          }
        })
      ])

      // Delete permission set should set all members' permissionSetId to null
      await prisma.permissionSet.delete({
        where: { id: permissionSet.id }
      })

      const updatedMembers = await prisma.organizationMember.findMany({
        where: { id: { in: members.map(m => m.id) } }
      })

      updatedMembers.forEach(member => {
        expect(member.permissionSetId).toBeNull()
      })
    })

    it('should handle large dataset operations efficiently', async () => {
      // Create multiple members for performance testing
      const memberData = Array.from({ length: 50 }, (_, i) => ({
        organizationId: testOrg.id,
        userId: testUser.id,
        role: 'member' as const,
        workingHoursPerWeek: 40,
        jobTitle: `Developer ${i + 1}`
      }))

      const startTime = Date.now()
      
      // Bulk create members
      await prisma.organizationMember.createMany({
        data: memberData
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000) // 5 seconds

      // Verify all members were created
      const memberCount = await prisma.organizationMember.count({
        where: { organizationId: testOrg.id }
      })

      expect(memberCount).toBe(50)
    })
  })

  describe('Data Validation and Constraints', () => {
    it('should enforce unique constraints properly', async () => {
      const member = await prisma.organizationMember.create({
        data: {
          organizationId: testOrg.id,
          userId: testUser.id,
          role: 'member',
          workingHoursPerWeek: 40
        }
      })

      // Should not allow duplicate organization member
      await expect(
        prisma.organizationMember.create({
          data: {
            organizationId: testOrg.id,
            userId: testUser.id,
            role: 'admin',
            workingHoursPerWeek: 40
          }
        })
      ).rejects.toThrow()
    })

    it('should handle foreign key constraints correctly', async () => {
      // Should not allow engagement with non-existent project
      const member = await prisma.organizationMember.create({
        data: {
          organizationId: testOrg.id,
          userId: testUser.id,
          role: 'member',
          workingHoursPerWeek: 40
        }
      })

      await expect(
        prisma.projectEngagement.create({
          data: {
            organizationMemberId: member.id,
            projectId: 'non-existent-project-id',
            hoursPerWeek: 20,
            startDate: new Date(),
            role: 'Developer'
          }
        })
      ).rejects.toThrow()
    })
  })
})