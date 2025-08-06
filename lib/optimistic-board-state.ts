'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { Task, Sprint } from '@/types/shared'
import { toast } from 'sonner'

/**
 * Optimistic Board State Management
 * 
 * This handles immediate UI updates during drag operations,
 * similar to Trello's smooth drag experience.
 * 
 * Key principles:
 * 1. Immediate local state updates during drag
 * 2. No API calls during drag operations
 * 3. Background API sync after drag completes
 * 4. Rollback on API failure
 */

export interface OptimisticBoardState {
  // Current data with optimistic updates
  tasks: Task[]
  sprints: Sprint[]
  
  // Drag state
  isDragging: boolean
  draggedTaskId: string | null
  
  // Actions
  moveTaskImmediate: (taskId: string, targetSprintId: string | null, targetColumnId: string | null) => MoveOperation | null
  commitMove: (operation: MoveOperation, onSuccess?: () => void, onError?: (error: Error) => void) => Promise<void>
  rollbackMove: () => void
  clearDragState: () => void
}

export interface MoveOperation {
  taskId: string
  originalTask: Task
  targetSprintId: string | null
  targetColumnId: string | null
}

export function useOptimisticBoardState(
  initialTasks: Task[],
  initialSprints: Sprint[],
  onApiSync?: (operation: MoveOperation) => Promise<void>
): OptimisticBoardState {
  
  // Core state
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [sprints, setSprints] = useState<Sprint[]>(initialSprints)
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [pendingOperation, setPendingOperation] = useState<MoveOperation | null>(null)
  
  // Store original state for rollback
  const [originalTasks, setOriginalTasks] = useState<Task[]>(initialTasks)
  
  // Update state when external data changes (from React Query, etc)
  // But only if we're not in the middle of a drag operation
  useEffect(() => {
    if (!isDragging && !pendingOperation) {
      console.log('🔄 Updating optimistic state with fresh data from React Query')
      setTasks(initialTasks)
      setSprints(initialSprints)
      setOriginalTasks(initialTasks)
    } else {
      console.log('⏸️ Skipping React Query update - drag operation in progress', {
        isDragging,
        hasPendingOperation: !!pendingOperation
      })
    }
  }, [initialTasks, initialSprints, isDragging, pendingOperation])
  
  // Immediate move operation (no API calls)
  const moveTaskImmediate = useCallback((
    taskId: string, 
    targetSprintId: string | null, 
    targetColumnId: string | null
  ) => {
    console.log('🎯 moveTaskImmediate called:', { taskId, targetSprintId, targetColumnId })
    
    const originalTask = tasks.find(t => t.id === taskId)
    if (!originalTask) {
      console.warn('❌ Task not found for immediate move:', taskId)
      return null
    }
    
    console.log('📝 Found original task:', { title: originalTask.title, currentSprintId: originalTask.sprintId })
    
    // Create the operation for immediate return and later API sync
    const moveOperation: MoveOperation = {
      taskId,
      originalTask: { ...originalTask },
      targetSprintId,
      targetColumnId
    }
    
    console.log('💾 Creating operation:', moveOperation)
    setPendingOperation(moveOperation)
    
    setIsDragging(true)
    setDraggedTaskId(taskId)
    console.log('🔄 Set drag state - isDragging: true, draggedTaskId:', taskId)
    
    // Determine the final sprintColumnId for optimistic update
    let finalSprintColumnId = targetColumnId
    
    // If moving to a sprint but no specific column provided
    if (targetSprintId && targetColumnId === null) {
      // Find the target sprint to check if it's backlog
      const targetSprint = sprints.find(s => s.id === targetSprintId)
      
      if (targetSprint && !targetSprint.isBacklog) {
        // For regular sprints, assign to first column for optimistic UI
        // API will handle the actual assignment, but we show immediate feedback
        const firstColumn = targetSprint.sprintColumns?.[0]
        if (firstColumn) {
          finalSprintColumnId = firstColumn.id
        }
      }
      // For backlog sprints, keep finalSprintColumnId as null
    }
    
    // Update task immediately in local state
    setTasks(prevTasks => prevTasks.map(task => 
      task.id === taskId 
        ? {
            ...task,
            sprintId: targetSprintId,
            sprintColumnId: finalSprintColumnId,
            columnId: null // Clear board column when moving to sprint
          }
        : task
    ))
    
    console.log('✅ moveTaskImmediate completed - returning operation for commitMove')
    return moveOperation
    
  }, [tasks, sprints])
  
  // Commit the move via API
  const commitMove = useCallback(async (
    operation: MoveOperation,
    onSuccess?: () => void,
    onError?: (error: Error) => void
  ) => {
    console.log('🔄 commitMove called with operation:', { 
      taskId: operation.taskId,
      targetSprintId: operation.targetSprintId,
      originalTaskTitle: operation.originalTask.title,
      hasOnApiSync: !!onApiSync
    })
    
    if (!onApiSync) {
      console.log('❌ commitMove exiting early - missing onApiSync')
      setIsDragging(false)
      setDraggedTaskId(null)
      setPendingOperation(null)
      return
    }
    
    console.log('🚀 commitMove proceeding with API sync...')
    
    try {
      console.log('📡 Calling onApiSync with operation:', operation)
      
      // Call the API sync function
      await onApiSync(operation)
      
      console.log('✅ onApiSync completed successfully')
      
      // Success - update original tasks to current state
      setOriginalTasks([...tasks])
      onSuccess?.()
      
      // Optional success toast
      // toast.success('Task moved successfully')
      
    } catch (error) {
      console.error('❌ Failed to sync move operation:', error)
      
      // Rollback to original state
      setTasks([...originalTasks])
      onError?.(error as Error)
      
      toast.error('Failed to move task. Reverted changes.')
      
    } finally {
      console.log('🏁 commitMove finalizing - clearing drag state')
      // Clear drag state
      setIsDragging(false)
      setDraggedTaskId(null)
      setPendingOperation(null)
    }
  }, [onApiSync, tasks, originalTasks])
  
  // Rollback move without API call
  const rollbackMove = useCallback(() => {
    if (!pendingOperation) return
    
    setTasks([...originalTasks])
    setIsDragging(false)
    setDraggedTaskId(null)
    setPendingOperation(null)
  }, [pendingOperation, originalTasks])
  
  // Clear drag state
  const clearDragState = useCallback(() => {
    setIsDragging(false)
    setDraggedTaskId(null)
    setPendingOperation(null)
  }, [])
  
  return {
    tasks,
    sprints,
    isDragging,
    draggedTaskId,
    moveTaskImmediate,
    commitMove,
    rollbackMove,
    clearDragState
  }
}

/**
 * Helper function to move task between sprint columns in local state
 */
export function moveTaskInSprintColumns(
  tasks: Task[],
  taskId: string,
  sourceSprintId: string,
  targetSprintId: string,
  targetColumnId: string | null
): Task[] {
  return tasks.map(task => {
    if (task.id === taskId) {
      return {
        ...task,
        sprintId: targetSprintId,
        sprintColumnId: targetColumnId,
        columnId: null
      }
    }
    return task
  })
}

/**
 * Helper function to move task to backlog in local state
 */
export function moveTaskToBacklogLocal(tasks: Task[], taskId: string): Task[] {
  return tasks.map(task => {
    if (task.id === taskId) {
      return {
        ...task,
        sprintId: null,
        sprintColumnId: null,
        columnId: null
      }
    }
    return task
  })
}