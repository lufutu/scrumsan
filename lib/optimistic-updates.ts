import { toast } from 'sonner'

export interface OptimisticUpdate<T> {
  id: string
  type: 'create' | 'update' | 'delete'
  data: T
  originalData?: T
  timestamp: number
}

export interface OptimisticState<T> {
  items: T[]
  pendingUpdates: OptimisticUpdate<T>[]
  isOptimistic: boolean
}

export class OptimisticUpdater<T extends { id: string }> {
  private pendingUpdates = new Map<string, OptimisticUpdate<T>>()
  private rollbackCallbacks = new Map<string, () => void>()

  constructor(
    private updateCallback: (items: T[]) => void,
    private errorCallback?: (error: Error, update: OptimisticUpdate<T>) => void
  ) {}

  // Apply optimistic update immediately
  applyOptimisticUpdate(
    currentItems: T[],
    update: Omit<OptimisticUpdate<T>, 'id' | 'timestamp'>
  ): { items: T[]; updateId: string } {
    const updateId = `${update.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const optimisticUpdate: OptimisticUpdate<T> = {
      ...update,
      id: updateId,
      timestamp: Date.now()
    }

    this.pendingUpdates.set(updateId, optimisticUpdate)

    let updatedItems: T[]

    switch (update.type) {
      case 'create':
        updatedItems = [...currentItems, update.data]
        break
      case 'update':
        updatedItems = currentItems.map(item =>
          item.id === update.data.id ? { ...item, ...update.data } : item
        )
        break
      case 'delete':
        updatedItems = currentItems.filter(item => item.id !== update.data.id)
        break
      default:
        updatedItems = currentItems
    }

    this.updateCallback(updatedItems)
    return { items: updatedItems, updateId }
  }

  // Confirm optimistic update (remove from pending)
  confirmUpdate(updateId: string): void {
    this.pendingUpdates.delete(updateId)
    this.rollbackCallbacks.delete(updateId)
  }

  // Rollback optimistic update
  rollbackUpdate(updateId: string, currentItems: T[]): T[] {
    const update = this.pendingUpdates.get(updateId)
    if (!update) return currentItems

    let rolledBackItems: T[]

    switch (update.type) {
      case 'create':
        rolledBackItems = currentItems.filter(item => item.id !== update.data.id)
        break
      case 'update':
        if (update.originalData) {
          rolledBackItems = currentItems.map(item =>
            item.id === update.data.id ? update.originalData! : item
          )
        } else {
          rolledBackItems = currentItems
        }
        break
      case 'delete':
        if (update.originalData) {
          rolledBackItems = [...currentItems, update.originalData]
        } else {
          rolledBackItems = currentItems
        }
        break
      default:
        rolledBackItems = currentItems
    }

    this.pendingUpdates.delete(updateId)
    this.rollbackCallbacks.delete(updateId)
    this.updateCallback(rolledBackItems)

    // Just log the rollback, don't call error callbacks to avoid disrupting UX
    if (update) {
      console.warn('Optimistic update rolled back:', update)
    }

    return rolledBackItems
  }

  // Execute actual operation with optimistic update
  async executeWithOptimism<R>(
    currentItems: T[],
    optimisticUpdate: Omit<OptimisticUpdate<T>, 'id' | 'timestamp'>,
    operation: () => Promise<R>,
    options: {
      successMessage?: string
      errorMessage?: string
      showToast?: boolean
      rollbackDelay?: number
    } = {}
  ): Promise<R> {
    const {
      successMessage,
      errorMessage = 'Operation failed',
      showToast = true,
      rollbackDelay = 0
    } = options

    // Apply optimistic update
    const { updateId } = this.applyOptimisticUpdate(currentItems, optimisticUpdate)

    try {
      // Execute actual operation
      const result = await operation()

      // Confirm the optimistic update
      this.confirmUpdate(updateId)

      // Show success message
      if (showToast && successMessage) {
        toast.success(successMessage)
      }

      return result
    } catch (error) {
      // Rollback after delay (if specified)
      if (rollbackDelay > 0) {
        setTimeout(() => {
          this.rollbackUpdate(updateId, currentItems)
        }, rollbackDelay)
      } else {
        this.rollbackUpdate(updateId, currentItems)
      }

      // Show error message
      if (showToast) {
        toast.error(errorMessage)
      }

      throw error
    }
  }

  // Get pending updates
  getPendingUpdates(): OptimisticUpdate<T>[] {
    return Array.from(this.pendingUpdates.values())
  }

  // Check if there are pending updates
  hasPendingUpdates(): boolean {
    return this.pendingUpdates.size > 0
  }

  // Clear all pending updates
  clearPendingUpdates(): void {
    this.pendingUpdates.clear()
    this.rollbackCallbacks.clear()
  }
}

// React hook for optimistic updates
export function useOptimisticUpdates<T extends { id: string }>(
  items: T[],
  setItems: (items: T[]) => void
) {
  const updater = new OptimisticUpdater<T>(
    setItems,
    (error, update) => {
      console.error('Optimistic update failed:', error, update)
    }
  )

  const optimisticCreate = async (
    newItem: T,
    operation: () => Promise<T>,
    options?: {
      successMessage?: string
      errorMessage?: string
    }
  ) => {
    return updater.executeWithOptimism(
      items,
      { type: 'create', data: newItem },
      operation,
      {
        successMessage: options?.successMessage || 'Item created successfully',
        errorMessage: options?.errorMessage || 'Failed to create item',
        showToast: true
      }
    )
  }

  const optimisticUpdate = async (
    updatedItem: T,
    operation: () => Promise<T>,
    options?: {
      successMessage?: string
      errorMessage?: string
    }
  ) => {
    const originalItem = items.find(item => item.id === updatedItem.id)
    
    return updater.executeWithOptimism(
      items,
      { 
        type: 'update', 
        data: updatedItem, 
        originalData: originalItem 
      },
      operation,
      {
        successMessage: options?.successMessage || 'Item updated successfully',
        errorMessage: options?.errorMessage || 'Failed to update item',
        showToast: true
      }
    )
  }

  const optimisticDelete = async (
    itemToDelete: T,
    operation: () => Promise<void>,
    options?: {
      successMessage?: string
      errorMessage?: string
    }
  ) => {
    return updater.executeWithOptimism(
      items,
      { 
        type: 'delete', 
        data: itemToDelete, 
        originalData: itemToDelete 
      },
      operation,
      {
        successMessage: options?.successMessage || 'Item deleted successfully',
        errorMessage: options?.errorMessage || 'Failed to delete item',
        showToast: true
      }
    )
  }

  return {
    optimisticCreate,
    optimisticUpdate,
    optimisticDelete,
    hasPendingUpdates: () => updater.hasPendingUpdates(),
    getPendingUpdates: () => updater.getPendingUpdates(),
    clearPendingUpdates: () => updater.clearPendingUpdates()
  }
}

// Utility functions for common optimistic update patterns
export const optimisticUpdatePatterns = {
  // Member management patterns
  addMember: <T extends { id: string; user: { fullName?: string; email: string } }>(
    member: T
  ) => ({
    successMessage: `${member.user.fullName || member.user.email} added to organization`,
    errorMessage: 'Failed to add member to organization'
  }),

  removeMember: <T extends { id: string; user: { fullName?: string; email: string } }>(
    member: T
  ) => ({
    successMessage: `${member.user.fullName || member.user.email} removed from organization`,
    errorMessage: 'Failed to remove member from organization'
  }),

  updateMemberRole: <T extends { id: string; user: { fullName?: string; email: string }; role: string }>(
    member: T
  ) => ({
    successMessage: `${member.user.fullName || member.user.email}'s role updated to ${member.role}`,
    errorMessage: 'Failed to update member role'
  }),

  // Permission set patterns
  createPermissionSet: (name: string) => ({
    successMessage: `Permission set "${name}" created successfully`,
    errorMessage: 'Failed to create permission set'
  }),

  updatePermissionSet: (name: string) => ({
    successMessage: `Permission set "${name}" updated successfully`,
    errorMessage: 'Failed to update permission set'
  }),

  deletePermissionSet: (name: string) => ({
    successMessage: `Permission set "${name}" deleted successfully`,
    errorMessage: 'Failed to delete permission set'
  }),

  // Engagement patterns
  createEngagement: (projectName: string) => ({
    successMessage: `Engagement with ${projectName} created successfully`,
    errorMessage: 'Failed to create engagement'
  }),

  updateEngagement: (projectName: string) => ({
    successMessage: `Engagement with ${projectName} updated successfully`,
    errorMessage: 'Failed to update engagement'
  }),

  deleteEngagement: (projectName: string) => ({
    successMessage: `Engagement with ${projectName} removed successfully`,
    errorMessage: 'Failed to remove engagement'
  }),

  // Time-off patterns
  createTimeOff: (type: string) => ({
    successMessage: `${type.replace('_', ' ')} request created successfully`,
    errorMessage: 'Failed to create time-off request'
  }),

  updateTimeOff: (type: string) => ({
    successMessage: `${type.replace('_', ' ')} request updated successfully`,
    errorMessage: 'Failed to update time-off request'
  }),

  deleteTimeOff: (type: string) => ({
    successMessage: `${type.replace('_', ' ')} request deleted successfully`,
    errorMessage: 'Failed to delete time-off request'
  })
}

