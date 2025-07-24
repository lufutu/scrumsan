/**
 * @fileoverview React hooks for avatar state management
 * 
 * This module provides specialized React hooks for managing avatar state,
 * including upload progress, error handling, and optimistic updates for
 * avatar operations.
 * 
 * Key features:
 * - Avatar upload state management with progress tracking
 * - Optimistic avatar updates with rollback capabilities
 * - Error handling and retry mechanisms
 * - Avatar cache invalidation strategies
 * 
 * @author Avatar Profile Enhancement System
 * @version 1.0.0
 */

'use client'

import { useState, useCallback, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { uploadAvatarToS3, deleteFileFromS3ByUrl } from '@/lib/aws/s3'
import { clearAvatarCache } from '@/lib/avatar-utils'

/**
 * Avatar upload progress state
 */
export interface AvatarUploadProgress {
  loaded: number
  total: number
  percentage: number
}

/**
 * Avatar state
 */
export interface AvatarState {
  currentUrl?: string | null
  isUploading: boolean
  isRemoving: boolean
  uploadProgress?: AvatarUploadProgress
  error?: string | null
  hasUnsavedChanges: boolean
}

/**
 * Avatar upload options
 */
export interface AvatarUploadOptions {
  maxSize?: number // in MB
  allowedTypes?: string[]
  enableOptimisticUpdates?: boolean
  onProgress?: (progress: AvatarUploadProgress) => void
  onSuccess?: (url: string) => void
  onError?: (error: Error) => void
}

/**
 * Hook for managing avatar state with upload progress and optimistic updates
 * 
 * Provides comprehensive avatar state management including upload progress tracking,
 * optimistic updates, error handling, and rollback capabilities.
 * 
 * @param userId - ID of the user whose avatar to manage
 * @param initialAvatarUrl - Initial avatar URL
 * @param options - Configuration options for avatar management
 * @returns Object containing avatar state and operations
 * 
 * @example
 * ```typescript
 * const {
 *   avatarState,
 *   uploadAvatar,
 *   removeAvatar,
 *   resetState,
 *   retryUpload
 * } = useAvatarState('user-123', 'https://example.com/avatar.jpg', {
 *   maxSize: 5,
 *   allowedTypes: ['image/jpeg', 'image/png'],
 *   enableOptimisticUpdates: true
 * });
 * ```
 */
export function useAvatarState(
  userId: string,
  initialAvatarUrl?: string | null,
  options: AvatarUploadOptions = {}
) {
  const {
    maxSize = 5, // 5MB default
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    enableOptimisticUpdates = true,
    onProgress,
    onSuccess,
    onError
  } = options

  const queryClient = useQueryClient()
  const abortControllerRef = useRef<AbortController | null>(null)

  // Avatar state
  const [avatarState, setAvatarState] = useState<AvatarState>({
    currentUrl: initialAvatarUrl,
    isUploading: false,
    isRemoving: false,
    uploadProgress: undefined,
    error: null,
    hasUnsavedChanges: false
  })

  // Store original URL for rollback
  const [originalUrl] = useState(initialAvatarUrl)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  /**
   * Validate file before upload
   */
  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
    }

    // Check file size
    const maxSizeInBytes = maxSize * 1024 * 1024
    if (file.size > maxSizeInBytes) {
      return `File size exceeds ${maxSize}MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`
    }

    return null
  }, [allowedTypes, maxSize])

  /**
   * Upload avatar mutation
   */
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Create abort controller for this upload
      abortControllerRef.current = new AbortController()

      // Simulate progress tracking (S3 SDK doesn't provide built-in progress)
      const simulateProgress = () => {
        let loaded = 0
        const total = file.size
        const interval = setInterval(() => {
          loaded = Math.min(loaded + total * 0.1, total * 0.9) // Stop at 90%
          const progress = {
            loaded,
            total,
            percentage: Math.round((loaded / total) * 100)
          }
          
          setAvatarState(prev => ({ ...prev, uploadProgress: progress }))
          onProgress?.(progress)
          
          if (loaded >= total * 0.9) {
            clearInterval(interval)
          }
        }, 200)

        // Clear interval when upload completes or fails
        abortControllerRef.current?.signal.addEventListener('abort', () => {
          clearInterval(interval)
        })

        return interval
      }

      const progressInterval = simulateProgress()

      try {
        const result = await uploadAvatarToS3(userId, file)
        
        // Complete progress
        const finalProgress = {
          loaded: file.size,
          total: file.size,
          percentage: 100
        }
        setAvatarState(prev => ({ ...prev, uploadProgress: finalProgress }))
        onProgress?.(finalProgress)
        
        clearInterval(progressInterval)
        return result
      } catch (error) {
        clearInterval(progressInterval)
        throw error
      }
    },
    onMutate: (file) => {
      // Set uploading state
      setAvatarState(prev => ({
        ...prev,
        isUploading: true,
        error: null,
        uploadProgress: { loaded: 0, total: file.size, percentage: 0 }
      }))

      // Apply optimistic update if enabled
      if (enableOptimisticUpdates) {
        const optimisticUrl = URL.createObjectURL(file)
        setAvatarState(prev => ({
          ...prev,
          currentUrl: optimisticUrl,
          hasUnsavedChanges: true
        }))
      }
    },
    onSuccess: (result) => {
      // Update with actual URL
      setAvatarState(prev => ({
        ...prev,
        currentUrl: result.url,
        isUploading: false,
        uploadProgress: undefined,
        hasUnsavedChanges: false,
        error: null
      }))

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
      queryClient.invalidateQueries({ queryKey: ['avatarConfig'] })

      // Clear avatar cache
      clearAvatarCache(userId)

      onSuccess?.(result.url)
      toast.success('Avatar uploaded successfully!')
      setPendingFile(null)
    },
    onError: (error: Error) => {
      // Rollback optimistic update
      if (enableOptimisticUpdates) {
        setAvatarState(prev => ({
          ...prev,
          currentUrl: originalUrl,
          hasUnsavedChanges: false
        }))
      }

      setAvatarState(prev => ({
        ...prev,
        isUploading: false,
        uploadProgress: undefined,
        error: error.message
      }))

      onError?.(error)
      toast.error(error.message)
    }
  })

  /**
   * Remove avatar mutation
   */
  const removeMutation = useMutation({
    mutationFn: async (avatarUrl: string) => {
      await deleteFileFromS3ByUrl(avatarUrl)
    },
    onMutate: () => {
      setAvatarState(prev => ({
        ...prev,
        isRemoving: true,
        error: null
      }))

      // Apply optimistic update if enabled
      if (enableOptimisticUpdates) {
        setAvatarState(prev => ({
          ...prev,
          currentUrl: null,
          hasUnsavedChanges: true
        }))
      }
    },
    onSuccess: () => {
      setAvatarState(prev => ({
        ...prev,
        currentUrl: null,
        isRemoving: false,
        hasUnsavedChanges: false,
        error: null
      }))

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
      queryClient.invalidateQueries({ queryKey: ['avatarConfig'] })

      // Clear avatar cache
      clearAvatarCache(userId)

      toast.success('Avatar removed successfully!')
    },
    onError: (error: Error) => {
      // Rollback optimistic update
      if (enableOptimisticUpdates) {
        setAvatarState(prev => ({
          ...prev,
          currentUrl: originalUrl,
          hasUnsavedChanges: false
        }))
      }

      setAvatarState(prev => ({
        ...prev,
        isRemoving: false,
        error: error.message
      }))

      toast.error(error.message)
    }
  })

  /**
   * Upload avatar with validation
   */
  const uploadAvatar = useCallback(async (file: File) => {
    // Validate file
    const validationError = validateFile(file)
    if (validationError) {
      setAvatarState(prev => ({ ...prev, error: validationError }))
      toast.error(validationError)
      return
    }

    // Store pending file for retry
    setPendingFile(file)

    // Start upload
    return uploadMutation.mutateAsync(file)
  }, [validateFile, uploadMutation])

  /**
   * Remove avatar
   */
  const removeAvatar = useCallback(async () => {
    if (!avatarState.currentUrl) {
      toast.error('No avatar to remove')
      return
    }

    return removeMutation.mutateAsync(avatarState.currentUrl)
  }, [avatarState.currentUrl, removeMutation])

  /**
   * Cancel ongoing upload
   */
  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    // Reset state
    setAvatarState(prev => ({
      ...prev,
      isUploading: false,
      uploadProgress: undefined,
      currentUrl: originalUrl,
      hasUnsavedChanges: false,
      error: null
    }))

    setPendingFile(null)
    toast.info('Upload cancelled')
  }, [originalUrl])

  /**
   * Retry failed upload
   */
  const retryUpload = useCallback(() => {
    if (pendingFile) {
      uploadAvatar(pendingFile)
    } else {
      toast.error('No file to retry')
    }
  }, [pendingFile, uploadAvatar])

  /**
   * Reset avatar state
   */
  const resetState = useCallback(() => {
    // Cancel any ongoing operations
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setAvatarState({
      currentUrl: originalUrl,
      isUploading: false,
      isRemoving: false,
      uploadProgress: undefined,
      error: null,
      hasUnsavedChanges: false
    })

    setPendingFile(null)
  }, [originalUrl])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setAvatarState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    avatarState,
    uploadAvatar,
    removeAvatar,
    cancelUpload,
    retryUpload,
    resetState,
    clearError,
    isUploading: uploadMutation.isPending,
    isRemoving: removeMutation.isPending
  }
}

