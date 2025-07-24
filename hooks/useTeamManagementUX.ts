import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { useOptimisticUpdates, optimisticUpdatePatterns } from '@/lib/optimistic-updates'
import { useTeamManagementErrors, createRetryHandler } from './useTeamManagementErrors'

interface UXOptions {
  showSuccessToast?: boolean
  showErrorToast?: boolean
  enableOptimisticUpdates?: boolean
  enableRetry?: boolean
  maxRetries?: number
  retryDelay?: number
}

interface OperationState {
  isLoading: boolean
  error: any
  hasSucceeded: boolean
  retryCount: number
}

export function useTeamManagementUX<T extends { id: string }>(
  items: T[],
  setItems: (items: T[]) => void,
  defaultOptions: UXOptions = {}
) {
  const [operationStates, setOperationStates] = useState<Record<string, OperationState>>({})
  const operationTimeouts = useRef<Record<string, NodeJS.Timeout>>({})
  
  const { handleAndShowError } = useTeamManagementErrors()
  const optimisticUpdates = useOptimisticUpdates(items, setItems)

  const updateOperationState = useCallback((
    operationId: string, 
    updates: Partial<OperationState>
  ) => {
    setOperationStates(prev => ({
      ...prev,
      [operationId]: {
        isLoading: false,
        error: null,
        hasSucceeded: false,
        retryCount: 0,
        ...prev[operationId],
        ...updates
      }
    }))
  }, [])

  const clearOperationState = useCallback((operationId: string) => {
    setOperationStates(prev => {
      const newState = { ...prev }
      delete newState[operationId]
      return newState
    })
    
    // Clear any pending timeouts
    if (operationTimeouts.current[operationId]) {
      clearTimeout(operationTimeouts.current[operationId])
      delete operationTimeouts.current[operationId]
    }
  }, [])

  const executeOperation = useCallback(async <R>(
    operationId: string,
    operation: () => Promise<R>,
    options: UXOptions & {
      successMessage?: string
      errorMessage?: string
      optimisticUpdate?: {
        type: 'create' | 'update' | 'delete'
        data: T
        originalData?: T
      }
    } = {}
  ): Promise<R> => {
    const finalOptions = { ...defaultOptions, ...options }
    const {
      showSuccessToast = true,
      showErrorToast = true,
      enableOptimisticUpdates = true,
      enableRetry = true,
      maxRetries = 3,
      retryDelay = 1000,
      successMessage,
      errorMessage,
      optimisticUpdate
    } = finalOptions

    // Update operation state to loading
    updateOperationState(operationId, { isLoading: true, error: null })

    try {
      let result: R

      // Execute with optimistic updates if enabled and update provided
      if (enableOptimisticUpdates && optimisticUpdate) {
        result = await optimisticUpdates.optimisticUpdate(
          optimisticUpdate.data,
          operation,
          {
            successMessage: showSuccessToast ? successMessage : undefined,
            errorMessage: showErrorToast ? errorMessage : undefined
          }
        )
      } else {
        // Create retry handler if enabled
        const operationToExecute = enableRetry 
          ? createRetryHandler(operation, maxRetries, retryDelay)
          : operation

        result = await operationToExecute()

        // Show success toast if enabled
        if (showSuccessToast && successMessage) {
          toast.success(successMessage)
        }
      }

      // Update operation state to success
      updateOperationState(operationId, { 
        isLoading: false, 
        hasSucceeded: true,
        error: null 
      })

      // Clear operation state after a delay
      operationTimeouts.current[operationId] = setTimeout(() => {
        clearOperationState(operationId)
      }, 3000)

      return result
    } catch (error) {
      // Handle and show error if enabled
      const teamError = showErrorToast 
        ? handleAndShowError(error, errorMessage)
        : error

      // Update operation state to error
      updateOperationState(operationId, { 
        isLoading: false, 
        error: teamError,
        retryCount: (operationStates[operationId]?.retryCount || 0) + 1
      })

      throw teamError
    }
  }, [
    defaultOptions,
    updateOperationState,
    optimisticUpdates,
    handleAndShowError,
    operationStates,
    clearOperationState
  ])

  // Specialized methods for common team management operations
  const createMember = useCallback(async (
    newMember: T,
    operation: () => Promise<T>,
    options: Omit<UXOptions, 'optimisticUpdate'> & { successMessage?: string } = {}
  ) => {
    const memberName = (newMember as any).user?.fullName || (newMember as any).user?.email || 'Member'
    
    return executeOperation(
      `create_member_${newMember.id}`,
      operation,
      {
        ...options,
        successMessage: options.successMessage || `${memberName} added successfully`,
        errorMessage: 'Failed to add member',
        optimisticUpdate: {
          type: 'create',
          data: newMember
        }
      }
    )
  }, [executeOperation])

  const updateMember = useCallback(async (
    updatedMember: T,
    operation: () => Promise<T>,
    options: Omit<UXOptions, 'optimisticUpdate'> & { successMessage?: string } = {}
  ) => {
    const memberName = (updatedMember as any).user?.fullName || (updatedMember as any).user?.email || 'Member'
    const originalMember = items.find(item => item.id === updatedMember.id)
    
    return executeOperation(
      `update_member_${updatedMember.id}`,
      operation,
      {
        ...options,
        successMessage: options.successMessage || `${memberName} updated successfully`,
        errorMessage: 'Failed to update member',
        optimisticUpdate: {
          type: 'update',
          data: updatedMember,
          originalData: originalMember
        }
      }
    )
  }, [executeOperation, items])

  const deleteMember = useCallback(async (
    memberToDelete: T,
    operation: () => Promise<void>,
    options: Omit<UXOptions, 'optimisticUpdate'> & { successMessage?: string } = {}
  ) => {
    const memberName = (memberToDelete as any).user?.fullName || (memberToDelete as any).user?.email || 'Member'
    
    return executeOperation(
      `delete_member_${memberToDelete.id}`,
      operation,
      {
        ...options,
        successMessage: options.successMessage || `${memberName} removed successfully`,
        errorMessage: 'Failed to remove member',
        optimisticUpdate: {
          type: 'delete',
          data: memberToDelete,
          originalData: memberToDelete
        }
      }
    )
  }, [executeOperation])

  // Generic CRUD operations
  const createItem = useCallback(async (
    newItem: T,
    operation: () => Promise<T>,
    options: UXOptions & { successMessage?: string; errorMessage?: string } = {}
  ) => {
    return executeOperation(
      `create_${newItem.id}`,
      operation,
      {
        ...options,
        optimisticUpdate: {
          type: 'create',
          data: newItem
        }
      }
    )
  }, [executeOperation])

  const updateItem = useCallback(async (
    updatedItem: T,
    operation: () => Promise<T>,
    options: UXOptions & { successMessage?: string; errorMessage?: string } = {}
  ) => {
    const originalItem = items.find(item => item.id === updatedItem.id)
    
    return executeOperation(
      `update_${updatedItem.id}`,
      operation,
      {
        ...options,
        optimisticUpdate: {
          type: 'update',
          data: updatedItem,
          originalData: originalItem
        }
      }
    )
  }, [executeOperation, items])

  const deleteItem = useCallback(async (
    itemToDelete: T,
    operation: () => Promise<void>,
    options: UXOptions & { successMessage?: string; errorMessage?: string } = {}
  ) => {
    return executeOperation(
      `delete_${itemToDelete.id}`,
      operation,
      {
        ...options,
        optimisticUpdate: {
          type: 'delete',
          data: itemToDelete,
          originalData: itemToDelete
        }
      }
    )
  }, [executeOperation])

  // Retry a failed operation
  const retryOperation = useCallback(async (operationId: string) => {
    const state = operationStates[operationId]
    if (!state || !state.error) return

    // Clear the error and retry
    updateOperationState(operationId, { error: null, isLoading: true })
    
    // Note: This would need to be implemented with stored operation references
    // For now, we'll just clear the error state
    toast.info('Please try the operation again')
    clearOperationState(operationId)
  }, [operationStates, updateOperationState, clearOperationState])

  // Get operation state
  const getOperationState = useCallback((operationId: string): OperationState => {
    return operationStates[operationId] || {
      isLoading: false,
      error: null,
      hasSucceeded: false,
      retryCount: 0
    }
  }, [operationStates])

  // Check if any operations are loading
  const hasLoadingOperations = useCallback(() => {
    return Object.values(operationStates).some(state => state.isLoading)
  }, [operationStates])

  // Get all failed operations
  const getFailedOperations = useCallback(() => {
    return Object.entries(operationStates)
      .filter(([_, state]) => state.error)
      .map(([id, state]) => ({ id, ...state }))
  }, [operationStates])

  // Clear all operation states
  const clearAllOperationStates = useCallback(() => {
    setOperationStates({})
    Object.values(operationTimeouts.current).forEach(timeout => clearTimeout(timeout))
    operationTimeouts.current = {}
  }, [])

  return {
    // Core operation execution
    executeOperation,
    
    // Specialized member operations
    createMember,
    updateMember,
    deleteMember,
    
    // Generic CRUD operations
    createItem,
    updateItem,
    deleteItem,
    
    // Operation state management
    getOperationState,
    retryOperation,
    clearOperationState,
    clearAllOperationStates,
    
    // Utility methods
    hasLoadingOperations,
    getFailedOperations,
    
    // Direct access to optimistic updates
    optimisticUpdates
  }
}

// Hook for managing confirmation dialogs with UX enhancements
export function useConfirmationDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [config, setConfig] = useState<{
    title: string
    description: string
    confirmText?: string
    onConfirm: () => Promise<void> | void
  } | null>(null)

  const openDialog = useCallback((dialogConfig: typeof config) => {
    setConfig(dialogConfig)
    setIsOpen(true)
  }, [])

  const closeDialog = useCallback(() => {
    if (!isLoading) {
      setIsOpen(false)
      setConfig(null)
    }
  }, [isLoading])

  const handleConfirm = useCallback(async () => {
    if (!config?.onConfirm || isLoading) return

    setIsLoading(true)
    try {
      await config.onConfirm()
      closeDialog()
    } catch (error) {
      // Error handling is done by the operation itself
      console.error('Confirmation action failed:', error)
    } finally {
      setIsLoading(false)
    }
  }, [config, isLoading, closeDialog])

  return {
    isOpen,
    isLoading,
    config,
    openDialog,
    closeDialog,
    handleConfirm
  }
}