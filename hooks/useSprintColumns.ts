import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cacheKeys, invalidationPatterns } from '@/lib/query-optimization'
import { toast } from 'sonner'

interface SprintColumn {
  id: string
  sprintId: string
  name: string
  position: number
  isDone: boolean
  wipLimit?: number
  tasks: any[]
  createdAt: string
}

interface CreateSprintColumnData {
  name: string
  position: number
  isDone?: boolean
  wipLimit?: number
}

interface UpdateSprintColumnData {
  name?: string
  position?: number
  isDone?: boolean
  wipLimit?: number | null
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch')
  }
  return response.json()
}

export function useSprintColumns(sprintId: string) {
  const queryClient = useQueryClient()
  
  const { data: columns, error, isLoading, refetch } = useQuery<SprintColumn[]>({
    queryKey: cacheKeys.sprintColumns(sprintId),
    queryFn: () => fetcher(`/api/sprints/${sprintId}/columns`),
    enabled: !!sprintId,
  })

  const createColumnMutation = useMutation({
    mutationFn: async (data: CreateSprintColumnData) => {
      const response = await fetch(`/api/sprints/${sprintId}/columns`, {
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
      const invalidations = invalidationPatterns.sprintData(sprintId)
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
    mutationFn: async ({ columnId, data }: { columnId: string; data: UpdateSprintColumnData }) => {
      const response = await fetch(`/api/sprints/${sprintId}/columns/${columnId}`, {
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
      await queryClient.cancelQueries({ queryKey: cacheKeys.sprintColumns(sprintId) })

      // Snapshot previous value
      const previousColumns = queryClient.getQueryData<SprintColumn[]>(cacheKeys.sprintColumns(sprintId))

      // Optimistically update
      if (previousColumns) {
        queryClient.setQueryData<SprintColumn[]>(
          cacheKeys.sprintColumns(sprintId),
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
        queryClient.setQueryData(cacheKeys.sprintColumns(sprintId), context.previousColumns)
      }
      toast.error(error.message || 'Failed to update column')
    },
    onSuccess: () => {
      // Invalidate related queries
      const invalidations = invalidationPatterns.sprintData(sprintId)
      invalidations.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey })
      })
      toast.success('Column updated successfully')
    }
  })

  const deleteColumnMutation = useMutation({
    mutationFn: async (columnId: string) => {
      const response = await fetch(`/api/sprints/${sprintId}/columns/${columnId}`, {
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
      await queryClient.cancelQueries({ queryKey: cacheKeys.sprintColumns(sprintId) })

      // Snapshot previous value
      const previousColumns = queryClient.getQueryData<SprintColumn[]>(cacheKeys.sprintColumns(sprintId))

      // Optimistically remove
      if (previousColumns) {
        queryClient.setQueryData<SprintColumn[]>(
          cacheKeys.sprintColumns(sprintId),
          previousColumns.filter(col => col.id !== columnId)
        )
      }

      return { previousColumns }
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousColumns) {
        queryClient.setQueryData(cacheKeys.sprintColumns(sprintId), context.previousColumns)
      }
      toast.error(error.message || 'Failed to delete column')
    },
    onSuccess: () => {
      // Invalidate related queries
      const invalidations = invalidationPatterns.sprintData(sprintId)
      invalidations.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey })
      })
      toast.success('Column deleted successfully')
    }
  })

  const finishSprintMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/sprints/${sprintId}/finish`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to finish sprint')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate sprint and related queries
      queryClient.invalidateQueries({ queryKey: ['sprint', sprintId] })
      const invalidations = invalidationPatterns.sprintData(sprintId)
      invalidations.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey })
      })
      toast.success('Sprint finished successfully')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to finish sprint')
    }
  })

  // Initialize default columns if none exist
  const initializeDefaultColumns = async () => {
    if (!columns || columns.length > 0) return

    const defaultColumns = [
      { name: 'To Do', position: 0, isDone: false },
      { name: 'In Progress', position: 1, isDone: false },
      { name: 'Done', position: 2, isDone: true }
    ]

    for (const column of defaultColumns) {
      await createColumnMutation.mutateAsync(column)
    }
  }

  return {
    columns: columns || [],
    isLoading,
    error,
    createColumn: createColumnMutation.mutate,
    updateColumn: (columnId: string, data: UpdateSprintColumnData) => 
      updateColumnMutation.mutate({ columnId, data }),
    deleteColumn: deleteColumnMutation.mutate,
    finishSprint: finishSprintMutation.mutate,
    initializeDefaultColumns,
    mutate: refetch
  }
}