import { describe, it, expect } from 'vitest'
import {
  hasPermission,
  hasPermissionWithContext,
  canPerformAction,
  validatePermissionDependencies,
  sanitizeInput,
  sanitizeObject,
  checkRateLimit,
  createAuditLog
} from '@/lib/permission-utils'

describe('Permission Utils', () => {
  const mockPermissionSet = {
    teamMembers: {
      viewAll: true,
      manageAll: false,
    },
    projects: {
      viewAll: false,
      manageAll: false,
      viewAssigned: true,
      manageAssigned: true,
    },
    invoicing: {
      viewAll: false,
      manageAll: false,
      viewAssigned: false,
      manageAssigned: false,
    },
    clients: {
      viewAll: false,
      manageAll: false,
      viewAssigned: false,
      manageAssigned: false,
    },
    worklogs: {
      manageAll: false,
    },
  }

  const mockMember = {
    id: 'member-123',
    organizationId: 'org-123',
    userId: 'user-123',
    role: 'member' as const,
    permissionSetId: 'perm-123',
    permissionSet: {
      id: 'perm-123',
      name: 'Custom Member',
      permissions: mockPermissionSet,
    },
  }

  const mockOwner = {
    id: 'owner-123',
    organizationId: 'org-123',
    userId: 'owner-user-123',
    role: 'owner' as const,
  }

  const mockGuest = {
    id: 'guest-123',
    organizationId: 'org-123',
    userId: 'guest-user-123',
    role: 'guest' as const,
  }

  describe('hasPermission', () => {
    it('should grant all permissions to owners', () => {
      expect(hasPermission('owner', null, 'teamMembers.manageAll')).toBe(true)
      expect(hasPermission('owner', null, 'projects.manageAll')).toBe(true)
      expect(hasPermission('owner', null, 'invoicing.manageAll')).toBe(true)
    })

    it('should restrict guest permissions', () => {
      expect(hasPermission('guest', null, 'projects.viewAssigned')).toBe(true)
      expect(hasPermission('guest', null, 'teamMembers.viewAll')).toBe(false)
      expect(hasPermission('guest', null, 'projects.manageAll')).toBe(false)
    })

    it('should check permission set permissions', () => {
      expect(hasPermission('member', mockPermissionSet, 'teamMembers.viewAll')).toBe(true)
      expect(hasPermission('member', mockPermissionSet, 'teamMembers.manageAll')).toBe(false)
      expect(hasPermission('member', mockPermissionSet, 'projects.viewAssigned')).toBe(true)
      expect(hasPermission('member', mockPermissionSet, 'projects.viewAll')).toBe(false)
    })

    it('should use default member permissions when no permission set', () => {
      expect(hasPermission('member', null, 'projects.viewAssigned')).toBe(true)
      expect(hasPermission('member', null, 'teamMembers.manageAll')).toBe(false)
    })

    it('should handle invalid permissions gracefully', () => {
      expect(hasPermission('member', mockPermissionSet, 'invalid.permission')).toBe(false)
      expect(hasPermission('member', mockPermissionSet, 'teamMembers.invalidAction')).toBe(false)
    })
  })

  describe('hasPermissionWithContext', () => {
    it('should check permissions with member context', () => {
      expect(hasPermissionWithContext(mockOwner, 'teamMembers.manageAll')).toBe(true)
      expect(hasPermissionWithContext(mockMember, 'teamMembers.viewAll')).toBe(true)
      expect(hasPermissionWithContext(mockMember, 'teamMembers.manageAll')).toBe(false)
      expect(hasPermissionWithContext(mockGuest, 'projects.viewAssigned')).toBe(true)
    })
  })

  describe('canPerformAction', () => {
    it('should allow owners to perform all actions', () => {
      expect(canPerformAction(mockOwner, 'create', 'member')).toBe(true)
      expect(canPerformAction(mockOwner, 'delete', 'project')).toBe(true)
      expect(canPerformAction(mockOwner, 'update', 'invoice')).toBe(true)
    })

    it('should check member permissions for actions', () => {
      expect(canPerformAction(mockMember, 'view', 'member')).toBe(true)
      expect(canPerformAction(mockMember, 'create', 'member')).toBe(false)
      expect(canPerformAction(mockMember, 'view', 'project', { isAssigned: true })).toBe(true)
      expect(canPerformAction(mockMember, 'view', 'project', { isAssigned: false })).toBe(false)
    })

    it('should handle resource ownership', () => {
      expect(canPerformAction(mockMember, 'view', 'project', { isOwner: true })).toBe(true)
      expect(canPerformAction(mockMember, 'update', 'project', { isOwner: true })).toBe(true)
      expect(canPerformAction(mockMember, 'delete', 'project', { isOwner: true })).toBe(false) // Still requires permission
    })

    it('should restrict guest actions', () => {
      expect(canPerformAction(mockGuest, 'view', 'project', { isAssigned: true })).toBe(true)
      expect(canPerformAction(mockGuest, 'create', 'project')).toBe(false)
      expect(canPerformAction(mockGuest, 'update', 'member')).toBe(false)
    })
  })

  describe('validatePermissionDependencies', () => {
    it('should validate correct permission dependencies', () => {
      const validPermissions = {
        teamMembers: { viewAll: true, manageAll: true },
        projects: { viewAll: true, manageAll: true, viewAssigned: true, manageAssigned: true },
        invoicing: { viewAll: false, manageAll: false, viewAssigned: false, manageAssigned: false },
        clients: { viewAll: false, manageAll: false, viewAssigned: false, manageAssigned: false },
        worklogs: { manageAll: false },
      }
      
      const errors = validatePermissionDependencies(validPermissions)
      expect(errors).toHaveLength(0)
    })

    it('should detect permission dependency violations', () => {
      const invalidPermissions = {
        teamMembers: { viewAll: false, manageAll: true },
        projects: { viewAll: false, manageAll: true, viewAssigned: false, manageAssigned: true },
        invoicing: { viewAll: false, manageAll: false, viewAssigned: false, manageAssigned: false },
        clients: { viewAll: false, manageAll: false, viewAssigned: false, manageAssigned: false },
        worklogs: { manageAll: false },
      }
      
      const errors = validatePermissionDependencies(invalidPermissions)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors).toContain('Team Members: "Manage all members" requires "View all members"')
      expect(errors).toContain('Projects: "Manage all projects" requires "View all projects"')
      expect(errors).toContain('Projects: "Manage assigned projects" requires "View assigned projects"')
    })
  })

  describe('sanitizeInput', () => {
    it('should sanitize malicious strings', () => {
      const maliciousString = '<script>alert("xss")</script>javascript:void(0)onclick=alert(1)'
      const sanitized = sanitizeInput(maliciousString)
      
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('javascript:')
      expect(sanitized).not.toContain('onclick=')
    })

    it('should handle non-string inputs', () => {
      expect(sanitizeInput(null as any)).toBe('')
      expect(sanitizeInput(undefined as any)).toBe('')
      expect(sanitizeInput(123 as any)).toBe('')
    })

    it('should limit string length', () => {
      const longString = 'a'.repeat(20000)
      const sanitized = sanitizeInput(longString)
      
      expect(sanitized.length).toBeLessThanOrEqual(10000)
    })

    it('should preserve safe content', () => {
      const safeString = 'This is a safe string with normal content.'
      const sanitized = sanitizeInput(safeString)
      
      expect(sanitized).toBe(safeString)
    })
  })

  describe('sanitizeObject', () => {
    it('should sanitize object properties', () => {
      const maliciousObject = {
        name: '<script>alert("xss")</script>',
        description: 'Normal text',
        nested: {
          field: 'javascript:void(0)',
        },
        number: 123,
        boolean: true,
      }
      
      const sanitized = sanitizeObject(maliciousObject)
      
      expect(sanitized.name).not.toContain('<script>')
      expect(sanitized.description).toBe('Normal text')
      expect(sanitized.nested.field).not.toContain('javascript:')
      expect(sanitized.number).toBe(123)
      expect(sanitized.boolean).toBe(true)
    })

    it('should handle nested objects', () => {
      const nestedObject = {
        level1: {
          level2: {
            level3: '<script>alert("deep")</script>',
          },
        },
      }
      
      const sanitized = sanitizeObject(nestedObject)
      
      expect(sanitized.level1.level2.level3).not.toContain('<script>')
    })

    it('should preserve arrays', () => {
      const objectWithArray = {
        items: ['item1', 'item2', '<script>alert("xss")</script>'],
        count: 3,
      }
      
      const sanitized = sanitizeObject(objectWithArray)
      
      expect(Array.isArray(sanitized.items)).toBe(true)
      expect(sanitized.count).toBe(3)
    })
  })

  describe('checkRateLimit', () => {
    it('should allow requests within limit', () => {
      const identifier = 'test-user-1'
      const maxRequests = 5
      const windowMs = 60000
      
      for (let i = 1; i <= maxRequests; i++) {
        const result = checkRateLimit(identifier, maxRequests, windowMs)
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(maxRequests - i)
      }
    })

    it('should block requests exceeding limit', () => {
      const identifier = 'test-user-2'
      const maxRequests = 3
      const windowMs = 60000
      
      // Use up the limit
      for (let i = 0; i < maxRequests; i++) {
        checkRateLimit(identifier, maxRequests, windowMs)
      }
      
      // Next request should be blocked
      const result = checkRateLimit(identifier, maxRequests, windowMs)
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should reset after window expires', () => {
      const identifier = 'test-user-3'
      const maxRequests = 2
      const windowMs = 100 // Short window for testing
      
      // Use up the limit
      checkRateLimit(identifier, maxRequests, windowMs)
      checkRateLimit(identifier, maxRequests, windowMs)
      
      // Should be blocked
      let result = checkRateLimit(identifier, maxRequests, windowMs)
      expect(result.allowed).toBe(false)
      
      // Wait for window to expire
      return new Promise(resolve => {
        setTimeout(() => {
          result = checkRateLimit(identifier, maxRequests, windowMs)
          expect(result.allowed).toBe(true)
          resolve(undefined)
        }, windowMs + 10)
      })
    })
  })

  describe('createAuditLog', () => {
    it('should create audit log entry', () => {
      const logEntry = createAuditLog({
        userId: 'user-123',
        organizationId: 'org-123',
        action: 'member.create',
        resourceType: 'member',
        resourceId: 'member-456',
        details: { role: 'member' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...'
      })
      
      expect(logEntry.userId).toBe('user-123')
      expect(logEntry.organizationId).toBe('org-123')
      expect(logEntry.action).toBe('member.create')
      expect(logEntry.resourceType).toBe('member')
      expect(logEntry.resourceId).toBe('member-456')
      expect(logEntry.details).toEqual({ role: 'member' })
      expect(logEntry.ipAddress).toBe('192.168.1.1')
      expect(logEntry.userAgent).toBe('Mozilla/5.0...')
      expect(logEntry.timestamp).toBeInstanceOf(Date)
    })

    it('should sanitize audit log details', () => {
      const logEntry = createAuditLog({
        userId: 'user-123',
        organizationId: 'org-123',
        action: 'member.update',
        resourceType: 'member',
        resourceId: 'member-456',
        details: { 
          name: '<script>alert("xss")</script>',
          role: 'admin'
        },
        ipAddress: '192.168.1.1'
      })
      
      expect(logEntry.details.name).not.toContain('<script>')
      expect(logEntry.details.role).toBe('admin')
    })
  })
})