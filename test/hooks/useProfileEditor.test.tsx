/**
 * @fileoverview Tests for profile editor state management hooks
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

import { useProfileEditor, useAvatarConfig } from '@/hooks/useProfileEditor'

// Mock dependencies
vi.mock('@/hooks/useMemberProfile', () => ({
  useMemberProfile: vi.fn(() => ({
    profile: {
      id: 'profile-1',
      organizationMemberId: 'member-1',
      secondaryEmail: 'test@example.com',
      address: '123 Test St',
      phone: '+1234567890',
      linkedin: 'https://linkedin.com/in/test',
      skype: 'test.skype',
      twitter: '@test',
      birthday: '1990-01-01',
      maritalStatus: 'Single',
      family: 'Test family',
      other: 'Other info',
      visibility: {},
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    isLoading: false,
    updateProfile: vi.fn().mockResolvedValue({}),
    validateProfileData: vi.fn(() => []),
    error: null
  }))
}))

vi.mock('@/lib/aws/s3', () => ({
  uploadAvatarToS3: vi.fn().mockResolvedValue({
    url: 'https://example.com/avatar.jpg',
    filename: 'avatar.jpg',
    key: 'avatars/user-1/avatar.jpg'
  }),
  deleteFileFromS3ByUrl: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('@/lib/avatar-utils', () => ({
  generateCachedAvatarConfig: vi.fn(() => ({
    seed: 'test@example.com',
    config: { hair: 'short', eyes: 'blue' },
    generatedAt: new Date(),
    version: '1.0'
  })),
  clearAvatarCache: vi.fn(),
  getFallbackSeed: vi.fn((seed, ...fallbacks) => {
    if (seed && seed.trim()) return seed.trim().toLowerCase()
    for (const fallback of fallbacks) {
      if (fallback && fallback.trim()) return fallback.trim().toLowerCase()
    }
    return 'default-user'
  })
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}))

// Test wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useProfileEditor', () => {
  let wrapper: ReturnType<typeof createWrapper>

  beforeEach(() => {
    wrapper = createWrapper()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with profile data', async () => {
    const { result } = renderHook(
      () => useProfileEditor('org-1', 'member-1', 'user-1'),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.state.formData.secondaryEmail).toBe('test@example.com')
      expect(result.current.state.formData.address).toBe('123 Test St')
      expect(result.current.state.formData.phone).toBe('+1234567890')
    })
  })

  it('should update form fields correctly', async () => {
    const { result } = renderHook(
      () => useProfileEditor('org-1', 'member-1', 'user-1'),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.state.formData.secondaryEmail).toBe('test@example.com')
    })

    act(() => {
      result.current.updateField('secondaryEmail', 'new@example.com')
    })

    expect(result.current.state.formData.secondaryEmail).toBe('new@example.com')
    expect(result.current.state.hasUnsavedChanges).toBe(true)
    expect(result.current.state.isDirty).toBe(true)
  })

  it('should validate form data correctly', async () => {
    const { result } = renderHook(
      () => useProfileEditor('org-1', 'member-1', 'user-1'),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.state.formData.secondaryEmail).toBe('test@example.com')
    })

    // Test invalid email
    act(() => {
      result.current.updateField('secondaryEmail', 'invalid-email')
    })

    act(() => {
      const isValid = result.current.validateForm()
      expect(isValid).toBe(false)
      expect(result.current.state.formErrors.secondaryEmail).toBe('Invalid email format')
    })

    // Test valid email
    act(() => {
      result.current.updateField('secondaryEmail', 'valid@example.com')
    })

    act(() => {
      const isValid = result.current.validateForm()
      expect(isValid).toBe(true)
      expect(result.current.state.formErrors.secondaryEmail).toBeUndefined()
    })
  })

  it('should reset form to original state', async () => {
    const { result } = renderHook(
      () => useProfileEditor('org-1', 'member-1', 'user-1'),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.state.formData.secondaryEmail).toBe('test@example.com')
    })

    // Make changes
    act(() => {
      result.current.updateField('secondaryEmail', 'changed@example.com')
    })

    expect(result.current.state.formData.secondaryEmail).toBe('changed@example.com')
    expect(result.current.state.hasUnsavedChanges).toBe(true)

    // Reset form
    act(() => {
      result.current.resetForm()
    })

    expect(result.current.state.formData.secondaryEmail).toBe('test@example.com')
    expect(result.current.state.hasUnsavedChanges).toBe(false)
  })

  it('should handle avatar upload', async () => {
    const { result } = renderHook(
      () => useProfileEditor('org-1', 'member-1', 'user-1'),
      { wrapper }
    )

    const mockFile = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' })

    await act(async () => {
      const uploadResult = await result.current.uploadAvatar(mockFile)
      expect(uploadResult.url).toBe('https://example.com/avatar.jpg')
    })
  })
})

describe('useAvatarConfig', () => {
  let wrapper: ReturnType<typeof createWrapper>

  beforeEach(() => {
    wrapper = createWrapper()
    vi.clearAllMocks()
  })

  it('should generate avatar configuration', async () => {
    const { result } = renderHook(
      () => useAvatarConfig('test@example.com'),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.avatarConfig).toBeDefined()
      expect(result.current.avatarConfig?.seed).toBe('test@example.com')
      expect(result.current.avatarConfig?.config).toBeDefined()
    })
  })

  it('should use fallback seed when primary seed is invalid', async () => {
    const { result } = renderHook(
      () => useAvatarConfig('', {
        fallbackSeeds: ['fallback@example.com']
      }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.effectiveSeed).toBe('fallback@example.com')
    })
  })

  it('should refresh configuration', async () => {
    const { result } = renderHook(
      () => useAvatarConfig('test@example.com'),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.avatarConfig).toBeDefined()
    })

    act(() => {
      result.current.refreshConfig()
    })

    // Should trigger a refetch
    expect(result.current.isLoading).toBe(false) // Since we're using mocked data
  })
})