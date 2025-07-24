/**
 * @fileoverview Avatar-specific error handling utilities
 * 
 * This module provides specialized error handling for avatar operations,
 * including upload failures, display errors, and network issues with
 * appropriate retry mechanisms and user-friendly error messages.
 * 
 * @author Avatar Profile Enhancement System
 * @version 1.0.0
 */

import { toast } from 'sonner'
import { getErrorMessage, showErrorToast, ErrorMessages } from './error-messages'

/**
 * Avatar error types for categorization
 */
export enum AvatarErrorType {
  UPLOAD_FAILED = 'upload_failed',
  NETWORK_ERROR = 'network_error',
  FILE_TOO_LARGE = 'file_too_large',
  INVALID_FILE_TYPE = 'invalid_file_type',
  GENERATION_FAILED = 'generation_failed',
  DISPLAY_ERROR = 'display_error',
  PERMISSION_DENIED = 'permission_denied',
  QUOTA_EXCEEDED = 'quota_exceeded',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

/**
 * Avatar error details
 */
export interface AvatarError {
  type: AvatarErrorType
  message: string
  originalError?: Error
  context?: string
  canRetry?: boolean
  retryDelay?: number
  maxRetries?: number
}

/**
 * Categorize avatar errors based on error message and context
 */
export function categorizeAvatarError(error: unknown, context?: string): AvatarError {
  const message = getErrorMessage(error, 'Unknown avatar error')
  const originalError = error instanceof Error ? error : undefined

  // Network-related errors
  if (message.includes('fetch') || message.includes('network') || message.includes('connection')) {
    return {
      type: AvatarErrorType.NETWORK_ERROR,
      message: 'Network connection failed. Please check your internet connection and try again.',
      originalError,
      context,
      canRetry: true,
      retryDelay: 2000,
      maxRetries: 3
    }
  }

  // Timeout errors
  if (message.includes('timeout') || message.includes('timed out')) {
    return {
      type: AvatarErrorType.TIMEOUT,
      message: 'Upload timed out. Please try again with a smaller file or check your connection.',
      originalError,
      context,
      canRetry: true,
      retryDelay: 3000,
      maxRetries: 2
    }
  }

  // File size errors
  if (message.includes('size') || message.includes('large') || message.includes('MB')) {
    return {
      type: AvatarErrorType.FILE_TOO_LARGE,
      message: 'File is too large. Please choose a smaller image (max 5MB).',
      originalError,
      context,
      canRetry: false
    }
  }

  // File type errors
  if (message.includes('type') || message.includes('format') || message.includes('invalid')) {
    return {
      type: AvatarErrorType.INVALID_FILE_TYPE,
      message: 'Invalid file type. Please use JPEG, PNG, or WebP images.',
      originalError,
      context,
      canRetry: false
    }
  }

  // Permission errors
  if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
    return {
      type: AvatarErrorType.PERMISSION_DENIED,
      message: 'You don\'t have permission to upload avatars. Contact your administrator.',
      originalError,
      context,
      canRetry: false
    }
  }

  // Quota errors
  if (message.includes('quota') || message.includes('limit') || message.includes('storage')) {
    return {
      type: AvatarErrorType.QUOTA_EXCEEDED,
      message: 'Storage quota exceeded. Please contact your administrator.',
      originalError,
      context,
      canRetry: false
    }
  }

  // Avatar generation errors
  if (context === 'generation' || message.includes('generate') || message.includes('avatar')) {
    return {
      type: AvatarErrorType.GENERATION_FAILED,
      message: 'Failed to generate avatar. Using initials fallback.',
      originalError,
      context,
      canRetry: true,
      retryDelay: 1000,
      maxRetries: 2
    }
  }

  // Upload-specific errors
  if (context === 'upload' || message.includes('upload')) {
    return {
      type: AvatarErrorType.UPLOAD_FAILED,
      message: 'Failed to upload avatar. Please try again.',
      originalError,
      context,
      canRetry: true,
      retryDelay: 2000,
      maxRetries: 3
    }
  }

  // Display errors
  if (context === 'display' || message.includes('load') || message.includes('display')) {
    return {
      type: AvatarErrorType.DISPLAY_ERROR,
      message: 'Failed to load avatar image. Using fallback.',
      originalError,
      context,
      canRetry: true,
      retryDelay: 1000,
      maxRetries: 2
    }
  }

  // Default unknown error
  return {
    type: AvatarErrorType.UNKNOWN,
    message: message || 'An unexpected error occurred with the avatar.',
    originalError,
    context,
    canRetry: true,
    retryDelay: 2000,
    maxRetries: 1
  }
}

/**
 * Handle avatar errors with appropriate user feedback
 */
export function handleAvatarError(
  error: unknown, 
  context?: string,
  options: {
    showToast?: boolean
    logError?: boolean
    onRetry?: () => void
  } = {}
): AvatarError {
  const { showToast = true, logError = true, onRetry } = options
  
  const avatarError = categorizeAvatarError(error, context)
  
  // Log error for debugging
  if (logError) {
    console.error(`Avatar error [${avatarError.type}] in ${context || 'unknown context'}:`, {
      message: avatarError.message,
      originalError: avatarError.originalError,
      canRetry: avatarError.canRetry
    })
  }

  // Show appropriate toast notification
  if (showToast) {
    if (avatarError.canRetry && onRetry) {
      toast.error(avatarError.message, {
        action: {
          label: 'Retry',
          onClick: onRetry
        },
        duration: 5000
      })
    } else {
      toast.error(avatarError.message, {
        duration: avatarError.canRetry ? 4000 : 6000
      })
    }
  }

  return avatarError
}

