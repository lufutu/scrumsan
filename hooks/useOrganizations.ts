import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { toast } from 'sonner'
import { cacheKeys, invalidationPatterns } from '@/lib/query-optimization'
import { Database } from '@/types/database'

const fetcher = async (url: string) => {
  console.log('useOrganizations fetcher called with URL:', url)
  const response = await fetch(url)
  console.log('useOrganizations fetch response:', { url, status: response.status, ok: response.ok })
  if (!response.ok) {
    throw new Error('Failed to fetch')
  }
  const data = await response.json()
  console.log('useOrganizations fetch data sample:', data?.length ? `Array of ${data.length} items` : data)
  return data
}

export interface Organization {
  id: string
  slug: string | null
  name: string
  description: string | null
  logo: string | null
  ownerId: string | null
  createdAt: string | null
  members: {
    userId: string
    role: 'owner' | 'admin' | 'member'
  }[]
}

export function useOrganizations() {
  const queryClient = useQueryClient()
  
  const { data, error, isLoading, refetch } = useQuery<Organization[]>({
    queryKey: cacheKeys.organizations(),
    queryFn: () => fetcher('/api/organizations'),
  })

  const createOrganizationMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; logo?: string }) => {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create organization')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cacheKeys.organizations() })
      toast.success('Organization created successfully')
    },
    onError: (error) => {
      console.error('Failed to create organization:', error)
      toast.error(error.message || 'Failed to create organization')
    }
  })

  const updateOrganizationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Organization> }) => {
      const response = await fetch(`/api/organizations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update organization')
      }

      return response.json()
    },
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: cacheKeys.organizations() })

      // Snapshot previous value
      const previousOrganizations = queryClient.getQueryData<Organization[]>(cacheKeys.organizations())

      // Optimistically update
      if (previousOrganizations) {
        queryClient.setQueryData<Organization[]>(
          cacheKeys.organizations(),
          previousOrganizations.map(org => 
            org.id === id ? { ...org, ...data } : org
          )
        )
      }

      return { previousOrganizations }
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousOrganizations) {
        queryClient.setQueryData(cacheKeys.organizations(), context.previousOrganizations)
      }
      console.error('Failed to update organization:', error)
      toast.error(error.message || 'Failed to update organization')
    },
    onSuccess: (data, { id }) => {
      // Invalidate related queries
      const invalidations = invalidationPatterns.allOrganizationData(id)
      invalidations.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey })
      })
      toast.success('Organization updated successfully')
    }
  })

  const deleteOrganizationMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/organizations/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete organization')
      }

      return true
    },
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: cacheKeys.organizations() })

      // Snapshot previous value
      const previousOrganizations = queryClient.getQueryData<Organization[]>(cacheKeys.organizations())

      // Optimistically remove
      if (previousOrganizations) {
        queryClient.setQueryData<Organization[]>(
          cacheKeys.organizations(),
          previousOrganizations.filter(org => org.id !== id)
        )
      }

      return { previousOrganizations }
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousOrganizations) {
        queryClient.setQueryData(cacheKeys.organizations(), context.previousOrganizations)
      }
      console.error('Failed to delete organization:', error)
      toast.error(error.message || 'Failed to delete organization')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cacheKeys.organizations() })
      toast.success('Organization deleted successfully')
    }
  })

  const createOrganization = useCallback((data: { name: string; description?: string; logo?: string }) => 
    createOrganizationMutation.mutate(data), [createOrganizationMutation])
  
  const updateOrganization = useCallback((id: string, data: Partial<Organization>) => 
    updateOrganizationMutation.mutate({ id, data }), [updateOrganizationMutation])
  
  const deleteOrganization = useCallback((id: string) => 
    deleteOrganizationMutation.mutate(id), [deleteOrganizationMutation])

  return {
    organizations: data,
    isLoading,
    error,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    mutate: refetch,
  }
}