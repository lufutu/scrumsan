"use client"

import useSWR from 'swr'

/**
 * Hook to get the logo URL for an organization
 * Uses SWR for caching and deduplication to prevent duplicate API calls
 */
export function useOrganizationLogo(organizationId: string, logoFilename: string | null) {
  // If no logo filename or organization ID, don't make API call
  const shouldFetch = logoFilename && organizationId && !logoFilename.startsWith('http')

  const { data, error, isLoading } = useSWR(
    shouldFetch ? `/api/organizations/${organizationId}/logo/url` : null,
    {
      // Logo URLs don't change frequently, cache for longer
      refreshInterval: 0,
      revalidateOnFocus: false,
      revalidateOnMount: true,
      dedupingInterval: 30000, // 30 seconds deduplication for logo URLs
      onError: (error, key) => {
        // Don't log 404 errors for missing logos
        if (error.status !== 404) {
          console.error('Error fetching logo URL:', error)
        }
      }
    }
  )

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
    error: error && error.status !== 404 ? (error.message || 'Failed to load logo') : null
  }
}

/**
 * Hook to get logo URLs for multiple organizations
 * Uses SWR for efficient caching and deduplication
 */
export function useOrganizationLogos(organizations: Array<{ id: string; logo: string | null }>) {
  // Create individual SWR calls for each organization that needs a logo URL
  const logoResults = organizations.map(org => {
    const shouldFetch = org.logo && !org.logo.startsWith('http')
    
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data, error, isLoading } = useSWR(
      shouldFetch ? `/api/organizations/${org.id}/logo/url` : null,
      {
        refreshInterval: 0,
        revalidateOnFocus: false,
        revalidateOnMount: true,
        dedupingInterval: 30000, // 30 seconds deduplication
        onError: (error) => {
          // Don't log 404 errors for missing logos
          if (error.status !== 404) {
            console.error(`Error fetching logo URL for org ${org.id}:`, error)
          }
        }
      }
    )

    return {
      orgId: org.id,
      logoUrl: org.logo?.startsWith('http') ? org.logo : (data?.url || null),
      isLoading: shouldFetch ? isLoading : false,
      error: error && error.status !== 404 ? error : null
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