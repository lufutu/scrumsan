import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { toast } from 'sonner'
import { cacheKeys, invalidationPatterns } from '@/lib/query-optimization'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch')
  }
  return response.json()
}

export interface Task {
  id: string
  title: string
  description: string | null
  taskType: string | null
  priority: string | null
  storyPoints: number | null
  assigneeId: string | null
  boardId: string | null
  columnId: string | null
  projectId: string | null
  createdAt: string
  assignee?: {
    id: string
    fullName: string | null
    avatarUrl: string | null
  } | null
}

export function useTasks(projectId?: string, boardId?: string, organizationId?: string) {
  const queryClient = useQueryClient()
  
  const params = new URLSearchParams()
  if (projectId) params.append('projectId', projectId)
  if (boardId) params.append('boardId', boardId)
  if (organizationId) params.append('organizationId', organizationId)
  
  const { data, error, isLoading, refetch } = useQuery<Task[]>({
    queryKey: cacheKeys.tasks(boardId, projectId),
    queryFn: () => fetcher(`/api/tasks?${params.toString()}`),
    enabled: !!(projectId || boardId || organizationId),
  })

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: {
      title: string
      description?: string
      taskType?: string
      priority?: string
      storyPoints?: number
      assigneeId?: string
      boardId?: string
      columnId?: string
      projectId?: string
    }) => {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create task')
      }

      return response.json()
    },
    onSuccess: (newTask) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: cacheKeys.tasks() })
      if (boardId) {
        const invalidations = invalidationPatterns.boardData(boardId)
        invalidations.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey })
        })
      }
      toast.success('Task created successfully')
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: Partial<Task> }) => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update task')
      }

      return response.json()
    },
    onSuccess: (updatedTask, { taskId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
      queryClient.invalidateQueries({ queryKey: cacheKeys.tasks() })
      if (boardId) {
        const invalidations = invalidationPatterns.boardData(boardId)
        invalidations.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey })
        })
      }
      toast.success('Task updated successfully')
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete task')
      }

      return true
    },
    onSuccess: (_, taskId) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
      queryClient.invalidateQueries({ queryKey: cacheKeys.tasks() })
      if (boardId) {
        const invalidations = invalidationPatterns.boardData(boardId)
        invalidations.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey })
        })
      }
      toast.success('Task deleted successfully')
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  const createTask = useCallback((taskData: Parameters<typeof createTaskMutation.mutate>[0]) => 
    createTaskMutation.mutateAsync(taskData), [createTaskMutation])

  const updateTask = useCallback((taskId: string, data: Partial<Task>) => 
    updateTaskMutation.mutate({ taskId, data }), [updateTaskMutation])

  const deleteTask = useCallback((taskId: string) => 
    deleteTaskMutation.mutate(taskId), [deleteTaskMutation])

  return {
    tasks: data,
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
    mutate: refetch,
  }
}