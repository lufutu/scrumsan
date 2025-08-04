import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

/**
 * Generic API resource hook that provides CRUD operations with React Query
 */

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || `Failed to fetch from ${url}`)
  }
  return response.json()
}

interface UseApiResourceOptions {
  refetchOnWindowFocus?: boolean
  refetchInterval?: number
  staleTime?: number
  gcTime?: number
}

export function useApiResource<T = any>(
  endpoint: string | null,
  resourceName: string,
  options: UseApiResourceOptions = {}
) {
  const queryClient = useQueryClient()
  const {
    refetchOnWindowFocus = false,
    refetchInterval = 0,
    staleTime = 5 * 60 * 1000, // 5 minutes
    gcTime = 10 * 60 * 1000, // 10 minutes
  } = options

  const { data, error, isLoading, refetch } = useQuery<T[]>({
    queryKey: [endpoint],
    queryFn: () => fetcher(endpoint!),
    enabled: !!endpoint,
    refetchOnWindowFocus,
    refetchInterval,
    staleTime,
    gcTime,
    meta: {
      errorMessage: `Error fetching ${resourceName}`
    }
  })

  const performMutation = useCallback(async (
    method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    url: string,
    data?: any,
    successMessage?: string
  ) => {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    }

    if (data) {
      options.body = JSON.stringify(data)
    }

    const response = await fetch(url, options)
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || `Failed to ${method.toLowerCase()} ${resourceName}`)
    }

    const result = method !== 'DELETE' ? await response.json() : null

    if (successMessage) {
      toast.success(successMessage)
    }

    return result
  }, [resourceName])

  const createMutation = useMutation({
    mutationFn: async (data: Partial<T>) => {
      if (!endpoint) throw new Error('No endpoint provided')
      return performMutation('POST', endpoint, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] })
      if (endpoint) {
        // Invalidate related queries
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0]
            return typeof key === 'string' && key.startsWith(endpoint.split('?')[0])
          }
        })
      }
    },
    onError: (error) => {
      toast.error(error.message || `Failed to create ${resourceName}`)
    }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<T> }) => {
      if (!endpoint) throw new Error('No endpoint provided')
      const url = `${endpoint}/${id}`
      return performMutation('PATCH', url, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] })
      if (endpoint) {
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0]
            return typeof key === 'string' && key.startsWith(endpoint.split('?')[0])
          }
        })
      }
    },
    onError: (error) => {
      toast.error(error.message || `Failed to update ${resourceName}`)
    }
  })

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!endpoint) throw new Error('No endpoint provided')
      const url = `${endpoint}/${id}`
      return performMutation('DELETE', url)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] })
      if (endpoint) {
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0]
            return typeof key === 'string' && key.startsWith(endpoint.split('?')[0])
          }
        })
      }
    },
    onError: (error) => {
      toast.error(error.message || `Failed to delete ${resourceName}`)
    }
  })

  const create = useCallback(async (data: Partial<T>, customSuccessMessage?: string) => {
    const result = await createMutation.mutateAsync(data)
    if (customSuccessMessage) {
      toast.success(customSuccessMessage)
    } else {
      toast.success(`${resourceName} created successfully`)
    }
    return result
  }, [createMutation, resourceName])

  const update = useCallback(async (id: string, data: Partial<T>, customSuccessMessage?: string) => {
    const result = await updateMutation.mutateAsync({ id, data })
    if (customSuccessMessage) {
      toast.success(customSuccessMessage)
    } else {
      toast.success(`${resourceName} updated successfully`)
    }
    return result
  }, [updateMutation, resourceName])

  const remove = useCallback(async (id: string, customSuccessMessage?: string) => {
    const result = await removeMutation.mutateAsync(id)
    if (customSuccessMessage) {
      toast.success(customSuccessMessage)
    } else {
      toast.success(`${resourceName} deleted successfully`)
    }
    return result
  }, [removeMutation, resourceName])

  const optimisticUpdate = useCallback(async (
    updateFn: (currentData: T[] | undefined) => T[] | undefined,
    operation: () => Promise<any>
  ) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: [endpoint] })

    // Snapshot previous value
    const previousData = queryClient.getQueryData<T[]>([endpoint])

    // Optimistically update
    queryClient.setQueryData([endpoint], updateFn)

    try {
      const result = await operation()
      // Revalidate to ensure consistency
      await queryClient.invalidateQueries({ queryKey: [endpoint] })
      return result
    } catch (error) {
      // Revert on error
      queryClient.setQueryData([endpoint], previousData)
      throw error
    }
  }, [endpoint, queryClient])

  return {
    // Data
    data: data || [],
    error,
    isLoading,
    isEmpty: !isLoading && !error && (!data || data.length === 0),
    
    // Operations
    create,
    update,
    remove,
    refresh: refetch,
    optimisticUpdate,
    
    // Direct access to mutations for advanced usage
    createMutation,
    updateMutation,
    removeMutation,
  }
}

