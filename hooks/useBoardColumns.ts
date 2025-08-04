import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cacheKeys, invalidationPatterns } from '@/lib/query-optimization'
import { toast } from 'sonner'

interface BoardColumn {
  id: string
  boardId: string
  name: string
  position: number
  tasks: any[]
  _count: {
    tasks: number
  }
  createdAt: string
}

interface CreateBoardColumnData {
  name: string
  position: number
}

interface UpdateBoardColumnData {
  name?: string
  position?: number
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch')
  }
  return response.json()
}

export function useBoardColumns(boardId: string) {
  const queryClient = useQueryClient()
  
  const { data: columns, error, isLoading, refetch } = useQuery<BoardColumn[]>({
    queryKey: cacheKeys.boardColumns(boardId),
    queryFn: () => fetcher(`/api/boards/${boardId}/columns`),
    enabled: !!boardId,
  })

  const createColumnMutation = useMutation({
    mutationFn: async (data: CreateBoardColumnData) => {
      const response = await fetch(`/api/boards/${boardId}/columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create column')
      }

      return response.json()
    },
    onSuccess: (newColumn) => {
      // Invalidate related queries
      const invalidations = invalidationPatterns.boardData(boardId)
      invalidations.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey })
      })
      toast.success('Column created successfully')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create column')
    }
  })

  const updateColumnMutation = useMutation({
    mutationFn: async ({ columnId, data }: { columnId: string; data: UpdateBoardColumnData }) => {
      const response = await fetch(`/api/boards/${boardId}/columns/${columnId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update column')
      }

      return response.json()
    },
    onMutate: async ({ columnId, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: cacheKeys.boardColumns(boardId) })

      // Snapshot previous value
      const previousColumns = queryClient.getQueryData<BoardColumn[]>(cacheKeys.boardColumns(boardId))

      // Optimistically update
      if (previousColumns) {
        queryClient.setQueryData<BoardColumn[]>(
          cacheKeys.boardColumns(boardId),
          previousColumns.map(col => 
            col.id === columnId ? { ...col, ...data } : col
          )
        )
      }

      return { previousColumns }
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousColumns) {
        queryClient.setQueryData(cacheKeys.boardColumns(boardId), context.previousColumns)
      }
      toast.error(error.message || 'Failed to update column')
    },
    onSuccess: () => {
      // Invalidate related queries
      const invalidations = invalidationPatterns.boardData(boardId)
      invalidations.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey })
      })
      toast.success('Column updated successfully')
    }
  })

  const deleteColumnMutation = useMutation({
    mutationFn: async (columnId: string) => {
      const response = await fetch(`/api/boards/${boardId}/columns/${columnId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete column')
      }

      return true
    },
    onMutate: async (columnId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: cacheKeys.boardColumns(boardId) })

      // Snapshot previous value
      const previousColumns = queryClient.getQueryData<BoardColumn[]>(cacheKeys.boardColumns(boardId))

      // Optimistically remove
      if (previousColumns) {
        queryClient.setQueryData<BoardColumn[]>(
          cacheKeys.boardColumns(boardId),
          previousColumns.filter(col => col.id !== columnId)
        )
      }

      return { previousColumns }
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousColumns) {
        queryClient.setQueryData(cacheKeys.boardColumns(boardId), context.previousColumns)
      }
      toast.error(error.message || 'Failed to delete column')
    },
    onSuccess: () => {
      // Invalidate related queries
      const invalidations = invalidationPatterns.boardData(boardId)
      invalidations.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey })
      })
      toast.success('Column deleted successfully')
    }
  })

  return {
    columns: columns || [],
    isLoading,
    error,
    createColumn: createColumnMutation.mutate,
    updateColumn: (columnId: string, data: UpdateBoardColumnData) => 
      updateColumnMutation.mutate({ columnId, data }),
    deleteColumn: deleteColumnMutation.mutate,
    mutate: refetch
  }
}