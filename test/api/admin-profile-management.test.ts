import { NextRequest } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST, GET } from '@/app/api/organizations/[id]/admin/profiles/route'
import { POST as ResetAvatarPOST } from '@/app/api/organizations/[id]/admin/profiles/[memberId]/avatar/reset/route'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { validatePermission, logAuditEvent } from '@/lib/permission-utils'
import { deleteFileFromS3ByUrl } from '@/lib/aws/s3'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    organizationMember: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
    memberProfile: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth-utils')
vi.mock('@/lib/permission-utils')
vi.mock('@/lib/aws/s3')
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({}),
}))
vi.mock('@/lib/validation-schemas', () => ({
  validateUUID: vi.fn().mockReturnValue({ valid: true }),
}))

const mockGetCurrentUser = vi.mocked(getCurrentUser)
const mockValidatePermission = vi.mocked(validatePermission)
const mockLogAuditEvent = vi.mocked(logAuditEvent)
const mockDeleteFileFromS3ByUrl = vi.mocked(deleteFileFromS3ByUrl)

const mockUser = {
  id: 'admin-user-id',
  email: 'admin@example.com',
  user_metadata: { full_name: 'Admin User' },
}

const mockMembers = [
  {
    id: 'member-1',
    organizationId: 'org-1',
    userId: 'user-1',
    role: 'member',
    user: {
      id: 'user-1',
      email: 'user1@example.com',
      fullName: 'User One',
      avatarUrl: 'https://example.com/avatar1.jpg',
    },
  },
  {
    id: 'member-2',
    organizationId: 'org-1',
    userId: 'user-2',
    role: 'member',
    user: {
      id: 'user-2',
      email: 'user2@example.com',
      fullName: 'User Two',
      avatarUrl: null,
    },
  },
]