/**
 * Hook for single resource (non-array) endpoints
 */
export function useApiItem<T = any>(
  endpoint: string | null,
  resourceName: string,
  options: UseApiResourceOptions = {}
) {
  const queryClient = useQueryClient()
  const {
    refetchOnWindowFocus = false,
    refetchInterval = 0,
    staleTime = 5 * 60 * 1000,
    gcTime = 10 * 60 * 1000,
  } = options

  const { data, error, isLoading, refetch } = useQuery<T>({
    queryKey: [endpoint],
    queryFn: () => fetcher(endpoint!),
    enabled: !!endpoint,
    refetchOnWindowFocus,
    refetchInterval,
    staleTime,
    gcTime,
    meta: {
      errorMessage: `Error fetching ${resourceName}`
    }
  })

  const performMutation = useCallback(async (
    method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    url: string,
    data?: any
  ) => {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    }

    if (data) {
      options.body = JSON.stringify(data)
    }

    const response = await fetch(url, options)
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || `Failed to ${method.toLowerCase()} ${resourceName}`)
    }

    return method !== 'DELETE' ? await response.json() : null
  }, [resourceName])

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<T>) => {
      if (!endpoint) throw new Error('No endpoint provided')
      return performMutation('PATCH', endpoint, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] })
      toast.success(`${resourceName} updated successfully`)
    },
    onError: (error) => {
      toast.error(error.message || `Failed to update ${resourceName}`)
    }
  })

  const removeMutation = useMutation({
    mutationFn: async () => {
      if (!endpoint) throw new Error('No endpoint provided')
      return performMutation('DELETE', endpoint)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] })
      toast.success(`${resourceName} deleted successfully`)
    },
    onError: (error) => {
      toast.error(error.message || `Failed to delete ${resourceName}`)
    }
  })

  const update = useCallback(async (data: Partial<T>, customSuccessMessage?: string) => {
    const result = await updateMutation.mutateAsync(data)
    if (customSuccessMessage) {
      toast.success(customSuccessMessage)
    }
    return result
  }, [updateMutation])

  const remove = useCallback(async (customSuccessMessage?: string) => {
    const result = await removeMutation.mutateAsync()
    if (customSuccessMessage) {
      toast.success(customSuccessMessage)
    }
    return result
  }, [removeMutation])

  return {
    // Data
    data,
    error,
    isLoading,
    
    // Operations
    update,
    remove,
    refresh: refetch,
    
    // Direct access to mutations for advanced usage
    updateMutation,
    removeMutation,
  }
}

/**
 * Hook for endpoints that support both list and detail views
 */
export function useApiResourceWithDetail<TList = any, TDetail = any>(
  listEndpoint: string | null,
  resourceName: string,
  options: UseApiResourceOptions = {}
) {
  const listResource = useApiResource<TList>(listEndpoint, resourceName, options)

  const getDetail = useCallback((id: string) => {
    const detailEndpoint = listEndpoint ? `${listEndpoint}/${id}` : null
    return useApiItem<TDetail>(detailEndpoint, `${resourceName} detail`, options)
  }, [listEndpoint, resourceName, options])

  return {
    ...listResource,
    getDetail,
  }
}