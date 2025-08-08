'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Board, Task, Sprint, BoardColumn, SprintColumn } from '@prisma/client'
import { logger } from '@/lib/logger'

interface OptimizedBoardData extends Board {
  columns: BoardColumn[]
  sprints: (Sprint & { sprintColumns: SprintColumn[] })[]
  tasks: Partial<Task>[]
  memberCount: number
}

interface UseOptimizedBoardDataOptions {
  boardId: string
  enabled?: boolean
  initialData?: OptimizedBoardData
  refetchInterval?: number
}

/**
 * Optimized hook for fetching board data with smart caching
 * Reduces API calls and improves performance
 */
export function useOptimizedBoardData({
  boardId,
  enabled = true,
  initialData,
  refetchInterval = 30000 // 30 seconds default
}: UseOptimizedBoardDataOptions) {
  const queryClient = useQueryClient()

  // Fetch board structure (columns, sprints) - changes less frequently
  const boardQuery = useQuery({
    queryKey: ['board', boardId, 'structure'],
    queryFn: async () => {
      logger.api.request('GET', `/api/boards/${boardId}/optimized`)
      
      const response = await fetch(`/api/boards/${boardId}/optimized`)
      if (!response.ok) {
        throw new Error('Failed to fetch board')
      }
      
      const data = await response.json()
      logger.api.response('GET', `/api/boards/${boardId}/optimized`, response.status, { 
        columns: data.columns?.length,
        sprints: data.sprints?.length 
      })
      
      return data as OptimizedBoardData
    },
    enabled,
    initialData,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchInterval: refetchInterval * 2, // Board structure updates less frequently
  })

  // Fetch tasks separately - changes more frequently
  const tasksQuery = useQuery({
    queryKey: ['board', boardId, 'tasks'],
    queryFn: async () => {
      logger.api.request('GET', `/api/boards/${boardId}/tasks/optimized`)
      
      const response = await fetch(`/api/boards/${boardId}/tasks/optimized`)
      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }
      
      const data = await response.json()
      logger.api.response('GET', `/api/boards/${boardId}/tasks/optimized`, response.status, {
        count: data.length
      })
      
      return data as Partial<Task>[]
    },
    enabled: enabled && !!boardQuery.data,
    staleTime: 1 * 60 * 1000, // Consider data fresh for 1 minute
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchInterval, // Tasks update more frequently
  })

  // Prefetch related data that might be needed soon
  const prefetchRelatedData = async () => {
    // Prefetch user data for assignees
    const userIds = new Set<string>()
    tasksQuery.data?.forEach(task => {
      // Collect user IDs from tasks
      if ((task as any).assignees) {
        (task as any).assignees.forEach((assignee: any) => {
          userIds.add(assignee.userId)
        })
      }
    })

    if (userIds.size > 0) {
      queryClient.prefetchQuery({
        queryKey: ['users', Array.from(userIds)],
        queryFn: async () => {
          const response = await fetch('/api/users/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: Array.from(userIds) })
          })
          return response.json()
        },
        staleTime: 10 * 60 * 1000, // User data doesn't change often
      })
    }
  }

  // Prefetch when tasks are loaded
  if (tasksQuery.data && tasksQuery.data.length > 0) {
    prefetchRelatedData()
  }

  // Combine data for easy consumption
  const boardData = boardQuery.data ? {
    ...boardQuery.data,
    tasks: tasksQuery.data || []
  } : null

  return {
    data: boardData,
    isLoading: boardQuery.isLoading || tasksQuery.isLoading,
    isError: boardQuery.isError || tasksQuery.isError,
    error: boardQuery.error || tasksQuery.error,
    refetch: () => {
      boardQuery.refetch()
      tasksQuery.refetch()
    },
    isStale: boardQuery.isStale || tasksQuery.isStale,
    dataUpdatedAt: Math.max(
      boardQuery.dataUpdatedAt || 0,
      tasksQuery.dataUpdatedAt || 0
    )
  }
}

/**
 * Hook for incrementally loading task details
 * Only loads full details when task modal is opened
 */
export function useTaskDetails(taskId: string | null) {
  return useQuery({
    queryKey: ['task', taskId, 'details'],
    queryFn: async () => {
      if (!taskId) throw new Error('No task ID')
      
      logger.api.request('GET', `/api/tasks/${taskId}/details`)
      
      const response = await fetch(`/api/tasks/${taskId}/details`)
      if (!response.ok) {
        throw new Error('Failed to fetch task details')
      }
      
      const data = await response.json()
      logger.api.response('GET', `/api/tasks/${taskId}/details`, response.status)
      
      return data
    },
    enabled: !!taskId,
    staleTime: 2 * 60 * 1000, // Consider fresh for 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  })
}