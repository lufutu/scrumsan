import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { toast } from 'sonner'
import { Sprint } from '@/types/shared'
import { cacheKeys, invalidationPatterns } from '@/lib/query-optimization'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    console.error('Fetch failed:', response.status, response.statusText, url)
    throw new Error('Failed to fetch')
  }
  return response.json()
}

export function useSprints(boardId?: string, projectId?: string, organizationId?: string, status?: string) {
  const queryClient = useQueryClient()
  
  const params = new URLSearchParams()
  if (boardId) params.append('boardId', boardId)
  if (projectId) params.append('projectId', projectId)
  if (organizationId) params.append('organizationId', organizationId)
  if (status) params.append('status', status)
  
  const { data, error, isLoading, refetch } = useQuery<Sprint[]>({
    queryKey: cacheKeys.sprints(boardId || projectId || organizationId, status),
    queryFn: () => fetcher(`/api/sprints?${params.toString()}`),
    enabled: !!(boardId || projectId || organizationId),
  })

  const createSprintMutation = useMutation({
    mutationFn: async (sprintData: {
      name: string
      goal?: string
      boardId?: string
      projectId?: string
      startDate?: string
      endDate?: string
      status?: 'planning' | 'active' | 'completed'
    }) => {
      const response = await fetch('/api/sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sprintData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create sprint')
      }

      return response.json()
    },
    onSuccess: (newSprint) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: cacheKeys.sprints() })
      if (boardId) {
        const invalidations = invalidationPatterns.boardData(boardId)
        invalidations.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey })
        })
      }
      toast.success('Sprint created successfully')
    },
    onError: (error) => {
      console.error('Failed to create sprint:', error)
      toast.error(error.message || 'Failed to create sprint')
    }
  })

  const updateSprintMutation = useMutation({
    mutationFn: async ({ sprintId, data }: { sprintId: string; data: Partial<Sprint> }) => {
      const response = await fetch(`/api/sprints/${sprintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update sprint')
      }

      return response.json()
    },
    onSuccess: (updatedSprint, { sprintId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['sprint', sprintId] })
      queryClient.invalidateQueries({ queryKey: cacheKeys.sprints() })
      const invalidations = invalidationPatterns.sprintData(sprintId)
      invalidations.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey })
      })
      toast.success('Sprint updated successfully')
    },
    onError: (error) => {
      console.error('Failed to update sprint:', error)
      toast.error(error.message || 'Failed to update sprint')
    }
  })

  const deleteSprintMutation = useMutation({
    mutationFn: async (sprintId: string) => {
      const response = await fetch(`/api/sprints/${sprintId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete sprint')
      }

      return true
    },
    onSuccess: (_, sprintId) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['sprint', sprintId] })
      queryClient.invalidateQueries({ queryKey: cacheKeys.sprints() })
      toast.success('Sprint deleted successfully')
    },
    onError: (error) => {
      console.error('Failed to delete sprint:', error)
      toast.error(error.message || 'Failed to delete sprint')
    }
  })

  const finishSprintMutation = useMutation({
    mutationFn: async (sprintId: string) => {
      const response = await fetch(`/api/sprints/${sprintId}/finish`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to finish sprint')
      }

      return response.json()
    },
    onSuccess: (result, sprintId) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['sprint', sprintId] })
      queryClient.invalidateQueries({ queryKey: cacheKeys.sprints() })
      const invalidations = invalidationPatterns.sprintData(sprintId)
      invalidations.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey })
      })
    },
    onError: (error) => {
      console.error('Failed to finish sprint:', error)
      toast.error(error.message || 'Failed to finish sprint')
    }
  })

  const createSprint = useCallback((sprintData: Parameters<typeof createSprintMutation.mutate>[0]) => 
    createSprintMutation.mutate(sprintData), [createSprintMutation])

  const updateSprint = useCallback((sprintId: string, data: Partial<Sprint>) => 
    updateSprintMutation.mutate({ sprintId, data }), [updateSprintMutation])

  const deleteSprint = useCallback((sprintId: string) => 
    deleteSprintMutation.mutate(sprintId), [deleteSprintMutation])

  const startSprint = useCallback(async (sprintId: string, startDate: string, endDate: string, name?: string, goal?: string) => {
    return updateSprint(sprintId, {
      status: 'active',
      startDate,
      endDate,
      ...(name && { name }),
      ...(goal && { goal })
    })
  }, [updateSprint])

  const finishSprint = useCallback((sprintId: string) => 
    finishSprintMutation.mutateAsync(sprintId), [finishSprintMutation])

  return {
    sprints: data,
    isLoading,
    error,
    createSprint,
    updateSprint,
    deleteSprint,
    startSprint,
    finishSprint,
    mutate: refetch,
  }
}

export function useSprint(sprintId: string) {
  const { data, error, isLoading, refetch } = useQuery<Sprint>({
    queryKey: ['sprint', sprintId],
    queryFn: () => fetcher(`/api/sprints/${sprintId}`),
    enabled: !!sprintId,
  })

  return {
    sprint: data,
    isLoading,
    error,
    mutate: refetch,
  }
}