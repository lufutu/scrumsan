import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cacheKeys } from '@/lib/query-optimization'
import { toast } from 'sonner'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch')
  }
  return response.json()
}

export type Label = {
  id: string
  name: string
  description: string | null
  color: string | null
  createdAt: string
}

export type LabelWithStats = Label & {
  itemCount: number
  totalPoints: number
  totalLoggedTime: number
  assignees: Array<{
    id: string
    fullName: string | null
    avatarUrl: string | null
  }>
}

export function useLabels(boardId: string) {
  const queryClient = useQueryClient()

  const { data, error, isLoading, refetch } = useQuery<LabelWithStats[]>({
    queryKey: cacheKeys.boardLabels(boardId),
    queryFn: () => fetcher(`/api/boards/${boardId}/labels`),
    enabled: !!boardId,
  })

  const createLabelMutation = useMutation({
    mutationFn: async (labelData: {
      name: string
      description?: string
      color?: string
    }) => {
      const response = await fetch(`/api/boards/${boardId}/labels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(labelData),
      })

      if (!response.ok) {
        throw new Error('Failed to create label')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cacheKeys.boardLabels(boardId) })
      toast.success('Label created successfully')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create label')
    }
  })

  const updateLabelMutation = useMutation({
    mutationFn: async ({ labelId, data }: { 
      labelId: string; 
      data: {
        name?: string
        description?: string
        color?: string
      }
    }) => {
      const response = await fetch(`/api/boards/${boardId}/labels/${labelId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to update label')
      }

      return response.json()
    },
    onSuccess: (_, { labelId }) => {
      queryClient.invalidateQueries({ queryKey: cacheKeys.boardLabels(boardId) })
      queryClient.invalidateQueries({ queryKey: ['boardLabel', boardId, labelId] })
      toast.success('Label updated successfully')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update label')
    }
  })

  const deleteLabelMutation = useMutation({
    mutationFn: async (labelId: string) => {
      const response = await fetch(`/api/boards/${boardId}/labels/${labelId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete label')
      }

      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cacheKeys.boardLabels(boardId) })
      toast.success('Label deleted successfully')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete label')
    }
  })

  return {
    labels: data || [],
    loading: isLoading,
    error,
    createLabel: createLabelMutation.mutate,
    updateLabel: (labelId: string, data: Parameters<typeof updateLabelMutation.mutate>[0]['data']) => 
      updateLabelMutation.mutate({ labelId, data }),
    deleteLabel: deleteLabelMutation.mutate,
    mutate: refetch
  }
}

export function useLabel(boardId: string, labelId: string) {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['boardLabel', boardId, labelId],
    queryFn: () => fetcher(`/api/boards/${boardId}/labels/${labelId}`),
    enabled: !!boardId && !!labelId,
  })

  return {
    label: data,
    loading: isLoading,
    error,
    mutate: refetch
  }
}