// Debounced optimistic updates for real-time scenarios
export function createDebouncedOptimisticUpdate<T extends { id: string }>(
  updater: OptimisticUpdater<T>,
  delay: number = 500
) {
  const timeouts = new Map<string, NodeJS.Timeout>()

  return (
    currentItems: T[],
    optimisticUpdate: Omit<OptimisticUpdate<T>, 'id' | 'timestamp'>,
    operation: () => Promise<any>,
    options?: {
      successMessage?: string
      errorMessage?: string
    }
  ) => {
    const key = `${optimisticUpdate.type}_${optimisticUpdate.data.id}`
    
    // Clear existing timeout
    const existingTimeout = timeouts.get(key)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Apply optimistic update immediately
    const { updateId } = updater.applyOptimisticUpdate(currentItems, optimisticUpdate)

    // Set new timeout for actual operation
    const timeout = setTimeout(async () => {
      try {
        await operation()
        updater.confirmUpdate(updateId)
        
        if (options?.successMessage) {
          toast.success(options.successMessage)
        }
      } catch (error) {
        updater.rollbackUpdate(updateId, currentItems)
        
        if (options?.errorMessage) {
          toast.error(options.errorMessage)
        }
      } finally {
        timeouts.delete(key)
      }
    }, delay)

    timeouts.set(key, timeout)

    return updateId
  }
}