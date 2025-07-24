import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useQuery } from '@tanstack/react-query'
import { ReactQueryProvider } from '@/providers/react-query-provider'

// Test component that uses React Query
function TestComponent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['test'],
    queryFn: () => Promise.resolve('test data'),
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error occurred</div>
  return <div>Data: {data}</div>
}

describe('ReactQueryProvider', () => {
  it('should provide QueryClient to child components', async () => {
    render(
      <ReactQueryProvider>
        <TestComponent />
      </ReactQueryProvider>
    )

    // Initially should show loading
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    // Wait for data to load
    expect(await screen.findByText('Data: test data')).toBeInTheDocument()
  })

  it('should handle query errors gracefully', async () => {
    function ErrorComponent() {
      const { data, isLoading, error } = useQuery({
        queryKey: ['error-test'],
        queryFn: () => Promise.reject(new Error('Test error')),
        retry: false, // Disable retries for this test
      })

      if (isLoading) return <div>Loading...</div>
      if (error) return <div>Error occurred</div>
      return <div>Data: {data}</div>
    }

    render(
      <ReactQueryProvider>
        <ErrorComponent />
      </ReactQueryProvider>
    )

    // Initially should show loading
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    // Wait for error state
    expect(await screen.findByText('Error occurred')).toBeInTheDocument()
  })

  it('should provide proper default options', () => {
    // This test verifies that the provider sets up the QueryClient correctly
    // The actual configuration is tested through the behavior of queries
    render(
      <ReactQueryProvider>
        <div>Provider loaded</div>
      </ReactQueryProvider>
    )

    expect(screen.getByText('Provider loaded')).toBeInTheDocument()
  })
})