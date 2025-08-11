'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { Task } from '@/types/shared'

interface MultiSelectContextType {
  isMultiSelectMode: boolean
  selectedTasks: Set<string>
  lastSelectedTask: string | null
  toggleMultiSelectMode: () => void
  toggleTaskSelection: (taskId: string, shiftKey?: boolean, tasks?: Task[]) => void
  selectAll: (tasks: Task[]) => void
  clearSelection: () => void
  isTaskSelected: (taskId: string) => boolean
  getSelectedCount: () => number
  getSelectedTaskIds: () => string[]
}

const MultiSelectContext = createContext<MultiSelectContextType | undefined>(undefined)

export function MultiSelectProvider({ children }: { children: React.ReactNode }) {
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [lastSelectedTask, setLastSelectedTask] = useState<string | null>(null)

  // Toggle multi-select mode
  const toggleMultiSelectMode = useCallback(() => {
    setIsMultiSelectMode(prev => {
      if (prev) {
        // Exiting multi-select mode, clear selection
        setSelectedTasks(new Set())
        setLastSelectedTask(null)
      }
      return !prev
    })
  }, [])

  // Toggle individual task selection
  const toggleTaskSelection = useCallback((taskId: string, shiftKey?: boolean, tasks?: Task[]) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev)
      
      // Handle shift+click for range selection
      if (shiftKey && lastSelectedTask && tasks) {
        const allTaskIds = tasks.map(t => t.id)
        const lastIndex = allTaskIds.indexOf(lastSelectedTask)
        const currentIndex = allTaskIds.indexOf(taskId)
        
        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex)
          const end = Math.max(lastIndex, currentIndex)
          
          for (let i = start; i <= end; i++) {
            newSet.add(allTaskIds[i])
          }
        }
      } else {
        // Regular toggle
        if (newSet.has(taskId)) {
          newSet.delete(taskId)
        } else {
          newSet.add(taskId)
        }
      }
      
      return newSet
    })
    
    if (!shiftKey) {
      setLastSelectedTask(taskId)
    }
  }, [lastSelectedTask])

  // Select all tasks
  const selectAll = useCallback((tasks: Task[]) => {
    const allTaskIds = tasks.map(t => t.id)
    setSelectedTasks(new Set(allTaskIds))
  }, [])

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedTasks(new Set())
    setLastSelectedTask(null)
  }, [])

  // Check if a task is selected
  const isTaskSelected = useCallback((taskId: string) => {
    return selectedTasks.has(taskId)
  }, [selectedTasks])

  // Get selected count
  const getSelectedCount = useCallback(() => {
    return selectedTasks.size
  }, [selectedTasks])

  // Get selected task IDs as array
  const getSelectedTaskIds = useCallback(() => {
    return Array.from(selectedTasks)
  }, [selectedTasks])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + A to select all (when in multi-select mode)
      if (isMultiSelectMode && (e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault()
        // Note: selectAll needs to be called with tasks from the board component
      }
      
      // Escape to exit multi-select mode
      if (isMultiSelectMode && e.key === 'Escape') {
        e.preventDefault()
        toggleMultiSelectMode()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isMultiSelectMode, toggleMultiSelectMode])

  const value = {
    isMultiSelectMode,
    selectedTasks,
    lastSelectedTask,
    toggleMultiSelectMode,
    toggleTaskSelection,
    selectAll,
    clearSelection,
    isTaskSelected,
    getSelectedCount,
    getSelectedTaskIds
  }

  return (
    <MultiSelectContext.Provider value={value}>
      {children}
    </MultiSelectContext.Provider>
  )
}

export function useMultiSelect() {
  const context = useContext(MultiSelectContext)
  if (context === undefined) {
    // Return a fallback object when not in a provider
    return {
      isMultiSelectMode: false,
      selectedTasks: new Set<string>(),
      lastSelectedTask: null,
      toggleMultiSelectMode: () => {},
      toggleTaskSelection: () => {},
      selectAll: () => {},
      clearSelection: () => {},
      isTaskSelected: () => false,
      getSelectedCount: () => 0,
      getSelectedTaskIds: () => []
    }
  }
  return context
}