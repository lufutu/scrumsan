import { SWRConfiguration } from 'swr'

// Custom fetcher with error handling and request deduplication
const fetcher = async (url: string) => {
  const response = await fetch(url)
  
  if (!response.ok) {
    const error = new Error('An error occurred while fetching the data.')
    // Attach extra info to the error object
    error.info = await response.json()
    error.status = response.status
    throw error
  }
  
  return response.json()
}

// Request deduplication cache
const requestCache = new Map<string, Promise<any>>()

// Deduplicating fetcher
const deduplicatedFetcher = (url: string) => {
  // Check if request is already in flight
  if (requestCache.has(url)) {
    return requestCache.get(url)
  }
  
  // Create new request and cache it
  const request = fetcher(url).finally(() => {
    // Remove from cache when request completes
    requestCache.delete(url)
  })
  
  requestCache.set(url, request)
  return request
}

// Optimized SWR configuration for performance
export const swrConfig: SWRConfiguration = {
  fetcher: deduplicatedFetcher,
  
  // Cache configuration - optimized for performance
  revalidateOnFocus: false, // Disable focus revalidation to reduce API calls
  revalidateOnMount: true,
  revalidateOnReconnect: true,
  refreshWhenOffline: false,
  refreshWhenHidden: false,
  
  // Timing configuration - more aggressive deduplication
  dedupingInterval: 5000, // 5 seconds deduplication (increased)
  focusThrottleInterval: 10000, // 10 seconds focus throttle (increased)
  
  // Error retry configuration
  errorRetryInterval: 5000,
  errorRetryCount: 3,
  shouldRetryOnError: (error) => {
    // Don't retry on 4xx errors (client errors)
    return error.status >= 500
  },
  
  // Loading states
  loadingTimeout: 3000,
  
  // Compare function for better data comparison
  compare: (a, b) => {
    // Custom comparison logic for deep equality
    return JSON.stringify(a) === JSON.stringify(b)
  },
  
  // Success callback for cache invalidation strategies
  onSuccess: (data, key) => {
    // Only log in development for debugging
    if (process.env.NODE_ENV === 'development' && process.env.DEBUG_SWR) {
      console.log(`SWR Success: ${key}`, data)
    }
  },
  
  // Error callback
  onError: (error, key) => {
    console.error(`SWR Error: ${key}`, error)
    
    // Send error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // Add your error monitoring service here
      // e.g., Sentry, Bugsnag, etc.
    }
  },
  
  // Fallback data
  fallbackData: undefined
}

// Specialized configurations for different data types
export const boardConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 30000, // 30 seconds for boards
  revalidateIfStale: true,
}

export const taskConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 10000, // 10 seconds for tasks
  revalidateIfStale: true,
}

export const userConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 300000, // 5 minutes for user data
  revalidateIfStale: false,
}

// Cache key generators
export const cacheKeys = {
  board: (boardId: string) => `/api/boards/${boardId}`,
  boardTasks: (boardId: string) => `/api/tasks?boardId=${boardId}`,
  sprintColumns: (sprintId: string) => `/api/sprints/${sprintId}/columns`,
  task: (taskId: string) => `/api/tasks/${taskId}`,
  user: (userId: string) => `/api/users/${userId}`,
  organization: (orgId: string) => `/api/organizations/${orgId}`,
  
  // Mutation keys for cache invalidation
  invalidateBoard: (boardId: string) => [
    `/api/boards/${boardId}`,
    `/api/tasks?boardId=${boardId}`,
  ],
  
  invalidateTasks: (boardId: string) => [
    `/api/tasks?boardId=${boardId}`,
    `/api/boards/${boardId}`,
  ],
}

// Helper functions for cache management
export const swrHelpers = {
  // Mutate multiple keys at once
  mutateMultiple: async (keys: string[], data?: any) => {
    const { mutate } = await import('swr')
    return Promise.all(keys.map(key => mutate(key, data, false)))
  },
  
  // Clear all cache
  clearCache: async () => {
    const { cache } = await import('swr')
    cache.clear()
  },
  
  // Preload data
  preload: async (key: string) => {
    const { preload } = await import('swr')
    return preload(key, deduplicatedFetcher)
  }
}