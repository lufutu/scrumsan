'use client'

import { useEffect, createContext, useContext, ReactNode } from 'react'
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { useOptimisticDragDrop, DragDataTypes } from '@/lib/optimistic-drag-drop'
import { Task } from '@/types/shared'

/**
 * Global Drag and Drop Provider
 * 
 * This component provides global drag and drop coordination using Pragmatic Drag and Drop.
 * It replaces the old DragDropContext from react-beautiful-dnd and provides:
 * 
 * 1. Global drag state management
 * 2. Optimistic UI updates
 * 3. Drag event coordination across components
 * 4. Error handling and rollback
 */

interface DragDropContextValue {
  // Drag state
  isDragging: boolean
  isDropping: boolean
  draggedTaskId: string | null
  
  // Optimistic updates
  optimisticTasks: Task[]
  
  // Actions
  startDrag: (taskId: string, sourceSprintId: string | null) => void
  clearOptimisticState: () => void
  applyOptimisticUpdate: (taskId: string, update: any) => void
  rollbackTaskUpdate: (taskId: string) => void
}

const DragDropContext = createContext<DragDropContextValue | null>(null)

export function useDragDrop() {
  const context = useContext(DragDropContext)
  if (!context) {
    throw new Error('useDragDrop must be used within a DragDropProvider')
  }
  return context
}

interface DragDropProviderProps {
  children: ReactNode
  initialTasks?: Task[]
  onTaskMove?: (taskId: string, targetLocation: { sprintId?: string | null; columnId?: string | null }) => Promise<void>
}

export function DragDropProvider({ 
  children, 
  initialTasks = [],
  onTaskMove 
}: DragDropProviderProps) {
  const {
    dragState,
    optimisticTasks,
    isDragging,
    isDropping,
    startDrag,
    updateDragTarget,
    applyOptimisticUpdate,
    clearOptimisticState,
    rollbackTaskUpdate
  } = useOptimisticDragDrop(initialTasks)

  // Global drag monitoring
  useEffect(() => {
    return monitorForElements({
      onDragStart: ({ source, location }) => {
        if (DragDataTypes.isTask(source.data)) {
          console.log('🎯 Global drag start:', source.data.taskId)
          startDrag(source.data.taskId, source.data.sprintId || null)
        }
      },
      
      onDrag: ({ source, location }) => {
        if (DragDataTypes.isTask(source.data)) {
          // Update drag target for visual feedback
          const dropTarget = location.current.dropTargets[0]
          if (dropTarget) {
            const targetData = dropTarget.data
            if (DragDataTypes.isSprintColumn(targetData)) {
              updateDragTarget(targetData.sprintId, targetData.columnId)
            } else if (DragDataTypes.isBacklog(targetData)) {
              updateDragTarget(null, null)
            }
          }
        }
      },
      
      onDrop: ({ source, location }) => {
        if (!DragDataTypes.isTask(source.data)) {
          clearOptimisticState()
          return
        }

        const dropTarget = location.current.dropTargets[0]
        if (!dropTarget) {
          console.log('❌ No valid drop target')
          clearOptimisticState()
          return
        }

        const taskId = source.data.taskId
        const targetData = dropTarget.data

        console.log('🎯 Processing drop:', { taskId, targetData })

        // STEP 1: Apply UI updates IMMEDIATELY (optimistic UI)
        let optimisticUpdate = null
        
        if (DragDataTypes.isSprintColumn(targetData)) {
          // Moving to sprint column
          optimisticUpdate = {
            sprintId: targetData.sprintId,
            sprintColumnId: targetData.columnId,
            columnId: null
          }
          applyOptimisticUpdate(taskId, optimisticUpdate)
        } else if (DragDataTypes.isBacklog(targetData)) {
          // Moving to backlog
          optimisticUpdate = {
            sprintId: null,
            sprintColumnId: null,
            columnId: null
          }
          applyOptimisticUpdate(taskId, optimisticUpdate)
        } else {
          // Unknown target type
          console.warn('🚨 Unknown drop target type:', targetData)
          clearOptimisticState()
          return
        }

        // STEP 2: Run API call in background (non-blocking)
        if (onTaskMove && optimisticUpdate) {
          const apiCall = async () => {
            try {
              await onTaskMove(taskId, { 
                sprintId: optimisticUpdate.sprintId,
                columnId: optimisticUpdate.columnId 
              })
              console.log('✅ Background API call completed successfully')
              // Clear optimistic state after successful API call
              clearOptimisticState()
            } catch (error) {
              console.error('❌ Background API call failed, rolling back:', error)
              rollbackTaskUpdate(taskId)
            }
          }
          
          // Run API call without blocking UI
          apiCall()
        } else {
          // No API handler, just clear optimistic state
          clearOptimisticState()
        }
      }
    })
  }, [startDrag, updateDragTarget, applyOptimisticUpdate, clearOptimisticState, rollbackTaskUpdate, onTaskMove])

  const contextValue: DragDropContextValue = {
    // State
    isDragging,
    isDropping,
    draggedTaskId: dragState.draggedTaskId,
    optimisticTasks,
    
    // Actions
    startDrag,
    clearOptimisticState,
    applyOptimisticUpdate,
    rollbackTaskUpdate
  }

  return (
    <DragDropContext.Provider value={contextValue}>
      {children}
    </DragDropContext.Provider>
  )
}