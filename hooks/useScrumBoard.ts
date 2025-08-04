'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '@/providers/supabase-provider'
import { useBoardRealtime } from '@/hooks/useSupabaseRealtime'
import { Task, Sprint } from '@/types/shared'
import { cacheKeys, invalidationPatterns } from '@/lib/query-optimization'
import { toast } from 'sonner'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch')
  }
  return response.json()
}

export function useScrumBoard(boardId: string, projectId?: string) {
  const { user } = useSupabase()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Real-time updates using Pusher
  useBoardRealtime(
    boardId,
    {
      onTaskCreated: () => {
        queryClient.invalidateQueries({ queryKey: cacheKeys.tasks(boardId) })
      },
      onTaskUpdated: () => {
        queryClient.invalidateQueries({ queryKey: cacheKeys.tasks(boardId) })
      },
      onTaskDeleted: () => {
        queryClient.invalidateQueries({ queryKey: cacheKeys.tasks(boardId) })
      },
      onTaskMoved: () => {
        queryClient.invalidateQueries({ queryKey: cacheKeys.tasks(boardId) })
      }
    },
    !!boardId
  )

  // Fetch tasks for the board
  const { data: tasks, error: tasksError } = useQuery<Task[]>({
    queryKey: cacheKeys.tasks(boardId),
    queryFn: () => fetcher(`/api/tasks?boardId=${boardId}`),
    enabled: !!boardId,
  })

  // Fetch sprints for the board/project
  const { data: sprints, error: sprintsError } = useQuery<Sprint[]>({
    queryKey: cacheKeys.sprints(boardId),
    queryFn: () => fetcher(`/api/sprints?boardId=${boardId}`),
    enabled: !!boardId,
  })

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: Partial<Task> & {
      effortUnits?: number
      estimationType?: 'story_points' | 'effort_units'
      itemValue?: string
      assignees?: Array<{ id: string; fullName: string; email: string }>
      reviewers?: Array<{ id: string; fullName: string; email: string }>
      labels?: Array<{ id: string; name: string; color: string }>
      customFieldValues?: Array<{ customFieldId: string; value: string }>
    }) => {
      if (!user) throw new Error('User not authenticated')

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

      return response.json()
    },
    onSuccess: () => {
      const invalidations = invalidationPatterns.boardData(boardId)
      invalidations.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey })
      })
      toast.success('Task created successfully')
    },
    onError: (error) => {
      setError(error.message)
      toast.error(error.message || 'Failed to create task')
    }
  })

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) => {
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

      return response.json()
    },
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
      queryClient.invalidateQueries({ queryKey: cacheKeys.tasks(boardId) })
      toast.success('Task updated successfully')
    },
    onError: (error) => {
      setError(error.message)
      toast.error(error.message || 'Failed to update task')
    }
  })

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete task')
      }

      return true
    },
    onSuccess: () => {
      const invalidations = invalidationPatterns.boardData(boardId)
      invalidations.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey })
      })
      toast.success('Task deleted successfully')
    },
    onError: (error) => {
      setError(error.message)
      toast.error(error.message || 'Failed to delete task')
    }
  })

  // Move task mutation
  const moveTaskMutation = useMutation({
    mutationFn: async ({ 
      taskId, 
      targetColumn, 
      targetSprint,
      position 
    }: { 
      taskId: string
      targetColumn?: string | null
      targetSprint?: string | null
      position?: number
    }) => {
      const response = await fetch(`/api/tasks/${taskId}/move`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          columnId: targetColumn,
          sprintColumnId: targetSprint,
          position,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to move task')
      }

      return response.json()
    },
    onMutate: async ({ taskId, targetColumn, targetSprint }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: cacheKeys.tasks(boardId) })

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData<Task[]>(cacheKeys.tasks(boardId))

      // Optimistically update
      if (previousTasks) {
        queryClient.setQueryData<Task[]>(
          cacheKeys.tasks(boardId),
          previousTasks.map(task => 
            task.id === taskId 
              ? { ...task, columnId: targetColumn, sprintColumnId: targetSprint }
              : task
          )
        )
      }

      return { previousTasks }
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(cacheKeys.tasks(boardId), context.previousTasks)
      }
      setError(error.message)
      toast.error(error.message || 'Failed to move task')
    },
    onSuccess: () => {
      const invalidations = invalidationPatterns.boardData(boardId)
      invalidations.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey })
      })
    }
  })

  // Create sprint mutation
  const createSprintMutation = useMutation({
    mutationFn: async (sprintData: Partial<Sprint>) => {
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

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cacheKeys.sprints(boardId) })
      toast.success('Sprint created successfully')
    },
    onError: (error) => {
      setError(error.message)
      toast.error(error.message || 'Failed to create sprint')
    }
  })

  // Callback functions
  const createTask = useCallback((taskData: Parameters<typeof createTaskMutation.mutate>[0]) => {
    setLoading(true)
    setError(null)
    return createTaskMutation.mutateAsync(taskData).finally(() => setLoading(false))
  }, [createTaskMutation])

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    setLoading(true)
    setError(null)
    return updateTaskMutation.mutateAsync({ taskId, updates }).finally(() => setLoading(false))
  }, [updateTaskMutation])

  const deleteTask = useCallback(async (taskId: string) => {
    setLoading(true)
    setError(null)
    return deleteTaskMutation.mutateAsync(taskId).finally(() => setLoading(false))
  }, [deleteTaskMutation])

  const moveTask = useCallback(async (
    taskId: string,
    targetColumn?: string | null,
    targetSprint?: string | null,
    position?: number
  ) => {
    setLoading(true)
    setError(null)
    return moveTaskMutation.mutateAsync({ 
      taskId, 
      targetColumn, 
      targetSprint, 
      position 
    }).finally(() => setLoading(false))
  }, [moveTaskMutation])

  const createSprint = useCallback(async (sprintData: Partial<Sprint>) => {
    setLoading(true)
    setError(null)
    return createSprintMutation.mutateAsync(sprintData).finally(() => setLoading(false))
  }, [createSprintMutation])

  const refetchAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: cacheKeys.tasks(boardId) })
    queryClient.invalidateQueries({ queryKey: cacheKeys.sprints(boardId) })
  }, [boardId, queryClient])

  return {
    tasks: tasks || [],
    sprints: sprints || [],
    loading: loading || !tasks || !sprints,
    error: error || tasksError?.message || sprintsError?.message || null,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    createSprint,
    refetch: refetchAll,
  }
}