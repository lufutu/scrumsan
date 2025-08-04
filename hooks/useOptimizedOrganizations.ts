import useSWR from 'swr'
import { Organization } from '@/hooks/useOrganizations'

// Optimized organizations hook using SWR for caching and deduplication
export function useOptimizedOrganizations() {
  const { data: organizations, error, mutate } = useSWR<Organization[]>(
    '/api/organizations',
    {
      // Organizations don't change frequently, so cache for longer
      refreshInterval: 0, // Disable automatic refresh
      revalidateOnFocus: false, // Don't refetch when window gains focus
      revalidateOnMount: true, // Only fetch on mount
      dedupingInterval: 10000, // 10 seconds deduplication
    }
  )

  return {
    organizations: organizations || [],
    isLoading: !error && !organizations,
    error: error?.message || null,
    refresh: mutate
  }
}

// Hook for getting organization details with caching
export function useOptimizedOrganization(orgId: string | null) {
  const { data: organization, error, mutate } = useSWR<Organization>(
    orgId ? `/api/organizations/${orgId}` : null,
    {
      refreshInterval: 0,
      revalidateOnFocus: false,
      revalidateOnMount: true,
      dedupingInterval: 15000, // 15 seconds for single org
    }
  )

  return {
    organization: organization || null,
    isLoading: orgId ? (!error && !organization) : false,
    error: error?.message || null,
    refresh: mutate
  }
}