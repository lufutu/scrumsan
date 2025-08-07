"use client"

import { useQuery } from '@tanstack/react-query'

// Fetcher function for logo URLs
const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    const error = new Error('Failed to fetch')
    ;(error as any).status = response.status
    throw error
  }
  return response.json()
}

/**
 * Hook to get the logo URL for a board
 * Uses React Query for caching and deduplication to prevent duplicate API calls
 */
export function useBoardLogo(boardId: string, logoFilename: string | null) {
  // If no logo filename or board ID, don't make API call
  const shouldFetch = logoFilename && boardId && !logoFilename.startsWith('http')

  const { data, error, isLoading } = useQuery({
    queryKey: ['boardLogo', boardId],
    queryFn: () => fetcher(`/api/boards/${boardId}/logo/url`),
    enabled: !!shouldFetch,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // Don't retry 404 errors
      if (error?.status === 404) return false
      return failureCount < 2
    },
    meta: {
      errorMessage: 'Failed to load board logo'
    }
  })

  // Handle different scenarios
  if (!logoFilename || !boardId) {
    return { logoUrl: null, isLoading: false, error: null }
  }

  // Check if it's already a full URL (for backward compatibility)
  if (logoFilename.startsWith('http')) {
    return { logoUrl: logoFilename, isLoading: false, error: null }
  }

  return {
    logoUrl: data?.url || null,
    isLoading,
    error: error && (error as any).status !== 404 ? ((error as Error).message || 'Failed to load logo') : null
  }
}