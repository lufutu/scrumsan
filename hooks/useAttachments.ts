"use client"

import { useQuery } from '@tanstack/react-query'
import { cacheKeys } from '@/lib/query-optimization'

interface Attachment {
  id: string
  taskId: string
  name: string
  url: string | null
  size: number
  type: string
  uploadedAt: string
  uploadedBy: string
  uploadedByUser: {
    id: string
    fullName: string | null
    avatarUrl: string | null
  }
  error?: string
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch')
  }
  return response.json()
}

export function useAttachments(taskId: string) {
  const { data: attachments, error, isLoading, refetch } = useQuery<Attachment[]>({
    queryKey: cacheKeys.taskAttachments(taskId),
    queryFn: () => fetcher(`/api/tasks/${taskId}/attachments`),
    enabled: !!taskId,
  })

  return {
    attachments: attachments || [],
    loading: isLoading,
    error,
    mutate: refetch
  }
}