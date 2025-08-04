'use client'

import { useQuery } from '@tanstack/react-query'
import { cacheKeys } from '@/lib/query-optimization'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch')
  }
  return response.json()
}

export interface Comment {
  id: string
  content: string
  createdAt: string
  taskId: string
  userId: string
  user: {
    id: string
    fullName: string | null
    avatarUrl: string | null
    email: string
  }
}

export function useComments(taskId: string | null) {
  const { data, error, isLoading, refetch } = useQuery<Comment[]>({
    queryKey: cacheKeys.taskComments(taskId || ''),
    queryFn: () => fetcher(`/api/tasks/${taskId}/comments`),
    enabled: !!taskId,
    refetchOnWindowFocus: false,
  })

  return {
    comments: data || [],
    loading: isLoading,
    error,
    mutate: refetch
  }
}