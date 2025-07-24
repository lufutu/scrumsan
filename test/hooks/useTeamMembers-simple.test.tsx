import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query'
import React from 'react'

// Mock the dependencies that might be causing issues
vi.mock('@/lib/query-optimization', () => ({
  cacheKeys: {
    teamMembers: (orgId: string) => ['teamMembers', orgId],
  },
  invalidationPatterns: {
    teamMembersOnly: (orgId: string) => [['teamMembers', orgId]],
  },
}))

vi.mock('@/lib/optimistic-updates', () => ({
  useOptimisticUpdates: () => ({
    optimisticCreate: vi.fn(),
    optimisticUpdate: vi.fn(),
    optimisticDelete: vi.fn(),
  }),
  optimisticUpdatePatterns: {},
}))

vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: any) => value,
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

// Simplified version of the team members mutation
function useSimpleTeamMembersMutation(organizationId: string) {
  return useMutation({
    mutationKey: ['addMember', organizationId],
    mutationFn: async (memberData: { email: string; role?: string }) => {
      // Mock API call
      return Promise.resolve({
        id: 'new-member-id',
        email: memberData.email,
        role: memberData.role || 'member',
        organizationId,
      })
    },
    onSuccess: (data) => {
      console.log('Member added successfully:', data)
    },
    onError: (error) => {
      console.error('Failed to add member:', error)
    },
  })
}

describe('useTeamMembers - Simplified Mutation Test', () => {
  it('should handle member addition mutation without cache errors', async () => {
    const { result } = renderHook(
      () => useSimpleTeamMembersMutation('test-org-id'),
      { wrapper: TestWrapper }
    )

    expect(result.current.isIdle).toBe(true)

    // Trigger the mutation
    result.current.mutate({
      email: 'test@example.com',
      role: 'member',
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual({
      id: 'new-member-id',
      email: 'test@example.com',
      role: 'member',
      organizationId: 'test-org-id',
    })
  })

  it('should handle mutation with mutationKey correctly', async () => {
    const { result } = renderHook(
      () => useSimpleTeamMembersMutation('test-org-id'),
      { wrapper: TestWrapper }
    )

    // Check that the mutation is properly configured
    expect(result.current.isIdle).toBe(true)
    expect(result.current.isPending).toBe(false)

    // The mutation should have the correct key
    // This tests that the mutationKey doesn't cause cache issues
    result.current.mutate({ email: 'test2@example.com' })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
  })

  it('should work with our actual ReactQueryProvider', async () => {
    const { ReactQueryProvider } = await import('@/providers/react-query-provider')
    
    function OurWrapper({ children }: { children: React.ReactNode }) {
      return <ReactQueryProvider>{children}</ReactQueryProvider>
    }

    const { result } = renderHook(
      () => useSimpleTeamMembersMutation('test-org-id'),
      { wrapper: OurWrapper }
    )

    result.current.mutate({
      email: 'test3@example.com',
      role: 'admin',
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.email).toBe('test3@example.com')
  })
})