/**
 * Create a retry function with exponential backoff
 */
export function createAvatarRetryFunction(
  operation: () => Promise<any>,
  maxRetries: number = 3,
  baseDelay: number = 1000
) {
  return async (currentAttempt: number = 0): Promise<any> => {
    try {
      return await operation()
    } catch (error) {
      const avatarError = categorizeAvatarError(error, 'retry')
      
      if (!avatarError.canRetry || currentAttempt >= maxRetries) {
        throw error
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, currentAttempt)
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay))
      
      // Recursive retry
      return createAvatarRetryFunction(operation, maxRetries, baseDelay)(currentAttempt + 1)
    }
  }
}

/**
 * Validate avatar file before upload
 */
export function validateAvatarFile(
  file: File,
  options: {
    maxSize?: number // in MB
    allowedTypes?: string[]
  } = {}
): AvatarError | null {
  const { maxSize = 5, allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] } = options

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      type: AvatarErrorType.INVALID_FILE_TYPE,
      message: `Invalid file type. Allowed types: ${allowedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')}`,
      canRetry: false
    }
  }

  // Check file size
  const maxSizeInBytes = maxSize * 1024 * 1024
  if (file.size > maxSizeInBytes) {
    return {
      type: AvatarErrorType.FILE_TOO_LARGE,
      message: `File size exceeds ${maxSize}MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
      canRetry: false
    }
  }

  return null
}

/**
 * Avatar error recovery strategies
 */
export const AvatarErrorRecovery = {
  /**
   * Fallback chain for avatar display
   */
  createFallbackChain: (
    primarySrc: string | null,
    fallbackSeeds: string[],
    generateAvatar: (seed: string) => any
  ) => {
    return {
      primary: primarySrc,
      secondary: fallbackSeeds.map(seed => ({
        type: 'generated',
        config: generateAvatar(seed),
        seed
      })),
      tertiary: {
        type: 'initials',
        value: fallbackSeeds[0]?.substring(0, 2).toUpperCase() || 'U'
      }
    }
  },

  /**
   * Progressive image loading with fallbacks
   */
  loadImageWithFallback: async (
    src: string,
    fallbacks: string[] = []
  ): Promise<string> => {
    const tryLoad = (url: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(url)
        img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
        img.src = url
      })
    }

    const sources = [src, ...fallbacks].filter(Boolean)
    
    for (const source of sources) {
      try {
        return await tryLoad(source)
      } catch (error) {
        // Continue to next fallback
        continue
      }
    }
    
    throw new Error('All image sources failed to load')
  },

  /**
   * Smart retry with circuit breaker pattern
   */
  createCircuitBreaker: (
    operation: () => Promise<any>,
    options: {
      failureThreshold?: number
      resetTimeout?: number
      monitoringPeriod?: number
    } = {}
  ) => {
    const { failureThreshold = 5, resetTimeout = 60000, monitoringPeriod = 10000 } = options
    
    let failures = 0
    let lastFailureTime = 0
    let state: 'closed' | 'open' | 'half-open' = 'closed'

    return async (): Promise<any> => {
      const now = Date.now()

      // Reset if enough time has passed
      if (state === 'open' && now - lastFailureTime > resetTimeout) {
        state = 'half-open'
        failures = 0
      }

      // Reject immediately if circuit is open
      if (state === 'open') {
        throw new Error('Circuit breaker is open - too many recent failures')
      }

      try {
        const result = await operation()
        
        // Success - close circuit
        if (state === 'half-open') {
          state = 'closed'
          failures = 0
        }
        
        return result
      } catch (error) {
        failures++
        lastFailureTime = now

        // Open circuit if threshold exceeded
        if (failures >= failureThreshold) {
          state = 'open'
        }

        throw error
      }
    }
  }
}

/**
 * Avatar error metrics for monitoring
 */
export class AvatarErrorMetrics {
  private static errors: Map<AvatarErrorType, number> = new Map()
  private static contexts: Map<string, number> = new Map()

  static recordError(error: AvatarError): void {
    // Record error type
    const currentCount = this.errors.get(error.type) || 0
    this.errors.set(error.type, currentCount + 1)

    // Record context
    if (error.context) {
      const contextCount = this.contexts.get(error.context) || 0
      this.contexts.set(error.context, contextCount + 1)
    }
  }

  static getMetrics(): {
    errorsByType: Record<string, number>
    errorsByContext: Record<string, number>
    totalErrors: number
  } {
    return {
      errorsByType: Object.fromEntries(this.errors),
      errorsByContext: Object.fromEntries(this.contexts),
      totalErrors: Array.from(this.errors.values()).reduce((sum, count) => sum + count, 0)
    }
  }

  static reset(): void {
    this.errors.clear()
    this.contexts.clear()
  }
}