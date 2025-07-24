import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'
import React from 'react'

// Simple test to verify mutations work with our QueryClient setup
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

function useTestMutation() {
  return useMutation({
    mutationFn: async (data: { name: string }) => {
      // Simulate API call
      return Promise.resolve({ id: '1', ...data })
    },
    onSuccess: (data) => {
      console.log('Mutation successful:', data)
    },
    onError: (error) => {
      console.error('Mutation failed:', error)
    },
  })
}

describe('React Query Mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle mutations without cache errors', async () => {
    const { result } = renderHook(() => useTestMutation(), {
      wrapper: TestWrapper,
    })

    expect(result.current.isIdle).toBe(true)
    expect(result.current.isPending).toBe(false)

    // Trigger mutation
    result.current.mutate({ name: 'Test User' })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual({ id: '1', name: 'Test User' })
  })

  it('should handle mutation errors gracefully', async () => {
    const { result } = renderHook(() => {
      return useMutation({
        mutationFn: async () => {
          throw new Error('Test error')
        },
        onError: (error) => {
          console.error('Expected error:', error)
        },
      })
    }, {
      wrapper: TestWrapper,
    })

    result.current.mutate()

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(Error)
    expect((result.current.error as Error).message).toBe('Test error')
  })

  it('should work with our ReactQueryProvider configuration', async () => {
    // Import our actual provider
    const { ReactQueryProvider } = await import('@/providers/react-query-provider')
    
    function OurTestWrapper({ children }: { children: React.ReactNode }) {
      return <ReactQueryProvider>{children}</ReactQueryProvider>
    }

    const { result } = renderHook(() => useTestMutation(), {
      wrapper: OurTestWrapper,
    })

    expect(result.current.isIdle).toBe(true)

    result.current.mutate({ name: 'Test with our provider' })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual({ id: '1', name: 'Test with our provider' })
  })
})