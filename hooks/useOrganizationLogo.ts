"use client"

import { useQuery } from '@tanstack/react-query'
import { cacheKeys } from '@/lib/query-optimization'

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
 * Hook to get the logo URL for an organization
 * Uses React Query for caching and deduplication to prevent duplicate API calls
 */
export function useOrganizationLogo(organizationId: string, logoFilename: string | null) {
  // If no logo filename or organization ID, don't make API call
  const shouldFetch = logoFilename && organizationId && !logoFilename.startsWith('http')

  const { data, error, isLoading } = useQuery({
    queryKey: ['organizationLogo', organizationId],
    queryFn: () => fetcher(`/api/organizations/${organizationId}/logo/url`),
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
      errorMessage: 'Failed to load logo'
    }
  })

  // Handle different scenarios
  if (!logoFilename || !organizationId) {
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

/**
 * Hook to get logo URLs for multiple organizations
 * Uses React Query for efficient caching and deduplication
 */
export function useOrganizationLogos(organizations: Array<{ id: string; logo: string | null }>) {
  // Create individual React Query calls for each organization that needs a logo URL
  const logoResults = organizations.map(org => {
    const shouldFetch = org.logo && !org.logo.startsWith('http')
    
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data, error, isLoading } = useQuery({
      queryKey: ['organizationLogo', org.id],
      queryFn: () => fetcher(`/api/organizations/${org.id}/logo/url`),
      enabled: !!shouldFetch,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // Don't retry 404 errors
        if (error?.status === 404) return false
        return failureCount < 2
      }
    })

    return {
      orgId: org.id,
      logoUrl: org.logo?.startsWith('http') ? org.logo : (data?.url || null),
      isLoading: shouldFetch ? isLoading : false,
      error: error && (error as any).status !== 404 ? error : null
    }
  })

  // Combine results into the expected format
  const logoUrls: Record<string, string | null> = {}
  let hasLoading = false

  logoResults.forEach(result => {
    logoUrls[result.orgId] = result.logoUrl
    if (result.isLoading) hasLoading = true
  })

  return { 
    logoUrls, 
    isLoading: hasLoading 
  }
} 