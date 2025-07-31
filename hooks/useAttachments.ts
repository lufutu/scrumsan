"use client"

import useSWR from 'swr'

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

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
})

export function useAttachments(taskId: string) {
  const { data: attachments, error, isLoading, mutate } = useSWR<Attachment[]>(
    taskId ? `/api/tasks/${taskId}/attachments` : null,
    fetcher
  )

  return {
    attachments: attachments || [],
    loading: isLoading,
    error,
    mutate
  }
}