/**
 * Hook for managing avatar preview state
 * 
 * Provides avatar preview functionality with drag & drop support
 * and temporary preview generation.
 * 
 * @param options - Configuration options for preview management
 * @returns Object containing preview state and operations
 * 
 * @example
 * ```typescript
 * const {
 *   previewUrl,
 *   isDragging,
 *   setPreviewFile,
 *   clearPreview,
 *   handleDragEvents
 * } = useAvatarPreview({
 *   maxSize: 5,
 *   allowedTypes: ['image/jpeg', 'image/png']
 * });
 * ```
 */
export function useAvatarPreview(options: {
  maxSize?: number
  allowedTypes?: string[]
  onFileSelect?: (file: File) => void
  onError?: (error: string) => void
} = {}) {
  const {
    maxSize = 5,
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    onFileSelect,
    onError
  } = options

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [previewFile, setPreviewFileState] = useState<File | null>(null)

  /**
   * Validate and set preview file
   */
  const setPreviewFile = useCallback((file: File) => {
    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      const error = `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
      onError?.(error)
      return false
    }

    // Validate file size
    const maxSizeInBytes = maxSize * 1024 * 1024
    if (file.size > maxSizeInBytes) {
      const error = `File size exceeds ${maxSize}MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`
      onError?.(error)
      return false
    }

    // Create preview URL
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setPreviewFileState(file)
    onFileSelect?.(file)
    return true
  }, [allowedTypes, maxSize, onFileSelect, onError])

  /**
   * Clear preview
   */
  const clearPreview = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setPreviewFileState(null)
  }, [previewUrl])

  /**
   * Handle drag events
   */
  const handleDragEvents = {
    onDragEnter: useCallback((e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(true)
    }, []),

    onDragLeave: useCallback((e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
    }, []),

    onDragOver: useCallback((e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }, []),

    onDrop: useCallback((e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        setPreviewFile(files[0])
      }
    }, [setPreviewFile])
  }

  // Cleanup preview URL on unmount
  useState(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  })

  return {
    previewUrl,
    previewFile,
    isDragging,
    setPreviewFile,
    clearPreview,
    handleDragEvents
  }
}