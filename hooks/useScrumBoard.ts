'use client'

import { useState, useEffect, useCallback } from 'react'
import useSWR, { mutate } from 'swr'
import { useSupabase } from '@/providers/supabase-provider'
import { useBoardRealtime } from '@/hooks/useSupabaseRealtime'
// REMOVED: getTaskStatusFromColumn import - no longer needed

export interface ScrumTask {
  id: string
  title: string
  description?: string
  taskType: 'story' | 'bug' | 'task' | 'epic' | 'improvement'
  priority?: 'critical' | 'high' | 'medium' | 'low'
  storyPoints?: number
  assignee?: {
    id: string
    fullName: string
    email: string
  }
  columnId?: string | null
  sprintColumnId?: string | null
  column?: {
    id: string
    name: string
  } | null
  labels?: string[] // Add labels field
  position?: number
  dueDate?: string
  url?: string
  createdAt: string
  boardId?: string
  projectId?: string
  sprintId?: string
}

export interface ScrumSprint {
  id: string
  name: string
  goal?: string
  status: 'planning' | 'active' | 'completed'
  startDate?: string
  endDate?: string
  tasks?: ScrumTask[]
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch')
  }
  return response.json()
}

export function useScrumBoard(boardId: string, projectId?: string) {
  const { user } = useSupabase()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Real-time updates using Pusher
  useBoardRealtime(
    boardId,
    {
      onTaskCreated: (newTask) => {
        mutateTasks()
      },
      onTaskUpdated: (updatedTask) => {
        mutateTasks()
      },
      onTaskDeleted: (data: { taskId: string }) => {
        mutateTasks()
      },
      onTaskMoved: (data: { taskId: string; fromStatus: string; toStatus: string }) => {
        mutateTasks()
      }
    },
    !!boardId
  )

  // Fetch tasks for the board
  const { data: tasks, error: tasksError, mutate: mutateTasks } = useSWR<ScrumTask[]>(
    boardId ? `/api/tasks?boardId=${boardId}` : null,
    fetcher
  )

  // Fetch sprints for the board/project
  const { data: sprints, error: sprintsError, mutate: mutateSprints } = useSWR<ScrumSprint[]>(
    boardId ? `/api/sprints?boardId=${boardId}` : null,
    fetcher
  )


  // Create a new task
  const createTask = useCallback(async (taskData: Partial<ScrumTask> & {
    effortUnits?: number
    estimationType?: 'story_points' | 'effort_units'
    itemValue?: string
    assignees?: Array<{ id: string; fullName: string; email: string }>
    reviewers?: Array<{ id: string; fullName: string; email: string }>
    labels?: Array<{ id: string; name: string; color: string }>
    customFieldValues?: Array<{ customFieldId: string; value: string }>
  }) => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      // Generate item code (SPDR-1, SPDR-2, etc.)
      const taskCount = tasks?.length || 0
      const itemCode = `SPDR-${taskCount + 1}`

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...taskData,
          itemCode,
          boardId,
          projectId,
          createdBy: user.id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create task')
      }

      const newTask = await response.json()
      mutateTasks()
      return newTask
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
      throw err
    } finally {
      setLoading(false)
    }
  }, [user, boardId, projectId, mutateTasks, tasks])

  // Update a task
  const updateTask = useCallback(async (taskId: string, updates: Partial<ScrumTask>) => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Failed to update task')
      }

      const updatedTask = await response.json()
      mutateTasks()
      return updatedTask
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task')
      throw err
    } finally {
      setLoading(false)
    }
  }, [user, mutateTasks])

  // Delete a task
  const deleteTask = useCallback(async (taskId: string) => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete task')
      }

      mutateTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task')
      throw err
    } finally {
      setLoading(false)
    }
  }, [user, mutateTasks])

  // Move task between columns (using column placement instead of status)
  const moveTask = useCallback(async (taskId: string, targetLocation: 'backlog' | 'sprint' | 'followup', sprintId?: string) => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      // Get current task for optimistic update
      const currentTask = tasks?.find(t => t.id === taskId)
      if (!currentTask) {
        throw new Error('Task not found')
      }

      // Prepare update data based on target location
      let updateData: any = {}
      let optimisticTask: any = { ...currentTask }
      
      if (targetLocation === 'backlog') {
        // Backlog items have no column assignment and remove followup/sprint labels
        const backlogLabels = (currentTask.labels || []).filter(label => label !== '__followup__' && label !== '__sprint__')
        updateData = { columnId: null, sprintColumnId: null, sprintId: null, labels: backlogLabels }
        optimisticTask = { ...currentTask, columnId: null, sprintColumnId: null, sprintId: null, labels: backlogLabels }
      } else if (targetLocation === 'sprint') {
        // Sprint items need to be assigned to a sprint column and remove followup label
        const sprintLabels = (currentTask.labels || []).filter(label => label !== '__followup__')
        // Set sprintId if provided, otherwise clear column assignments but mark as sprint item
        if (sprintId) {
          updateData = { columnId: null, sprintColumnId: null, sprintId: sprintId, labels: sprintLabels }
          optimisticTask = { ...currentTask, columnId: null, sprintColumnId: null, sprintId: sprintId, labels: sprintLabels }
        } else {
          // No active sprint, but still move to sprint column by adding a special label
          const sprintLabelsWithMarker = [...sprintLabels, '__sprint__']
          updateData = { columnId: null, sprintColumnId: null, labels: sprintLabelsWithMarker }
          optimisticTask = { ...currentTask, columnId: null, sprintColumnId: null, labels: sprintLabelsWithMarker }
        }
      } else if (targetLocation === 'followup') {
        // Followup items - use labels array to mark as followup, remove sprint marker
        const cleanLabels = (currentTask.labels || []).filter(label => label !== '__sprint__')
        const followupLabels = cleanLabels.includes('__followup__') 
          ? cleanLabels 
          : [...cleanLabels, '__followup__']
        updateData = { columnId: null, sprintColumnId: null, sprintId: null, labels: followupLabels }
        optimisticTask = { ...currentTask, columnId: null, sprintColumnId: null, sprintId: null, labels: followupLabels }
      }

      // Optimistic update for smooth UI
      mutateTasks((currentTasks: ScrumTask[] = []) => {
        return currentTasks.map(task => 
          task.id === taskId ? optimisticTask : task
        )
      }, false)

      // Update task in database
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error('Task update failed:', response.status, errorData)
        throw new Error(`Failed to update task: ${response.status} - ${errorData}`)
      }

      // If moving to sprint, add to sprint relationship
      if (targetLocation === 'sprint' && sprintId) {
        const sprintResponse = await fetch(`/api/sprints/${sprintId}/tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ taskId }),
        })

        if (!sprintResponse.ok) {
          const sprintErrorData = await sprintResponse.text()
          console.error('Sprint API failed:', sprintResponse.status, sprintErrorData)
          console.warn('Failed to add task to sprint, but task moved')
        }
      }

      // Final revalidation to get fresh data
      await mutateTasks()
      await mutateSprints()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move task')
      // Revert optimistic update on error
      await mutateTasks()
      throw err
    } finally {
      setLoading(false)
    }
  }, [user, mutateTasks, mutateSprints])

  // Create a new sprint
  const createSprint = useCallback(async (sprintData: Partial<ScrumSprint>) => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/sprints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...sprintData,
          boardId,
          projectId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create sprint')
      }

      const newSprint = await response.json()
      mutateSprints()
      return newSprint
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sprint')
      throw err
    } finally {
      setLoading(false)
    }
  }, [user, boardId, projectId, mutateSprints])

  // Start a sprint
  const startSprint = useCallback(async (sprintId: string) => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/sprints/${sprintId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'active',
          startDate: new Date().toISOString().split('T')[0],
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to start sprint')
      }

      mutateSprints()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start sprint')
      throw err
    } finally {
      setLoading(false)
    }
  }, [user, mutateSprints])

  // Filter tasks by status (derived from column placement)
  const getTasksByStatus = useCallback((status: 'backlog' | 'sprint' | 'followup') => {
    return tasks?.filter(task => {
      if (status === 'backlog') {
        // Backlog items have no column assignment and no followup/sprint labels
        return !task.columnId && !task.sprintColumnId && !task.labels?.includes('__followup__') && !task.labels?.includes('__sprint__')
      } else if (status === 'sprint') {
        // Sprint items have sprintColumnId assigned, are in sprint tasks, or have sprint marker
        return task.sprintColumnId || task.sprintId || task.labels?.includes('__sprint__')
      } else if (status === 'followup') {
        // Followup items have no column assignment but have followup label
        return !task.columnId && !task.sprintColumnId && task.labels?.includes('__followup__')
      }
      return false
    }) || []
  }, [tasks])

  // Clone a task
  const cloneTask = useCallback(async (taskId: string) => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/tasks/${taskId}/clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to clone task')
      }

      const clonedTask = await response.json()
      mutateTasks()
      return clonedTask
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clone task')
      throw err
    } finally {
      setLoading(false)
    }
  }, [user, mutateTasks])

  // Share task (get shareable link)
  const shareTask = useCallback(async (taskId: string) => {
    try {
      const task = tasks?.find(t => t.id === taskId)
      const itemCode = task?.id || taskId
      const link = `${window.location.origin}/items/${taskId}`
      
      await navigator.clipboard.writeText(link)
      return { link, itemCode }
    } catch (err) {
      throw new Error('Failed to share task')
    }
  }, [tasks])

  // Move task to top of column
  const moveTaskToTop = useCallback(async (taskId: string) => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ position: 0 }),
      })

      if (!response.ok) {
        throw new Error('Failed to move task to top')
      }

      mutateTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move task to top')
      throw err
    } finally {
      setLoading(false)
    }
  }, [user, mutateTasks])

  // Add task to predefined items
  const addToPredefined = useCallback(async (taskId: string) => {
    if (!user || !boardId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/boards/${boardId}/predefined`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId }),
      })

      if (!response.ok) {
        throw new Error('Failed to add to predefined items')
      }

      return await response.json()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to predefined items')
      throw err
    } finally {
      setLoading(false)
    }
  }, [user, boardId])

  // Mirror task to another board
  const mirrorTask = useCallback(async (taskId: string, targetBoardId: string) => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/tasks/${taskId}/mirror`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetBoardId }),
      })

      if (!response.ok) {
        throw new Error('Failed to mirror task')
      }

      return await response.json()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mirror task')
      throw err
    } finally {
      setLoading(false)
    }
  }, [user])

  // Get active sprint
  const activeSprint = sprints?.find(sprint => sprint.status === 'active')

  return {
    // Data
    tasks: tasks || [],
    sprints: sprints || [],
    activeSprint,
    
    // State
    loading,
    error: error || tasksError || sprintsError,
    
    // Actions
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    cloneTask,
    shareTask,
    moveTaskToTop,
    addToPredefined,
    mirrorTask,
    createSprint,
    startSprint,
    
    // Utilities
    getTasksByStatus,
    
    // Mutations
    mutateTasks,
    mutateSprints,
  }
}