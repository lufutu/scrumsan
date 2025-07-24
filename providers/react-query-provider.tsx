'use client'

import React, { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

interface ReactQueryProviderProps {
  children: React.ReactNode
}

export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache data for 5 minutes by default
            staleTime: 5 * 60 * 1000,
            // Keep data in cache for 10 minutes
            gcTime: 10 * 60 * 1000,
            // Retry failed requests 3 times with exponential backoff
            retry: (failureCount: number, error: unknown) => {
              // Don't retry on 4xx errors (client errors)
              const errorWithStatus = error as { status?: number }
              if (errorWithStatus?.status >= 400 && errorWithStatus?.status < 500) {
                return false
              }
              return failureCount < 3
            },
            retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Refetch on window focus for critical data
            refetchOnWindowFocus: (query) => {
              // Only refetch team-related data on focus
              const queryKey = query.queryKey[0] as string
              return ['teamMembers', 'teamMember', 'permissionSets'].includes(queryKey)
            },
            // Don't refetch on reconnect by default (can be overridden per query)
            refetchOnReconnect: 'always',
            // Enable background refetching
            refetchOnMount: true,
            // Network mode for better offline handling
            networkMode: 'online',
          },
          mutations: {
            // Retry mutations once on failure
            retry: (failureCount: number, error: unknown) => {
              // Don't retry on 4xx errors
              const errorWithStatus = error as { status?: number }
              if (errorWithStatus?.status >= 400 && errorWithStatus?.status < 500) {
                return false
              }
              return failureCount < 1
            },
            retryDelay: 1000,
            // Network mode for mutations
            networkMode: 'online',
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}