describe('/api/organizations/[id]/admin/profiles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCurrentUser.mockResolvedValue(mockUser as any)
    mockValidatePermission.mockResolvedValue({
      hasPermission: true,
      member: {
        id: 'admin-member-id',
        organizationId: 'org-1',
        userId: 'admin-user-id',
        role: 'admin',
      } as any,
    })
    mockLogAuditEvent.mockResolvedValue()
  })

  describe('POST - Bulk Operations', () => {
    it('successfully resets avatars for multiple members', async () => {
      const mockPrisma = prisma as any
      mockPrisma.organizationMember.findMany.mockResolvedValue(mockMembers)
      mockPrisma.user.update.mockResolvedValue({ avatarUrl: null })
      mockDeleteFileFromS3ByUrl.mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost/api/organizations/org-1/admin/profiles', {
        method: 'POST',
        body: JSON.stringify({
          action: 'reset_avatars',
          memberIds: ['member-1', 'member-2'],
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: { id: 'org-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.action).toBe('reset_avatars')
      expect(data.summary.total).toBe(2)
      expect(data.summary.successful).toBe(2)
      expect(data.summary.failed).toBe(0)

      // Verify S3 deletion was called for member with avatar
      expect(mockDeleteFileFromS3ByUrl).toHaveBeenCalledWith('https://example.com/avatar1.jpg')
      
      // Verify database updates
      expect(mockPrisma.user.update).toHaveBeenCalledTimes(2)
      
      // Verify audit logging
      expect(mockLogAuditEvent).toHaveBeenCalledTimes(3) // 2 individual + 1 bulk
    })

    it('handles partial failures in bulk avatar reset', async () => {
      const mockPrisma = prisma as any
      mockPrisma.organizationMember.findMany.mockResolvedValue(mockMembers)
      mockPrisma.user.update
        .mockResolvedValueOnce({ avatarUrl: null })
        .mockRejectedValueOnce(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/organizations/org-1/admin/profiles', {
        method: 'POST',
        body: JSON.stringify({
          action: 'reset_avatars',
          memberIds: ['member-1', 'member-2'],
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: { id: 'org-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.summary.successful).toBe(1)
      expect(data.summary.failed).toBe(1)
      expect(data.results).toHaveLength(2)
      expect(data.results[0].success).toBe(true)
      expect(data.results[1].success).toBe(false)
    })

    it('updates visibility settings for multiple members', async () => {
      const mockPrisma = prisma as any
      mockPrisma.organizationMember.findMany.mockResolvedValue(mockMembers)
      mockPrisma.memberProfile.findUnique.mockResolvedValue(null)
      mockPrisma.memberProfile.create.mockResolvedValue({
        id: 'profile-id',
        visibility: { phone: 'admin', email: 'public' },
      })

      const request = new NextRequest('http://localhost/api/organizations/org-1/admin/profiles', {
        method: 'POST',
        body: JSON.stringify({
          action: 'update_visibility',
          memberIds: ['member-1', 'member-2'],
          options: {
            visibility: { phone: 'admin', email: 'public' },
          },
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: { id: 'org-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.action).toBe('update_visibility')
      expect(data.summary.successful).toBe(2)

      // Verify profile creation
      expect(mockPrisma.memberProfile.create).toHaveBeenCalledTimes(2)
    })

    it('exports profile data', async () => {
      const mockPrisma = prisma as any
      const mockProfileData = [
        {
          id: 'profile-1',
          secondaryEmail: 'secondary@example.com',
          phone: '+1234567890',
          organizationMember: mockMembers[0],
        },
      ]
      
      mockPrisma.organizationMember.findMany.mockResolvedValue(mockMembers)
      mockPrisma.memberProfile.findMany.mockResolvedValue(mockProfileData)

      const request = new NextRequest('http://localhost/api/organizations/org-1/admin/profiles', {
        method: 'POST',
        body: JSON.stringify({
          action: 'export_profiles',
          memberIds: ['member-1'],
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: { id: 'org-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.action).toBe('export_profiles')
      expect(data.data).toEqual(mockProfileData)
      expect(data.summary.exported).toBe(1)

      // Verify audit logging for export
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        'org-1',
        'admin-user-id',
        'export_member_profiles',
        'member',
        undefined,
        expect.objectContaining({
          exportedMemberCount: 1,
          exportedMemberIds: ['member-1'],
        }),
        expect.any(Object)
      )
    })

    it('returns 403 when user lacks permissions', async () => {
      mockValidatePermission.mockResolvedValue({
        hasPermission: false,
        error: 'Insufficient permissions',
      })

      const request = new NextRequest('http://localhost/api/organizations/org-1/admin/profiles', {
        method: 'POST',
        body: JSON.stringify({
          action: 'reset_avatars',
          memberIds: ['member-1'],
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: { id: 'org-1' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Insufficient permissions')
    })

    it('validates request data', async () => {
      const request = new NextRequest('http://localhost/api/organizations/org-1/admin/profiles', {
        method: 'POST',
        body: JSON.stringify({
          action: 'invalid_action',
          memberIds: ['not-a-uuid'],
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: { id: 'org-1' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
    })

    it('returns 404 when members not found', async () => {
      const mockPrisma = prisma as any
      mockPrisma.organizationMember.findMany.mockResolvedValue([]) // No members found

      const request = new NextRequest('http://localhost/api/organizations/org-1/admin/profiles', {
        method: 'POST',
        body: JSON.stringify({
          action: 'reset_avatars',
          memberIds: ['member-1'],
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request, { params: { id: 'org-1' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Some members not found in organization')
    })
  })

  describe('GET - Profile Overview', () => {
    it('returns profile statistics', async () => {
      const mockPrisma = prisma as any
      mockPrisma.organizationMember.count
        .mockResolvedValueOnce(10) // total members
        .mockResolvedValueOnce(6)  // members with avatars
      mockPrisma.memberProfile.count
        .mockResolvedValueOnce(8)  // members with profiles
        .mockResolvedValueOnce(3)  // recent updates
      mockPrisma.organizationMember.groupBy.mockResolvedValue([
        { role: 'admin', _count: { role: 2 } },
        { role: 'member', _count: { role: 8 } },
      ])

      const request = new NextRequest('http://localhost/api/organizations/org-1/admin/profiles')
      const response = await GET(request, { params: { id: 'org-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.statistics).toEqual({
        totalMembers: 10,
        membersWithAvatars: 6,
        membersWithProfiles: 8,
        recentProfileUpdates: 3,
        avatarCompletionRate: 60,
        profileCompletionRate: 80,
      })
      expect(data.roleDistribution).toEqual([
        { role: 'admin', count: 2 },
        { role: 'member', count: 8 },
      ])
    })

    it('returns 403 when user lacks permissions', async () => {
      mockValidatePermission.mockResolvedValue({
        hasPermission: false,
        error: 'Insufficient permissions',
      })

      const request = new NextRequest('http://localhost/api/organizations/org-1/admin/profiles')
      const response = await GET(request, { params: { id: 'org-1' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Insufficient permissions')
    })
  })
})

describe('/api/organizations/[id]/admin/profiles/[memberId]/avatar/reset', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCurrentUser.mockResolvedValue(mockUser as any)
    mockValidatePermission.mockResolvedValue({
      hasPermission: true,
      member: {
        id: 'admin-member-id',
        organizationId: 'org-1',
        userId: 'admin-user-id',
        role: 'admin',
      } as any,
    })
    mockLogAuditEvent.mockResolvedValue()
  })

  it('successfully resets individual member avatar', async () => {
    const mockPrisma = prisma as any
    const memberWithAvatar = {
      id: 'member-1',
      organizationId: 'org-1',
      user: {
        id: 'user-1',
        email: 'user1@example.com',
        fullName: 'User One',
        avatarUrl: 'https://example.com/avatar1.jpg',
      },
    }
    
    mockPrisma.organizationMember.findUnique.mockResolvedValue(memberWithAvatar)
    mockPrisma.user.update.mockResolvedValue({
      ...memberWithAvatar.user,
      avatarUrl: null,
    })
    mockDeleteFileFromS3ByUrl.mockResolvedValue(undefined)

    const request = new NextRequest(
      'http://localhost/api/organizations/org-1/admin/profiles/member-1/avatar/reset',
      { method: 'POST' }
    )

    const response = await ResetAvatarPOST(request, {
      params: { id: 'org-1', memberId: 'member-1' }
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBe('Avatar reset successfully')
    expect(data.member.user.avatarUrl).toBe(null)

    // Verify S3 deletion
    expect(mockDeleteFileFromS3ByUrl).toHaveBeenCalledWith('https://example.com/avatar1.jpg')
    
    // Verify database update
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { avatarUrl: null },
      select: expect.any(Object),
    })

    // Verify audit logging
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      'org-1',
      'admin-user-id',
      'admin_reset_member_avatar',
      'member',
      'member-1',
      expect.objectContaining({
        targetUserId: 'user-1',
        previousAvatarUrl: 'https://example.com/avatar1.jpg',
        resetBy: 'admin',
      }),
      expect.any(Object)
    )
  })

  it('returns 400 when member has no avatar to reset', async () => {
    const mockPrisma = prisma as any
    const memberWithoutAvatar = {
      id: 'member-2',
      organizationId: 'org-1',
      user: {
        id: 'user-2',
        email: 'user2@example.com',
        fullName: 'User Two',
        avatarUrl: null,
      },
    }
    
    mockPrisma.organizationMember.findUnique.mockResolvedValue(memberWithoutAvatar)

    const request = new NextRequest(
      'http://localhost/api/organizations/org-1/admin/profiles/member-2/avatar/reset',
      { method: 'POST' }
    )

    const response = await ResetAvatarPOST(request, {
      params: { id: 'org-1', memberId: 'member-2' }
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Member does not have a custom avatar to reset')
  })

  it('returns 404 when member not found', async () => {
    const mockPrisma = prisma as any
    mockPrisma.organizationMember.findUnique.mockResolvedValue(null)

    const request = new NextRequest(
      'http://localhost/api/organizations/org-1/admin/profiles/member-1/avatar/reset',
      { method: 'POST' }
    )

    const response = await ResetAvatarPOST(request, {
      params: { id: 'org-1', memberId: 'member-1' }
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Member not found')
  })

  it('continues with database update even if S3 deletion fails', async () => {
    const mockPrisma = prisma as any
    const memberWithAvatar = {
      id: 'member-1',
      organizationId: 'org-1',
      user: {
        id: 'user-1',
        email: 'user1@example.com',
        fullName: 'User One',
        avatarUrl: 'https://example.com/avatar1.jpg',
      },
    }
    
    mockPrisma.organizationMember.findUnique.mockResolvedValue(memberWithAvatar)
    mockPrisma.user.update.mockResolvedValue({
      ...memberWithAvatar.user,
      avatarUrl: null,
    })
    mockDeleteFileFromS3ByUrl.mockRejectedValue(new Error('S3 error'))

    const request = new NextRequest(
      'http://localhost/api/organizations/org-1/admin/profiles/member-1/avatar/reset',
      { method: 'POST' }
    )

    const response = await ResetAvatarPOST(request, {
      params: { id: 'org-1', memberId: 'member-1' }
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    
    // Verify database update still happened
    expect(mockPrisma.user.update).toHaveBeenCalled()
  })
})