'use client'

import { useEffect, createContext, useContext, ReactNode } from 'react'
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine'
import { useOptimisticBoardState, type OptimisticBoardState } from '@/lib/optimistic-board-state'
import { Task, Sprint } from '@/types/shared'

/**
 * Modern Drag and Drop Provider with Trello-like UX
 * 
 * This provides smooth, immediate drag feedback with background API sync,
 * exactly like Trello, Linear, and other modern tools.
 * 
 * Key features:
 * 1. Immediate visual feedback during drag
 * 2. No API calls during drag operations
 * 3. Background sync after drag completes
 * 4. Automatic rollback on API failures
 */

interface DragDropContextValue extends OptimisticBoardState {
  // Additional context values can be added here
}

const DragDropContext = createContext<DragDropContextValue | null>(null)

export function useOptimisticDragDrop() {
  const context = useContext(DragDropContext)
  if (!context) {
    throw new Error('useOptimisticDragDrop must be used within an OptimisticDragDropProvider')
  }
  return context
}

interface OptimisticDragDropProviderProps {
  children: ReactNode
  initialTasks: Task[]
  initialSprints: Sprint[]
  onTaskMove: (params: {
    taskId: string
    targetSprintId: string | null
    targetColumnId: string | null
    originalTask: Task
  }) => Promise<void>
}

export function OptimisticDragDropProvider({ 
  children, 
  initialTasks, 
  initialSprints,
  onTaskMove 
}: OptimisticDragDropProviderProps) {
  
  // Use the optimistic board state hook
  const boardState = useOptimisticBoardState(
    initialTasks,
    initialSprints,
    async (operation) => {
      await onTaskMove({
        taskId: operation.taskId,
        targetSprintId: operation.targetSprintId,
        targetColumnId: operation.targetColumnId,
        originalTask: operation.originalTask
      })
    }
  )

  // Global drag monitoring
  useEffect(() => {
    return combine(
      // Main drag monitor
      monitorForElements({
        onDragStart: ({ source }) => {
          if (isDragDataTask(source.data)) {
            console.log('🎯 Drag started:', source.data.taskId)
            // Don't update state here - just track drag start
          }
        },
        
        onDrop: ({ source, location }) => {
          if (!isDragDataTask(source.data)) {
            boardState.clearDragState()
            return
          }

          const dropTarget = location.current.dropTargets[0]
          if (!dropTarget) {
            console.log('❌ No valid drop target')
            boardState.clearDragState()
            return
          }

          const taskId = source.data.taskId
          const targetData = dropTarget.data

          console.log('🎯 Processing drop:', { taskId, targetData })

          // Determine target location based on drop target type
          let targetSprintId: string | null = null
          let targetColumnId: string | null = null

          if (isDragDataSprintColumn(targetData)) {
            // Moving to sprint column
            targetSprintId = targetData.sprintId
            targetColumnId = targetData.columnId
          } else if (isDragDataBacklog(targetData)) {
            // Moving to backlog
            targetSprintId = null
            targetColumnId = null
          } else if (isDragDataSprint(targetData)) {
            // Moving to sprint (general sprint drop, not specific column)
            targetSprintId = targetData.sprintId
            targetColumnId = null // Will be assigned to first column by API
          } else {
            console.warn('🚨 Unknown drop target type:', targetData)
            boardState.clearDragState()
            return
          }

          // STEP 1: Immediate UI update (no API call)
          boardState.moveTaskImmediate(taskId, targetSprintId, targetColumnId)
          
          // STEP 2: Background API sync (non-blocking)
          boardState.commitMove(
            () => {
              console.log('✅ Move synced successfully')
            },
            (error) => {
              console.error('❌ Move sync failed:', error)
            }
          )
        }
      })
      
      // Note: AutoScroll will be handled by individual scroll containers
      // No global autoScroll needed here since we have AutoScroll components in the UI
    )
  }, [boardState])

  const contextValue: DragDropContextValue = {
    ...boardState
  }

  return (
    <DragDropContext.Provider value={contextValue}>
      {children}
    </DragDropContext.Provider>
  )
}

/**
 * Type guards for drag data
 */
function isDragDataTask(data: unknown): data is { 
  type: 'task'
  taskId: string
  sprintId?: string | null 
} {
  return (
    typeof data === 'object' && 
    data !== null && 
    'type' in data && 
    data.type === 'task' &&
    'taskId' in data &&
    typeof (data as any).taskId === 'string'
  )
}

function isDragDataSprintColumn(data: unknown): data is { 
  type: 'sprint-column'
  sprintId: string
  columnId: string 
} {
  return (
    typeof data === 'object' && 
    data !== null && 
    'type' in data && 
    data.type === 'sprint-column' &&
    'sprintId' in data &&
    'columnId' in data
  )
}

function isDragDataSprint(data: unknown): data is { 
  type: 'sprint'
  sprintId: string 
} {
  return (
    typeof data === 'object' && 
    data !== null && 
    'type' in data && 
    data.type === 'sprint' &&
    'sprintId' in data
  )
}

function isDragDataBacklog(data: unknown): data is { 
  type: 'backlog' 
} {
  return (
    typeof data === 'object' && 
    data !== null && 
    'type' in data && 
    data.type === 'backlog'
  )
}