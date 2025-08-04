import { useQuery } from '@tanstack/react-query'
import { cacheKeys } from '@/lib/query-optimization'
import { Organization } from '@/hooks/useOrganizations'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch')
  }
  return response.json()
}

// Optimized organizations hook using React Query for caching and deduplication
export function useOptimizedOrganizations() {
  const { data: organizations, error, isLoading, refetch } = useQuery<Organization[]>({
    queryKey: cacheKeys.organizations(),
    queryFn: () => fetcher('/api/organizations'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  })

  return {
    organizations: organizations || [],
    isLoading,
    error: error?.message || null,
    refresh: refetch
  }
}

// Hook for getting organization details with caching
export function useOptimizedOrganization(orgId: string | null) {
  const { data: organization, error, isLoading, refetch } = useQuery<Organization>({
    queryKey: cacheKeys.organization(orgId || ''),
    queryFn: () => fetcher(`/api/organizations/${orgId}`),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  })

  return {
    organization: organization || null,
    isLoading,
    error: error?.message || null,
    refresh: refetch
  }
}