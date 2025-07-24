import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, DELETE } from '@/app/api/organizations/[id]/members/[memberId]/avatar/route'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { uploadAvatarToS3, deleteFileFromS3ByUrl } from '@/lib/aws/s3'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    organizationMember: {
      findUnique: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth-utils', () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('@/lib/aws/s3', () => ({
  uploadAvatarToS3: vi.fn(),
  deleteFileFromS3ByUrl: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({})),
}))

describe('Avatar Upload API', () => {
  const mockParams = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    memberId: '123e4567-e89b-12d3-a456-426614174001',
  }

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174002',
    email: 'test@example.com',
    fullName: 'Test User',
  }

  const mockCurrentMember = {
    id: mockParams.memberId,
    role: 'member',
    organizationId: mockParams.id,
    userId: mockUser.id,
    permissionSet: null,
  }

  const mockTargetMember = {
    id: mockParams.memberId,
    organizationId: mockParams.id,
    user: {
      id: mockUser.id,
      email: mockUser.email,
      fullName: mockUser.fullName,
      avatarUrl: null,
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.organizationMember.findUnique)
      .mockResolvedValueOnce(mockCurrentMember)
      .mockResolvedValueOnce(mockTargetMember)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /avatar', () => {
    it('should upload avatar successfully', async () => {
      // Mock file
      const mockFile = new File(['test content'], 'avatar.jpg', { type: 'image/jpeg' })
      Object.defineProperty(mockFile, 'size', { value: 1024 * 1024 }) // 1MB

      // Mock form data
      const formData = new FormData()
      formData.append('avatar', mockFile)

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: formData,
      })

      // Mock S3 upload
      const mockUploadResult = {
        url: 'https://bucket.s3.region.amazonaws.com/avatars/user-id/avatar.jpg',
        filename: 'avatar.jpg',
        key: 'avatars/user-id/avatar.jpg',
      }
      vi.mocked(uploadAvatarToS3).mockResolvedValue(mockUploadResult)

      // Mock database update
      const mockUpdatedUser = {
        ...mockUser,
        avatarUrl: mockUploadResult.url,
      }
      vi.mocked(prisma.user.update).mockResolvedValue(mockUpdatedUser)

      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.user.avatarUrl).toBe(mockUploadResult.url)
      expect(responseData.avatar.url).toBe(mockUploadResult.url)
      expect(responseData.avatar.filename).toBe(mockUploadResult.filename)
      expect(responseData.avatar.size).toBe(mockFile.size)
      expect(responseData.avatar.type).toBe(mockFile.type)
    })

    it('should reject invalid file type', async () => {
      const mockFile = new File(['test content'], 'document.pdf', { type: 'application/pdf' })
      const formData = new FormData()
      formData.append('avatar', mockFile)

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toContain('Invalid file type')
    })

    it('should reject file size exceeding limit', async () => {
      const mockFile = new File(['test content'], 'large-avatar.jpg', { type: 'image/jpeg' })
      Object.defineProperty(mockFile, 'size', { value: 6 * 1024 * 1024 }) // 6MB

      const formData = new FormData()
      formData.append('avatar', mockFile)

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toContain('File size exceeds 5MB limit')
    })

    it('should reject request without file', async () => {
      const formData = new FormData()
      // No file added

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('No file provided')
    })

    it('should deny access for non-owner/admin editing other profiles', async () => {
      // Mock different user trying to edit another user's profile
      const differentUser = {
        id: '123e4567-e89b-12d3-a456-426614174999',
        email: 'different@example.com',
        fullName: 'Different User',
      }

      const differentMember = {
        id: '123e4567-e89b-12d3-a456-426614174998',
        role: 'member',
        organizationId: mockParams.id,
        userId: differentUser.id,
        permissionSet: null,
      }

      vi.mocked(getCurrentUser).mockResolvedValue(differentUser)
      vi.mocked(prisma.organizationMember.findUnique)
        .mockResolvedValueOnce(differentMember)
        .mockResolvedValueOnce(mockTargetMember)

      const mockFile = new File(['test content'], 'avatar.jpg', { type: 'image/jpeg' })
      const formData = new FormData()
      formData.append('avatar', mockFile)

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(403)
      expect(responseData.error).toBe('Access denied: Cannot edit this profile')
    })
  })

  describe('DELETE /avatar', () => {
    it('should delete avatar successfully', async () => {
      // Mock target member with existing avatar
      const memberWithAvatar = {
        ...mockTargetMember,
        user: {
          ...mockTargetMember.user,
          avatarUrl: 'https://bucket.s3.region.amazonaws.com/avatars/user-id/old-avatar.jpg',
        },
      }

      vi.mocked(prisma.organizationMember.findUnique)
        .mockResolvedValueOnce(mockCurrentMember)
        .mockResolvedValueOnce(memberWithAvatar)

      // Mock database update
      const mockUpdatedUser = {
        ...mockUser,
        avatarUrl: null,
      }
      vi.mocked(prisma.user.update).mockResolvedValue(mockUpdatedUser)

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.user.avatarUrl).toBe(null)
      expect(responseData.message).toBe('Avatar deleted successfully')
      expect(deleteFileFromS3ByUrl).toHaveBeenCalledWith(memberWithAvatar.user.avatarUrl)
    })

    it('should return error when no avatar to delete', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('No avatar to delete')
    })

    it('should handle S3 deletion errors gracefully', async () => {
      // Mock target member with existing avatar
      const memberWithAvatar = {
        ...mockTargetMember,
        user: {
          ...mockTargetMember.user,
          avatarUrl: 'https://bucket.s3.region.amazonaws.com/avatars/user-id/old-avatar.jpg',
        },
      }

      vi.mocked(prisma.organizationMember.findUnique)
        .mockResolvedValueOnce(mockCurrentMember)
        .mockResolvedValueOnce(memberWithAvatar)

      // Mock S3 deletion failure
      vi.mocked(deleteFileFromS3ByUrl).mockRejectedValue(new Error('S3 deletion failed'))

      // Mock database update (should still succeed)
      const mockUpdatedUser = {
        ...mockUser,
        avatarUrl: null,
      }
      vi.mocked(prisma.user.update).mockResolvedValue(mockUpdatedUser)

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.user.avatarUrl).toBe(null)
    })
  })

  describe('Validation', () => {
    it('should validate organization ID format', async () => {
      const invalidParams = {
        id: 'invalid-uuid',
        memberId: mockParams.memberId,
      }

      const mockFile = new File(['test content'], 'avatar.jpg', { type: 'image/jpeg' })
      const formData = new FormData()
      formData.append('avatar', mockFile)

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request, { params: invalidParams })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toContain('Invalid Organization ID format')
    })

    it('should validate member ID format', async () => {
      const invalidParams = {
        id: mockParams.id,
        memberId: 'invalid-uuid',
      }

      const mockFile = new File(['test content'], 'avatar.jpg', { type: 'image/jpeg' })
      const formData = new FormData()
      formData.append('avatar', mockFile)

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request, { params: invalidParams })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toContain('Invalid Member ID format')
    })
  })

  describe('Permission scenarios', () => {
    it('should allow admin to edit member avatar', async () => {
      const adminMember = {
        ...mockCurrentMember,
        role: 'admin',
      }

      vi.mocked(prisma.organizationMember.findUnique)
        .mockResolvedValueOnce(adminMember)
        .mockResolvedValueOnce(mockTargetMember)

      const mockFile = new File(['test content'], 'avatar.jpg', { type: 'image/jpeg' })
      Object.defineProperty(mockFile, 'size', { value: 1024 * 1024 }) // 1MB

      const formData = new FormData()
      formData.append('avatar', mockFile)

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: formData,
      })

      const mockUploadResult = {
        url: 'https://bucket.s3.region.amazonaws.com/avatars/user-id/avatar.jpg',
        filename: 'avatar.jpg',
        key: 'avatars/user-id/avatar.jpg',
      }
      vi.mocked(uploadAvatarToS3).mockResolvedValue(mockUploadResult)

      const mockUpdatedUser = {
        ...mockUser,
        avatarUrl: mockUploadResult.url,
      }
      vi.mocked(prisma.user.update).mockResolvedValue(mockUpdatedUser)

      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
    })

    it('should allow owner to edit any avatar', async () => {
      const ownerMember = {
        ...mockCurrentMember,
        role: 'owner',
      }

      vi.mocked(prisma.organizationMember.findUnique)
        .mockResolvedValueOnce(ownerMember)
        .mockResolvedValueOnce(mockTargetMember)

      const mockFile = new File(['test content'], 'avatar.jpg', { type: 'image/jpeg' })
      Object.defineProperty(mockFile, 'size', { value: 1024 * 1024 }) // 1MB

      const formData = new FormData()
      formData.append('avatar', mockFile)

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: formData,
      })

      const mockUploadResult = {
        url: 'https://bucket.s3.region.amazonaws.com/avatars/user-id/avatar.jpg',
        filename: 'avatar.jpg',
        key: 'avatars/user-id/avatar.jpg',
      }
      vi.mocked(uploadAvatarToS3).mockResolvedValue(mockUploadResult)

      const mockUpdatedUser = {
        ...mockUser,
        avatarUrl: mockUploadResult.url,
      }
      vi.mocked(prisma.user.update).mockResolvedValue(mockUpdatedUser)

      const response = await POST(request, { params: mockParams })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
    })
  })
})