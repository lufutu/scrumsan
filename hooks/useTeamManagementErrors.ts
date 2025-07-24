import { useCallback } from 'react'
import { toast } from 'sonner'

export interface TeamManagementError {
  type: 'network' | 'permission' | 'validation' | 'conflict' | 'server' | 'unknown'
  message: string
  details?: any
  status?: number
}

export function useTeamManagementErrors() {
  const handleError = useCallback((error: any, context?: string): TeamManagementError => {
    let errorType: TeamManagementError['type'] = 'unknown'
    let message = 'An unexpected error occurred'
    
    // Determine error type based on status code or error properties
    if (error?.status || error?.response?.status) {
      const status = error.status || error.response.status
      
      switch (status) {
        case 400:
          errorType = 'validation'
          message = 'Invalid data provided'
          break
        case 401:
          errorType = 'permission'
          message = 'Authentication required'
          break
        case 403:
          errorType = 'permission'
          message = 'You do not have permission to perform this action'
          break
        case 404:
          errorType = 'validation'
          message = 'Resource not found'
          break
        case 409:
          errorType = 'conflict'
          message = 'This action conflicts with existing data'
          break
        case 422:
          errorType = 'validation'
          message = 'Validation failed'
          break
        case 429:
          errorType = 'server'
          message = 'Too many requests. Please try again later'
          break
        case 500:
        case 502:
        case 503:
        case 504:
          errorType = 'server'
          message = 'Server error. Please try again later'
          break
        default:
          if (status >= 400 && status < 500) {
            errorType = 'validation'
          } else if (status >= 500) {
            errorType = 'server'
          }
      }
    } else if (error?.name === 'NetworkError' || error?.message?.includes('fetch')) {
      errorType = 'network'
      message = 'Network error. Please check your connection'
    } else if (error?.message) {
      message = error.message
    }

    // Add context to message if provided
    if (context) {
      message = `${context}: ${message}`
    }

    const teamError: TeamManagementError = {
      type: errorType,
      message,
      details: error,
      status: error?.status || error?.response?.status
    }

    // Log error for debugging
    console.error('Team Management Error:', teamError)

    return teamError
  }, [])

  const showErrorToast = useCallback((error: TeamManagementError) => {
    const toastOptions = {
      duration: 5000,
      action: error.type === 'network' ? {
        label: 'Retry',
        onClick: () => window.location.reload()
      } : undefined
    }

    switch (error.type) {
      case 'network':
        toast.error('Connection Error', {
          description: error.message,
          ...toastOptions
        })
        break
      case 'permission':
        toast.error('Access Denied', {
          description: error.message,
          ...toastOptions
        })
        break
      case 'validation':
        toast.error('Invalid Data', {
          description: error.message,
          ...toastOptions
        })
        break
      case 'conflict':
        toast.error('Conflict', {
          description: error.message,
          ...toastOptions
        })
        break
      case 'server':
        toast.error('Server Error', {
          description: error.message,
          ...toastOptions
        })
        break
      default:
        toast.error('Error', {
          description: error.message,
          ...toastOptions
        })
    }
  }, [])

  const handleAndShowError = useCallback((error: any, context?: string) => {
    const teamError = handleError(error, context)
    showErrorToast(teamError)
    return teamError
  }, [handleError, showErrorToast])

  // Specific error handlers for common team management operations
  const handleMemberError = useCallback((error: any, operation: 'add' | 'remove' | 'update') => {
    const contexts = {
      add: 'Failed to add member',
      remove: 'Failed to remove member',
      update: 'Failed to update member'
    }
    return handleAndShowError(error, contexts[operation])
  }, [handleAndShowError])

  const handlePermissionSetError = useCallback((error: any, operation: 'create' | 'update' | 'delete') => {
    const contexts = {
      create: 'Failed to create permission set',
      update: 'Failed to update permission set',
      delete: 'Failed to delete permission set'
    }
    return handleAndShowError(error, contexts[operation])
  }, [handleAndShowError])

  const handleEngagementError = useCallback((error: any, operation: 'create' | 'update' | 'delete') => {
    const contexts = {
      create: 'Failed to create engagement',
      update: 'Failed to update engagement',
      delete: 'Failed to delete engagement'
    }
    return handleAndShowError(error, contexts[operation])
  }, [handleAndShowError])

  const handleTimeOffError = useCallback((error: any, operation: 'create' | 'update' | 'delete') => {
    const contexts = {
      create: 'Failed to create time-off entry',
      update: 'Failed to update time-off entry',
      delete: 'Failed to delete time-off entry'
    }
    return handleAndShowError(error, contexts[operation])
  }, [handleAndShowError])

  const handleProfileError = useCallback((error: any, operation: 'update' | 'fetch') => {
    const contexts = {
      update: 'Failed to update profile',
      fetch: 'Failed to load profile'
    }
    return handleAndShowError(error, contexts[operation])
  }, [handleAndShowError])

  const handleRoleError = useCallback((error: any, operation: 'create' | 'update' | 'delete') => {
    const contexts = {
      create: 'Failed to create role',
      update: 'Failed to update role',
      delete: 'Failed to delete role'
    }
    return handleAndShowError(error, contexts[operation])
  }, [handleAndShowError])

  return {
    handleError,
    showErrorToast,
    handleAndShowError,
    handleMemberError,
    handlePermissionSetError,
    handleEngagementError,
    handleTimeOffError,
    handleProfileError,
    handleRoleError
  }
}

// Utility function to create retry mechanisms
export function createRetryHandler(
  operation: () => Promise<any>,
  maxRetries: number = 3,
  delay: number = 1000
) {
  return async function retryOperation(): Promise<any> {
    let lastError: any
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        
        // Don't retry on client errors (4xx) except for 429 (rate limit)
        if (error?.status >= 400 && error?.status < 500 && error?.status !== 429) {
          throw error
        }
        
        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          throw error
        }
        
        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)))
      }
    }
    
    throw lastError
  }
}

// Hook for handling loading states with error recovery
export function useLoadingWithRetry<T>(
  operation: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = React.useState<T | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<TeamManagementError | null>(null)
  const [retryCount, setRetryCount] = React.useState(0)
  
  const { handleError } = useTeamManagementErrors()
  
  const executeOperation = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await operation()
      setData(result)
    } catch (err) {
      const teamError = handleError(err)
      setError(teamError)
    } finally {
      setIsLoading(false)
    }
  }, [operation, handleError])
  
  const retry = useCallback(() => {
    setRetryCount(prev => prev + 1)
    executeOperation()
  }, [executeOperation])
  
  React.useEffect(() => {
    executeOperation()
  }, [...dependencies, retryCount])
  
  return {
    data,
    isLoading,
    error,
    retry,
    retryCount
  }
}