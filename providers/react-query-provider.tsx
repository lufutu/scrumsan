'use client'

import React, { useState } from 'react'
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query'
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
            // Optimized cache timing based on data type
            staleTime: (query) => {
              if (!query?.queryKey || query.queryKey.length === 0) {
                return 2 * 60 * 1000 // 2 minutes default
              }
              const queryKey = query.queryKey[0] as string
              switch (queryKey) {
                case 'user':
                case 'profile':
                  return 10 * 60 * 1000 // 10 minutes for user data
                case 'organization':
                  return 5 * 60 * 1000  // 5 minutes for org data
                case 'board':
                case 'tasks':
                  return 30 * 1000      // 30 seconds for dynamic data
                default:
                  return 2 * 60 * 1000  // 2 minutes default
              }
            },
            
            // Garbage collection timing
            gcTime: (query) => {
              if (!query?.queryKey || query.queryKey.length === 0) {
                return 10 * 60 * 1000 // 10 minutes default
              }
              const queryKey = query.queryKey[0] as string
              switch (queryKey) {
                case 'user':
                case 'profile':
                  return 30 * 60 * 1000 // 30 minutes for user data
                case 'organization':
                  return 15 * 60 * 1000 // 15 minutes for org data
                default:
                  return 10 * 60 * 1000 // 10 minutes default
              }
            },
            
            // Enhanced retry logic with exponential backoff
            retry: (failureCount: number, error: unknown) => {
              const errorWithStatus = error as { status?: number; code?: string }
              
              // Don't retry on 4xx errors (client errors)
              if (errorWithStatus?.status >= 400 && errorWithStatus?.status < 500) {
                return false
              }
              
              // Don't retry on network errors that are likely permanent
              if (errorWithStatus?.code === 'NETWORK_ERROR' && failureCount >= 1) {
                return false
              }
              
              return failureCount < 3
            },
            
            retryDelay: (attemptIndex: number, error: unknown) => {
              const errorWithStatus = error as { status?: number }
              const baseDelay = 1000
              
              // Faster retry for 500 errors (likely temporary server issues)
              if (errorWithStatus?.status >= 500) {
                return Math.min(baseDelay * 2 ** attemptIndex, 10000)
              }
              
              // Standard exponential backoff
              return Math.min(baseDelay * 2 ** attemptIndex, 30000)
            },
            
            // Smart refetch on window focus
            refetchOnWindowFocus: (query) => {
              if (!query?.queryKey || query.queryKey.length === 0) {
                return false
              }
              const queryKey = query.queryKey[0] as string
              const criticalData = [
                'tasks', 'board', 'sprint-columns', 
                'teamMembers', 'notifications'
              ]
              return criticalData.includes(queryKey)
            },
            
            // Refetch behavior
            refetchOnReconnect: 'always',
            refetchOnMount: (query) => {
              if (!query?.queryKey || query.queryKey.length === 0) {
                return true
              }
              // Always refetch critical data on mount
              const queryKey = query.queryKey[0] as string
              const alwaysRefresh = ['tasks', 'board', 'sprint-columns']
              return alwaysRefresh.includes(queryKey) ? 'always' : true
            },
            
            // Background refetch intervals for real-time data
            refetchInterval: (data, query) => {
              if (!data) return false
              if (!query?.queryKey || query.queryKey.length === 0) {
                return false
              }
              
              const queryKey = query.queryKey[0] as string
              switch (queryKey) {
                case 'tasks':
                case 'board':
                  return 30000 // 30 seconds for task data
                case 'sprint-columns':
                  return 15000 // 15 seconds for sprint columns
                case 'notifications':
                  return 10000 // 10 seconds for notifications
                default:
                  return false // No background refetch by default
              }
            },
            
            // Only refetch in background when tab is visible
            refetchIntervalInBackground: false,
            
            // Enhanced network mode
            networkMode: 'online',
            
            // Structured error handling
            throwOnError: (error: unknown, query) => {
              const errorWithStatus = error as { status?: number }
              
              if (!query?.queryKey || query.queryKey.length === 0) {
                // Default error handling when queryKey is unavailable
                return errorWithStatus?.status >= 500
              }
              
              const queryKey = query.queryKey[0] as string
              
              // Always throw errors for critical operations
              const criticalQueries = ['user', 'auth']
              if (criticalQueries.includes(queryKey)) {
                return true
              }
              
              // Don't throw 404 errors for optional data
              if (errorWithStatus?.status === 404) {
                return false
              }
              
              // Throw 5xx errors to trigger error boundaries
              return errorWithStatus?.status >= 500
            },
          },
          
          mutations: {
            // Enhanced mutation retry logic
            retry: (failureCount: number, error: unknown) => {
              const errorWithStatus = error as { status?: number }
              
              // Don't retry on client errors
              if (errorWithStatus?.status >= 400 && errorWithStatus?.status < 500) {
                return false
              }
              
              // Retry server errors once
              return failureCount < 1
            },
            
            retryDelay: (attemptIndex: number) => {
              return Math.min(1000 * 2 ** attemptIndex, 5000)
            },
            
            // Network mode for mutations
            networkMode: 'online',
            
            // Global mutation error handling
            onError: (error: unknown, variables: unknown, context: unknown) => {
              console.error('Mutation failed:', error)
              
              // Send to error monitoring in production
              if (process.env.NODE_ENV === 'production') {
                // Add your error monitoring service here
                // e.g., Sentry.captureException(error)
              }
            },
          },
        },
        
        // Enhanced query cache configuration
        queryCache: new QueryCache({
          onError: (error: unknown, query) => {
            console.error('Query failed:', error, query.queryKey)
            
            // Log specific error types for debugging
            if (process.env.NODE_ENV === 'development') {
              const errorWithStatus = error as { status?: number; message?: string }
              console.warn(`Query ${query.queryKey} failed with status: ${errorWithStatus?.status}`)
            }
          },
          
          onSuccess: (data, query) => {
            // Log successful queries in development
            if (process.env.NODE_ENV === 'development') {
              console.log(`Query ${query.queryKey} succeeded`)
            }
          },
        }),
        
        // Mutation cache for tracking mutations
        mutationCache: new MutationCache({
          onError: (error: unknown, variables: unknown, context: unknown, mutation) => {
            console.error('Mutation failed:', error, mutation.options.mutationKey)
          },
          
          onSuccess: (data, variables, context, mutation) => {
            // Log successful mutations in development
            if (process.env.NODE_ENV === 'development') {
              console.log(`Mutation ${mutation.options.mutationKey} succeeded`)
            }
          },
        }),
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}