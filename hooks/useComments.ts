'use client'

import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

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
  const { data, error, mutate } = useSWR<Comment[]>(
    taskId ? `/api/tasks/${taskId}/comments` : null,
    fetcher,
    {
      refreshInterval: 0, // Don't auto-refresh
      revalidateOnFocus: false,
    }
  )

  return {
    comments: data || [],
    loading: !error && !data && taskId,
    error,
    mutate
  }
}