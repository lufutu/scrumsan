import { useCallback } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { toast } from 'sonner'

/**
 * Generic API resource hook that provides CRUD operations with SWR
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
  revalidateOnFocus?: boolean
  revalidateOnReconnect?: boolean
  refreshInterval?: number
}

export function useApiResource<T = any>(
  endpoint: string | null,
  resourceName: string,
  options: UseApiResourceOptions = {}
) {
  const {
    revalidateOnFocus = false,
    revalidateOnReconnect = true,
    refreshInterval = 0
  } = options

  const { data, error, isLoading, mutate } = useSWR<T[]>(
    endpoint,
    fetcher,
    {
      revalidateOnFocus,
      revalidateOnReconnect,
      refreshInterval,
      onError: (error) => {
        console.error(`Error fetching ${resourceName}:`, error)
      }
    }
  )

  const performMutation = useCallback(async (
    method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    url: string,
    data?: any,
    successMessage?: string
  ) => {
    try {
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

      // Revalidate the data
      await mutate()
      
      // Also revalidate any related endpoints that might be affected
      if (endpoint) {
        await globalMutate(key => typeof key === 'string' && key.startsWith(endpoint.split('?')[0]))
      }

      if (successMessage) {
        toast.success(successMessage)
      }

      return result
    } catch (error: any) {
      const message = error.message || `Failed to ${method.toLowerCase()} ${resourceName}`
      toast.error(message)
      throw error
    }
  }, [mutate, endpoint, resourceName])

  const create = useCallback(async (data: Partial<T>, customSuccessMessage?: string) => {
    if (!endpoint) throw new Error('No endpoint provided')
    
    const successMessage = customSuccessMessage || `${resourceName} created successfully`
    return performMutation('POST', endpoint, data, successMessage)
  }, [endpoint, performMutation, resourceName])

  const update = useCallback(async (id: string, data: Partial<T>, customSuccessMessage?: string) => {
    if (!endpoint) throw new Error('No endpoint provided')
    
    const successMessage = customSuccessMessage || `${resourceName} updated successfully`
    const url = `${endpoint}/${id}`
    return performMutation('PATCH', url, data, successMessage)
  }, [endpoint, performMutation, resourceName])

  const remove = useCallback(async (id: string, customSuccessMessage?: string) => {
    if (!endpoint) throw new Error('No endpoint provided')
    
    const successMessage = customSuccessMessage || `${resourceName} deleted successfully`
    const url = `${endpoint}/${id}`
    return performMutation('DELETE', url, undefined, successMessage)
  }, [endpoint, performMutation, resourceName])

  const refresh = useCallback(async () => {
    await mutate()
  }, [mutate])

  const optimisticUpdate = useCallback(async (
    updateFn: (currentData: T[] | undefined) => T[] | undefined,
    operation: () => Promise<any>
  ) => {
    try {
      // Optimistically update the data
      await mutate(updateFn, false)
      
      // Perform the actual operation
      const result = await operation()
      
      // Revalidate to ensure consistency
      await mutate()
      
      return result
    } catch (error) {
      // Revert optimistic update on error
      await mutate()
      throw error
    }
  }, [mutate])

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
    refresh,
    optimisticUpdate,
    
    // Direct access to SWR mutate for advanced usage
    mutate,
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
  const {
    revalidateOnFocus = false,
    revalidateOnReconnect = true,
    refreshInterval = 0
  } = options

  const { data, error, isLoading, mutate } = useSWR<T>(
    endpoint,
    fetcher,
    {
      revalidateOnFocus,
      revalidateOnReconnect,
      refreshInterval,
      onError: (error) => {
        console.error(`Error fetching ${resourceName}:`, error)
      }
    }
  )

  const performMutation = useCallback(async (
    method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    url: string,
    data?: any,
    successMessage?: string
  ) => {
    try {
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

      // Revalidate the data
      await mutate()

      if (successMessage) {
        toast.success(successMessage)
      }

      return result
    } catch (error: any) {
      const message = error.message || `Failed to ${method.toLowerCase()} ${resourceName}`
      toast.error(message)
      throw error
    }
  }, [mutate, resourceName])

  const update = useCallback(async (data: Partial<T>, customSuccessMessage?: string) => {
    if (!endpoint) throw new Error('No endpoint provided')
    
    const successMessage = customSuccessMessage || `${resourceName} updated successfully`
    return performMutation('PATCH', endpoint, data, successMessage)
  }, [endpoint, performMutation, resourceName])

  const remove = useCallback(async (customSuccessMessage?: string) => {
    if (!endpoint) throw new Error('No endpoint provided')
    
    const successMessage = customSuccessMessage || `${resourceName} deleted successfully`
    return performMutation('DELETE', endpoint, undefined, successMessage)
  }, [endpoint, performMutation, resourceName])

  const refresh = useCallback(async () => {
    await mutate()
  }, [mutate])

  return {
    // Data
    data,
    error,
    isLoading,
    
    // Operations
    update,
    remove,
    refresh,
    
    // Direct access to SWR mutate for advanced usage
    mutate,
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