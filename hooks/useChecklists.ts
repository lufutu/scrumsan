"use client"

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Checklist, ChecklistItem} from '@/types/shared'
import { cacheKeys } from '@/lib/query-optimization'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch')
  }
  return response.json()
}

export function useChecklists(taskId: string) {
  const { data: checklists, error, isLoading, refetch } = useQuery<Checklist[]>({
    queryKey: cacheKeys.taskChecklists(taskId),
    queryFn: () => fetcher(`/api/tasks/${taskId}/checklists`),
    enabled: !!taskId,
  })

  // Calculate total items and completed items across all checklists
  const { totalItems, completedItems } = useMemo(() => {
    if (!checklists) return { totalItems: 0, completedItems: 0 }
    
    const total = checklists.reduce((acc, checklist) => acc + checklist.items.length, 0)
    const completed = checklists.reduce((acc, checklist) => 
      acc + checklist.items.filter(item => item.completed).length, 0)
    
    return { totalItems: total, completedItems: completed }
  }, [checklists])

  return {
    checklists: checklists || [],
    totalItems,
    completedItems,
    checklistsCount: checklists?.length || 0,
    loading: isLoading,
    error,
    mutate: refetch
  }
}