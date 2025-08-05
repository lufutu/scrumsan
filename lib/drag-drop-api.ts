'use client'

import { toast } from 'sonner'

/**
 * API utilities for drag and drop operations with optimistic updates
 * 
 * These functions handle the background API calls while optimistic UI updates
 * have already been applied. They include proper error handling and rollback.
 */

export interface MoveTaskToSprintParams {
  taskId: string
  targetSprintId: string
  position?: number
}

export interface MoveTaskToBacklogParams {
  taskId: string
  sourceSprintId: string
  position?: number
}

export interface MoveTaskToColumnParams {
  taskId: string
  sprintId: string
  columnId: string
  position?: number
}

export interface ReorderTaskParams {
  taskId: string
  position: number
}

/**
 * API call wrapper with consistent error handling
 */
async function apiCall<T>(
  url: string, 
  options: RequestInit, 
  errorMessage: string = 'Operation failed'
): Promise<T> {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`API Error (${url}):`, error)
    throw error instanceof Error ? error : new Error(errorMessage)
  }
}

/**
 * Move task to a sprint
 */
export async function moveTaskToSprint(params: MoveTaskToSprintParams): Promise<void> {
  await apiCall(
    `/api/sprints/${params.targetSprintId}/tasks`,
    {
      method: 'POST',
      body: JSON.stringify({
        taskId: params.taskId,
        position: params.position
      })
    },
    'Failed to move task to sprint'
  )
}

/**
 * Move task to backlog
 */
export async function moveTaskToBacklog(params: MoveTaskToBacklogParams): Promise<void> {
  await apiCall(
    `/api/sprints/${params.sourceSprintId}/tasks/move-to-backlog`,
    {
      method: 'POST',
      body: JSON.stringify({
        taskId: params.taskId,
        position: params.position
      })
    },
    'Failed to move task to backlog'
  )
}

/**
 * Move task between sprint columns
 */
export async function moveTaskToColumn(params: MoveTaskToColumnParams): Promise<void> {
  await apiCall(
    `/api/sprints/${params.sprintId}/tasks/move`,
    {
      method: 'POST',
      body: JSON.stringify({
        taskId: params.taskId,
        targetColumnId: params.columnId,
        position: params.position
      })
    },
    'Failed to move task between columns'
  )
}

/**
 * Update task position (reordering within same container)
 */
export async function reorderTask(params: ReorderTaskParams): Promise<void> {
  await apiCall(
    `/api/tasks/${params.taskId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        position: params.position
      })
    },
    'Failed to reorder task'
  )
}

/**
 * High-level API functions with optimistic update patterns
 */
export const DragDropAPI = {
  /**
   * Execute API operation with optimistic update and error handling
   */
  async withOptimisticUpdate<T>(
    apiOperation: () => Promise<T>,
    onSuccess?: () => void,
    onError?: (error: Error) => void,
    successMessage?: string
  ): Promise<T | null> {
    try {
      const result = await apiOperation()
      
      if (successMessage) {
        toast.success(successMessage)
      }
      
      if (onSuccess) {
        onSuccess()
      }
      
      return result
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Operation failed')
      
      toast.error(errorObj.message)
      
      if (onError) {
        onError(errorObj)
      }
      
      return null
    }
  },

  /**
   * Move task with optimistic updates
   */
  async moveTask(
    operation: 'to-sprint' | 'to-backlog' | 'to-column' | 'reorder',
    params: any,
    onSuccess?: () => void,
    onError?: (error: Error) => void
  ) {
    const operations = {
      'to-sprint': () => moveTaskToSprint(params),
      'to-backlog': () => moveTaskToBacklog(params),
      'to-column': () => moveTaskToColumn(params),
      'reorder': () => reorderTask(params)
    }

    const successMessages = {
      'to-sprint': 'Task moved to sprint successfully',
      'to-backlog': 'Task moved to backlog successfully',
      'to-column': 'Task moved successfully',
      'reorder': 'Task reordered successfully'
    }

    return this.withOptimisticUpdate(
      operations[operation],
      onSuccess,
      onError,
      successMessages[operation]
    )
  }
}