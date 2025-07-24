import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkUserExistsByEmail, checkMultipleUsersExist, UserExistenceResponse } from '@/lib/user-existence-utils'
import { prisma } from '@/lib/prisma'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    }
  }
}))

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn()
    }
  }))
}))

describe('user-existence-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkUserExistsByEmail', () => {
    it('should return exists: true when user is found in database', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        fullName: 'Test User',
        avatarUrl: null
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)

      const result = await checkUserExistsByEmail('test@example.com')

      expect(result).toEqual({
        exists: true,
        user: mockUser
      })
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true
        }
      })
    })

    it('should return exists: false when user is not found in database', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const result = await checkUserExistsByEmail('nonexistent@example.com')

      expect(result).toEqual({
        exists: false,
        user: null
      })
    })

    it('should return error for invalid email format', async () => {
      const result = await checkUserExistsByEmail('invalid-email')

      expect(result).toEqual({
        exists: false,
        error: 'Invalid email format'
      })
      expect(prisma.user.findUnique).not.toHaveBeenCalled()
    })

    it('should return error for empty email', async () => {
      const result = await checkUserExistsByEmail('')

      expect(result).toEqual({
        exists: false,
        error: 'Invalid email format'
      })
      expect(prisma.user.findUnique).not.toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database connection failed'))

      const result = await checkUserExistsByEmail('test@example.com')

      expect(result).toEqual({
        exists: false,
        error: 'Failed to check user existence'
      })
    })

    it('should handle network errors gracefully', async () => {
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('network timeout'))

      const result = await checkUserExistsByEmail('test@example.com')

      expect(result).toEqual({
        exists: false,
        error: 'Network error while checking user existence'
      })
    })
  })

  describe('checkMultipleUsersExist', () => {
    it('should check multiple users and return correct results', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          fullName: 'User One',
          avatarUrl: null
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          fullName: 'User Two',
          avatarUrl: null
        }
      ]

      vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers)

      const emails = ['user1@example.com', 'user2@example.com', 'nonexistent@example.com']
      const results = await checkMultipleUsersExist(emails)

      expect(results.size).toBe(3)
      expect(results.get('user1@example.com')).toEqual({
        exists: true,
        user: mockUsers[0]
      })
      expect(results.get('user2@example.com')).toEqual({
        exists: true,
        user: mockUsers[1]
      })
      expect(results.get('nonexistent@example.com')).toEqual({
        exists: false,
        user: null
      })
    })

    it('should handle invalid emails in batch check', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([])

      const emails = ['valid@example.com', 'invalid-email', '']
      const results = await checkMultipleUsersExist(emails)

      expect(results.size).toBe(3)
      expect(results.get('valid@example.com')).toEqual({
        exists: false,
        user: null
      })
      expect(results.get('invalid-email')).toEqual({
        exists: false,
        error: 'Invalid email format'
      })
      expect(results.get('')).toEqual({
        exists: false,
        error: 'Invalid email format'
      })
    })

    it('should handle database errors in batch check', async () => {
      vi.mocked(prisma.user.findMany).mockRejectedValue(new Error('Database error'))

      const emails = ['user1@example.com', 'user2@example.com']
      const results = await checkMultipleUsersExist(emails)

      expect(results.size).toBe(2)
      expect(results.get('user1@example.com')).toEqual({
        exists: false,
        error: 'Failed to check user existence'
      })
      expect(results.get('user2@example.com')).toEqual({
        exists: false,
        error: 'Failed to check user existence'
      })
    })

    it('should handle empty email array', async () => {
      const results = await checkMultipleUsersExist([])
      expect(results.size).toBe(0)
      expect(prisma.user.findMany).not.toHaveBeenCalled()
    })

    it('should handle mixed valid and invalid emails efficiently', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'valid@example.com',
          fullName: 'Valid User',
          avatarUrl: null
        }
      ]

      vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers)

      const emails = ['valid@example.com', 'invalid-email', '', 'another@example.com']
      const results = await checkMultipleUsersExist(emails)

      expect(results.size).toBe(4)
      expect(results.get('valid@example.com')).toEqual({
        exists: true,
        user: mockUsers[0]
      })
      expect(results.get('invalid-email')).toEqual({
        exists: false,
        error: 'Invalid email format'
      })
      expect(results.get('')).toEqual({
        exists: false,
        error: 'Invalid email format'
      })
      expect(results.get('another@example.com')).toEqual({
        exists: false,
        user: null
      })

      // Should only query valid emails
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          email: {
            in: ['valid@example.com', 'another@example.com']
          }
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true
        }
      })
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle null email gracefully', async () => {
      const result = await checkUserExistsByEmail(null as any)
      expect(result).toEqual({
        exists: false,
        error: 'Invalid email format'
      })
    })

    it('should handle undefined email gracefully', async () => {
      const result = await checkUserExistsByEmail(undefined as any)
      expect(result).toEqual({
        exists: false,
        error: 'Invalid email format'
      })
    })

    it('should handle whitespace-only email', async () => {
      const result = await checkUserExistsByEmail('   ')
      expect(result).toEqual({
        exists: false,
        error: 'Invalid email format'
      })
    })

    it('should handle email with special characters', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test+special@example.com',
        fullName: 'Test User',
        avatarUrl: null
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)

      const result = await checkUserExistsByEmail('test+special@example.com')
      expect(result).toEqual({
        exists: true,
        user: mockUser
      })
    })

    it('should handle very long email addresses', async () => {
      const longEmail = 'a'.repeat(50) + '@' + 'b'.repeat(50) + '.com'
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const result = await checkUserExistsByEmail(longEmail)
      expect(result).toEqual({
        exists: false,
        user: null
      })
    })

    it('should handle case sensitivity correctly', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'Test@Example.Com',
        fullName: 'Test User',
        avatarUrl: null
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)

      const result = await checkUserExistsByEmail('Test@Example.Com')
      expect(result).toEqual({
        exists: true,
        user: mockUser
      })
    })
  })
})