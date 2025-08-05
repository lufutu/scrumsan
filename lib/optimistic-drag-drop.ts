'use client'

import { useState, useCallback, useMemo } from 'react'
import { Task, Sprint } from '@/types/shared'

/**
 * Optimistic Drag and Drop State Management
 * 
 * This utility provides a clean way to manage optimistic UI updates during drag operations
 * without fighting with React Query cache management. 
 * 
 * Key principles:
 * 1. Immediate visual feedback during drag operations
 * 2. Background API calls with error handling
 * 3. Clean rollback on failures
 * 4. Simple React state management
 */

export type DragState = 'idle' | 'dragging' | 'dropping'

export interface OptimisticDragState {
  state: DragState
  draggedTaskId: string | null
  sourceSprintId: string | null
  targetSprintId: string | null
  targetColumnId: string | null
}

export interface OptimisticTaskUpdate {
  taskId: string
  sprintId?: string | null
  sprintColumnId?: string | null
  columnId?: string | null
  position?: number
}

/**
 * Hook for managing optimistic drag and drop state
 */
export function useOptimisticDragDrop(initialTasks: Task[] = []) {
  // Drag state tracking
  const [dragState, setDragState] = useState<OptimisticDragState>({
    state: 'idle',
    draggedTaskId: null,
    sourceSprintId: null,
    targetSprintId: null,
    targetColumnId: null
  })

  // Optimistic task updates
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, OptimisticTaskUpdate>>(new Map())

  // Clear all optimistic state
  const clearOptimisticState = useCallback(() => {
    setDragState({
      state: 'idle',
      draggedTaskId: null,
      sourceSprintId: null,
      targetSprintId: null,
      targetColumnId: null
    })
    setOptimisticUpdates(new Map())
  }, [])

  // Start drag operation
  const startDrag = useCallback((taskId: string, sourceSprintId: string | null) => {
    setDragState({
      state: 'dragging',
      draggedTaskId: taskId,
      sourceSprintId,
      targetSprintId: null,
      targetColumnId: null
    })
  }, [])

  // Update drag target (for visual feedback during drag)
  const updateDragTarget = useCallback((targetSprintId: string | null, targetColumnId: string | null) => {
    setDragState(prev => ({
      ...prev,
      targetSprintId,
      targetColumnId
    }))
  }, [])

  // Apply optimistic task update
  const applyOptimisticUpdate = useCallback((taskId: string, update: Partial<OptimisticTaskUpdate>) => {
    setOptimisticUpdates(prev => {
      const newMap = new Map(prev)
      const existingUpdate = newMap.get(taskId) || { taskId }
      newMap.set(taskId, { ...existingUpdate, ...update })
      return newMap
    })
    
    setDragState(prev => ({ ...prev, state: 'dropping' }))
  }, [])

  // Get tasks with optimistic updates applied
  const getOptimisticTasks = useMemo(() => {
    if (dragState.state === 'idle' || optimisticUpdates.size === 0) {
      return initialTasks
    }

    return initialTasks.map(task => {
      const update = optimisticUpdates.get(task.id)
      if (!update) return task

      return {
        ...task,
        sprintId: update.sprintId !== undefined ? update.sprintId : task.sprintId,
        sprintColumnId: update.sprintColumnId !== undefined ? update.sprintColumnId : task.sprintColumnId,
        columnId: update.columnId !== undefined ? update.columnId : task.columnId,
        position: update.position !== undefined ? update.position : task.position
      }
    })
  }, [initialTasks, optimisticUpdates, dragState.state])

  // Rollback specific task update (on API error)
  const rollbackTaskUpdate = useCallback((taskId: string) => {
    setOptimisticUpdates(prev => {
      const newMap = new Map(prev)
      newMap.delete(taskId)
      return newMap
    })
  }, [])

  return {
    // State
    dragState,
    optimisticTasks: getOptimisticTasks,
    isDragging: dragState.state === 'dragging',
    isDropping: dragState.state === 'dropping',
    
    // Actions
    startDrag,
    updateDragTarget,
    applyOptimisticUpdate,
    clearOptimisticState,
    rollbackTaskUpdate
  }
}

/**
 * Utility functions for common drag and drop operations
 */
export const DragDropUtils = {
  /**
   * Move a task to a different sprint
   */
  moveTaskToSprint: (taskId: string, targetSprintId: string | null, targetColumnId: string | null = null): OptimisticTaskUpdate => ({
    taskId,
    sprintId: targetSprintId,
    sprintColumnId: targetColumnId,
    columnId: null // Clear board column when moving to sprint
  }),

  /**
   * Move a task to a different sprint column
   */
  moveTaskToSprintColumn: (taskId: string, targetSprintId: string, targetColumnId: string): OptimisticTaskUpdate => ({
    taskId,
    sprintId: targetSprintId,
    sprintColumnId: targetColumnId,
    columnId: null
  }),

  /**
   * Move a task to backlog
   */
  moveTaskToBacklog: (taskId: string): OptimisticTaskUpdate => ({
    taskId,
    sprintId: null,
    sprintColumnId: null,
    columnId: null
  }),

  /**
   * Move a task to a board column (Kanban)
   */
  moveTaskToBoardColumn: (taskId: string, targetColumnId: string): OptimisticTaskUpdate => ({
    taskId,
    sprintId: null,
    sprintColumnId: null,
    columnId: targetColumnId
  }),

  /**
   * Update task position within same container
   */
  updateTaskPosition: (taskId: string, position: number): OptimisticTaskUpdate => ({
    taskId,
    position
  })
}

/**
 * Type guards for drag data
 */
export const DragDataTypes = {
  isTask: (data: unknown): data is { type: 'task'; taskId: string; sprintId?: string | null } => {
    return typeof data === 'object' && 
           data !== null && 
           'type' in data && 
           data.type === 'task' &&
           'taskId' in data &&
           typeof (data as any).taskId === 'string'
  },

  isSprintColumn: (data: unknown): data is { type: 'sprint-column'; sprintId: string; columnId: string } => {
    return typeof data === 'object' && 
           data !== null && 
           'type' in data && 
           data.type === 'sprint-column' &&
           'sprintId' in data &&
           'columnId' in data
  },

  isBacklog: (data: unknown): data is { type: 'backlog' } => {
    return typeof data === 'object' && 
           data !== null && 
           'type' in data && 
           data.type === 'backlog'
  }
}