"use client"

import useSWR from 'swr'
import { Checklist, ChecklistItem} from '@/types/shared'

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
})

export function useChecklists(taskId: string) {
  const { data: checklists, error, isLoading, mutate } = useSWR<Checklist[]>(
    taskId ? `/api/tasks/${taskId}/checklists` : null,
    fetcher
  )

  // Calculate total items and completed items across all checklists
  const totalItems = checklists?.reduce((total, checklist) => total + checklist.items.length, 0) || 0
  const completedItems = checklists?.reduce((total, checklist) => 
    total + checklist.items.filter(item => item.completed).length, 0) || 0

  return {
    checklists: checklists || [],
    totalItems,
    completedItems,
    checklistsCount: checklists?.length || 0,
    loading: isLoading,
    error,
    mutate
  }
}