import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { createTestUser, createTestOrganization } from '@/test/factories/team-management.factory'
import { checkPermission, validatePermissionDependencies } from '@/lib/permission-utils'

describe('Permission Inheritance and Dependencies', () => {
  let testUser: any
  let testOrg: any

  beforeEach(async () => {
    testUser = await createTestUser()
    testOrg = await createTestOrganization(testUser.id)
  })

  afterEach(async () => {
    await prisma.permissionSet.deleteMany()
    await prisma.organizationMember.deleteMany()
    await prisma.organization.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('Permission Dependencies', () => {
    it('should enforce that manage permissions require view permissions', () => {
      const invalidPermissions = {
        teamMembers: { viewAll: false, manageAll: true }, // Invalid: manage without view
        projects: { viewAll: true, manageAll: true, viewAssigned: true, manageAssigned: true },
        invoicing: { viewAll: false, manageAll: false, viewAssigned: false, manageAssigned: false },
        clients: { viewAll: false, manageAll: false, viewAssigned: false, manageAssigned: false },
        worklogs: { manageAll: false }
      }

      const validation = validatePermissionDependencies(invalidPermissions)
      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('teamMembers.manageAll requires teamMembers.viewAll')
    })

    it('should validate that manageAssigned requires viewAssigned', () => {
      const invalidPermissions = {
        teamMembers: { viewAll: true, manageAll: false },
        projects: { viewAll: true, manageAll: false, viewAssigned: false, manageAssigned: true }, // Invalid
        invoicing: { viewAll: false, manageAll: false, viewAssigned: false, manageAssigned: false },
        clients: { viewAll: false, manageAll: false, viewAssigned: false, manageAssigned: false },
        worklogs: { manageAll: false }
      }

      const validation = validatePermissionDependencies(invalidPermissions)
      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('projects.manageAssigned requires projects.viewAssigned')
    })

    it('should accept valid permission configurations', () => {
      const validPermissions = {
        teamMembers: { viewAll: true, manageAll: true },
        projects: { viewAll: true, manageAll: true, viewAssigned: true, manageAssigned: true },
        invoicing: { viewAll: true, manageAll: false, viewAssigned: true, manageAssigned: false },
        clients: { viewAll: false, manageAll: false, viewAssigned: true, manageAssigned: true },
        worklogs: { manageAll: true }
      }

      const validation = validatePermissionDependencies(validPermissions)
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })
  })

  describe('Permission Inheritance', () => {
    it('should inherit default permissions for members without custom permission sets', async () => {
      const member = await prisma.organizationMember.create({
        data: {
          organizationId: testOrg.id,
          userId: testUser.id,
          role: 'member',
          workingHoursPerWeek: 40
        }
      })

      // Member role should have default member permissions
      const hasViewTeamMembers = await checkPermission(member.id, 'teamMembers.viewAll')
      const hasManageTeamMembers = await checkPermission(member.id, 'teamMembers.manageAll')
      const hasViewProjects = await checkPermission(member.id, 'projects.viewAssigned')

      expect(hasViewTeamMembers).toBe(true) // Members can view team
      expect(hasManageTeamMembers).toBe(false) // Members cannot manage team
      expect(hasViewProjects).toBe(true) // Members can view assigned projects
    })

    it('should override default permissions with custom permission sets', async () => {
      const customPermissionSet = await prisma.permissionSet.create({
        data: {
          organizationId: testOrg.id,
          name: 'Limited Member',
          permissions: {
            teamMembers: { viewAll: false, manageAll: false }, // Override: no team access
            projects: { viewAll: false, manageAll: false, viewAssigned: true, manageAssigned: false },
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
          permissionSetId: customPermissionSet.id,
          workingHoursPerWeek: 40
        }
      })

      const hasViewTeamMembers = await checkPermission(member.id, 'teamMembers.viewAll')
      const hasViewProjects = await checkPermission(member.id, 'projects.viewAssigned')

      expect(hasViewTeamMembers).toBe(false) // Custom permission overrides default
      expect(hasViewProjects).toBe(true) // Still has assigned project access
    })

    it('should maintain admin privileges regardless of custom permission sets', async () => {
      const restrictivePermissionSet = await prisma.permissionSet.create({
        data: {
          organizationId: testOrg.id,
          name: 'Restrictive',
          permissions: {
            teamMembers: { viewAll: false, manageAll: false },
            projects: { viewAll: false, manageAll: false, viewAssigned: false, manageAssigned: false },
            invoicing: { viewAll: false, manageAll: false, viewAssigned: false, manageAssigned: false },
            clients: { viewAll: false, manageAll: false, viewAssigned: false, manageAssigned: false },
            worklogs: { manageAll: false }
          }
        }
      })

      const adminMember = await prisma.organizationMember.create({
        data: {
          organizationId: testOrg.id,
          userId: testUser.id,
          role: 'admin', // Admin role should override custom permissions
          permissionSetId: restrictivePermissionSet.id,
          workingHoursPerWeek: 40
        }
      })

      const hasManageTeamMembers = await checkPermission(adminMember.id, 'teamMembers.manageAll')
      const hasManageProjects = await checkPermission(adminMember.id, 'projects.manageAll')

      expect(hasManageTeamMembers).toBe(true) // Admin overrides custom restrictions
      expect(hasManageProjects).toBe(true) // Admin overrides custom restrictions
    })

    it('should maintain owner privileges as highest level', async () => {
      const ownerMember = await prisma.organizationMember.create({
        data: {
          organizationId: testOrg.id,
          userId: testUser.id,
          role: 'owner',
          workingHoursPerWeek: 40
        }
      })

      const hasAllPermissions = await Promise.all([
        checkPermission(ownerMember.id, 'teamMembers.manageAll'),
        checkPermission(ownerMember.id, 'projects.manageAll'),
        checkPermission(ownerMember.id, 'invoicing.manageAll'),
        checkPermission(ownerMember.id, 'clients.manageAll'),
        checkPermission(ownerMember.id, 'worklogs.manageAll')
      ])

      expect(hasAllPermissions.every(permission => permission)).toBe(true)
    })
  })

  describe('Permission Validation Edge Cases', () => {
    it('should handle missing permission properties gracefully', () => {
      const incompletePermissions = {
        teamMembers: { viewAll: true }, // Missing manageAll
        projects: { viewAll: true, manageAll: true }, // Missing viewAssigned, manageAssigned
        // Missing other sections
      } as any

      const validation = validatePermissionDependencies(incompletePermissions)
      expect(validation.isValid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })

    it('should validate permission set creation with dependencies', async () => {
      const invalidPermissionSet = {
        organizationId: testOrg.id,
        name: 'Invalid Set',
        permissions: {
          teamMembers: { viewAll: false, manageAll: true }, // Invalid dependency
          projects: { viewAll: true, manageAll: false, viewAssigned: true, manageAssigned: true },
          invoicing: { viewAll: false, manageAll: false, viewAssigned: false, manageAssigned: false },
          clients: { viewAll: false, manageAll: false, viewAssigned: false, manageAssigned: false },
          worklogs: { manageAll: false }
        }
      }

      // Should throw error due to invalid dependencies
      await expect(
        prisma.permissionSet.create({ data: invalidPermissionSet })
      ).rejects.toThrow()
    })
  })
})