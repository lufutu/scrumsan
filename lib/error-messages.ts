import { toast } from 'sonner'

/**
 * Extract a meaningful error message from various error types
 */
export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) {
    return error.message
  }
  
  if (typeof error === 'string') {
    return error
  }
  
  if (error && typeof error === 'object') {
    // Handle API error responses
    if ('error' in error && typeof (error as any).error === 'string') {
      return (error as any).error
    }
    
    // Handle error objects with message property
    if ('message' in error && typeof (error as any).message === 'string') {
      return (error as any).message
    }
    
    // Handle validation errors
    if ('details' in error && typeof (error as any).details === 'string') {
      return (error as any).details
    }
  }
  
  return fallback
}

/**
 * Show an error toast with proper logging
 */
export const showErrorToast = (error: unknown, fallback: string, context?: string) => {
  const message = getErrorMessage(error, fallback)
  
  // Log the error for debugging
  if (context) {
    console.error(`Error in ${context}:`, message, error)
  } else {
    console.error('Error:', message, error)
  }
  
  // Show user-friendly toast
  toast.error(message)
}

/**
 * Show a success toast
 */
export const showSuccessToast = (message: string) => {
  toast.success(message)
}

/**
 * Handle API response errors consistently
 */
export const handleApiError = async (response: Response, operation: string) => {
  try {
    const errorData = await response.json()
    const message = errorData.error || errorData.message || `${operation} failed`
    showErrorToast(message, `${operation} failed`, operation)
    return false
  } catch (parseError) {
    // If we can't parse the error response, show a generic message
    showErrorToast(`${operation} failed`, `${operation} failed`, operation)
    return false
  }
}

/**
 * Handle network errors consistently
 */
export const handleNetworkError = (error: unknown, operation: string) => {
  console.error(`Network error in ${operation}:`, error)
  
  // Check if it's a network-related error
  if (error instanceof TypeError && error.message.includes('fetch')) {
    toast.error('Network error. Please check your connection and try again.')
  } else {
    showErrorToast(error, `${operation} failed`, operation)
  }
}

/**
 * Create a safe async operation wrapper that handles errors gracefully
 */
export const safeAsync = <T>(
  operation: () => Promise<T>,
  errorMessage: string,
  context?: string
) => {
  return async (): Promise<T | null> => {
    try {
      return await operation()
    } catch (error) {
      showErrorToast(error, errorMessage, context)
      return null
    }
  }
}

/**
 * Error message templates for common operations
 */
export const ErrorMessages = {
  // Network errors
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  
  // Authentication errors
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
  
  // Validation errors
  REQUIRED_FIELD: 'This field is required.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  INVALID_FORMAT: 'Invalid format. Please check your input.',
  
  // Resource errors
  NOT_FOUND: 'The requested resource was not found.',
  ALREADY_EXISTS: 'This item already exists.',
  CONFLICT: 'This action conflicts with existing data.',
  
  // Permission errors
  ACCESS_DENIED: 'You do not have permission to perform this action.',
  INSUFFICIENT_PRIVILEGES: 'Insufficient privileges for this operation.',
  
  // Generic errors
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  
  // Operation-specific errors
  FAILED_TO_SAVE: 'Failed to save changes.',
  FAILED_TO_DELETE: 'Failed to delete item.',
  FAILED_TO_UPDATE: 'Failed to update item.',
  FAILED_TO_CREATE: 'Failed to create item.',
  FAILED_TO_LOAD: 'Failed to load data.',
} as const