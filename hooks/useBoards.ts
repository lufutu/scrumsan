import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { toast } from 'sonner'
import { cacheKeys, invalidationPatterns } from '@/lib/query-optimization'

// Generic fetcher function for API requests
const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) {
    throw new Error('Failed to fetch')
  }
  return res.json()
})

export interface Board {
  id: string
  name: string
  boardType: string | null
  projectId: string | null
  organizationId: string | null
  description: string | null
  color: string | null
  createdAt: string
  organization?: {
    id: string
    name: string
  } | null
  project?: {
    id: string
    name: string
    organizationId: string | null
  } | null
  columns?: Array<{
    id: string
    name: string
    position: number
    tasks: Array<{
      id: string
      title: string
      description: string | null
      status: string | null
      taskType: string | null
      priority: string | null
      storyPoints: number | null
      assigneeId: string | null
      createdAt: string
      assignee?: {
        id: string
        fullName: string | null
        avatarUrl: string | null
      } | null
    }>
  }>
}

export function useBoards(organizationId?: string, projectId?: string) {
  const queryClient = useQueryClient()
  
  const params = new URLSearchParams()
  if (organizationId) params.append('organizationId', organizationId)
  if (projectId) params.append('projectId', projectId)
  
  const { data, error, isLoading, refetch } = useQuery<Board[]>({
    queryKey: cacheKeys.boards(organizationId, projectId),
    queryFn: () => fetcher(`/api/boards?${params.toString()}`),
    enabled: !!organizationId || !!projectId, // Only fetch if we have at least one parameter
  })

  const createBoardMutation = useMutation({
    mutationFn: async (boardData: {
      name: string
      boardType?: string
      projectId?: string
      organizationId?: string
      description?: string
      color?: string
    }) => {
      const response = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(boardData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create board')
      }

      return await response.json()
    },
    onSuccess: (newBoard, variables) => {
      // Invalidate relevant queries
      const invalidations = [
        ...invalidationPatterns.allOrganizationData(variables.organizationId || ''),
        ...(variables.projectId ? invalidationPatterns.projectData(variables.projectId, variables.organizationId) : []),
      ]
      
      invalidations.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey })
      })

      toast.success('Board created successfully')
    },
    onError: (error: Error) => {
      console.error('Failed to create board:', error)
      toast.error(error.message || 'Failed to create board')
    }
  })

  const updateBoardMutation = useMutation({
    mutationFn: async ({ boardId, boardData }: { 
      boardId: string
      boardData: Partial<Board> 
    }) => {
      const response = await fetch(`/api/boards/${boardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(boardData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update board')
      }

      return await response.json()
    },
    onSuccess: (updatedBoard) => {
      // Invalidate relevant queries
      const invalidations = invalidationPatterns.boardData(updatedBoard.id, updatedBoard.organizationId)
      
      invalidations.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey })
      })

      toast.success('Board updated successfully')
    },
    onError: (error: Error) => {
      console.error('Failed to update board:', error)
      toast.error(error.message || 'Failed to update board')
    }
  })

  const deleteBoardMutation = useMutation({
    mutationFn: async (boardId: string) => {
      const response = await fetch(`/api/boards/${boardId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete board')
      }

      return { boardId }
    },
    onSuccess: (_, boardId) => {
      // Invalidate all organization data since we don't know which org the board belonged to
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      queryClient.invalidateQueries({ queryKey: ['navData'] })
      queryClient.invalidateQueries({ queryKey: ['navDataMultiple'] })

      toast.success('Board deleted successfully')
    },
    onError: (error: Error) => {
      console.error('Failed to delete board:', error)
      toast.error(error.message || 'Failed to delete board')
    }
  })

  const createBoard = useCallback((boardData: Parameters<typeof createBoardMutation.mutate>[0]) => {
    return createBoardMutation.mutateAsync(boardData)
  }, [createBoardMutation])

  const updateBoard = useCallback((boardId: string, boardData: Partial<Board>) => {
    return updateBoardMutation.mutateAsync({ boardId, boardData })
  }, [updateBoardMutation])

  const deleteBoard = useCallback((boardId: string) => {
    return deleteBoardMutation.mutateAsync(boardId)
  }, [deleteBoardMutation])

  return {
    boards: data,
    isLoading,
    error,
    createBoard,
    updateBoard,
    deleteBoard,
    refetch,
    // Expose mutation states for better UX
    isCreatingBoard: createBoardMutation.isPending,
    isUpdatingBoard: updateBoardMutation.isPending,
    isDeletingBoard: deleteBoardMutation.isPending,
  }
}

export function useBoard(boardId: string) {
  const { data, error, isLoading, refetch } = useQuery<Board>({
    queryKey: cacheKeys.board(boardId),
    queryFn: () => fetcher(`/api/boards/${boardId}`),
    enabled: !!boardId,
  })

  return {
    board: data,
    isLoading,
    error,
    refetch,
  }
}