import useSWR from 'swr'
import { useCallback } from 'react'
import { toast } from 'sonner'
import { Sprint } from '@/types/shared'

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) {
    console.error('Fetch failed:', res.status, res.statusText, url)
    throw new Error('Failed to fetch')
  }
  return res.json()
})

export function useSprints(boardId?: string, projectId?: string, organizationId?: string, status?: string) {
  const params = new URLSearchParams()
  if (boardId) params.append('boardId', boardId)
  if (projectId) params.append('projectId', projectId)
  if (organizationId) params.append('organizationId', organizationId)
  if (status) params.append('status', status)
  
  const { data, error, isLoading, mutate } = useSWR<Sprint[]>(
    `/api/sprints?${params.toString()}`,
    fetcher
  )

  const createSprint = useCallback(async (sprintData: {
    name: string
    goal?: string
    boardId?: string
    projectId?: string
    startDate?: string
    endDate?: string
    status?: 'planning' | 'active' | 'completed'
  }) => {
    try {
      const response = await fetch('/api/sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sprintData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create sprint')
      }

      await mutate()
      toast.success('Sprint created successfully')
      return await response.json()
    } catch (error: any) {
      console.error('Failed to create sprint:', error)
      toast.error(error.message || 'Failed to create sprint')
      throw error
    }
  }, [mutate])

  const updateSprint = useCallback(async (sprintId: string, sprintData: Partial<Sprint>) => {
    try {
      const response = await fetch(`/api/sprints/${sprintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sprintData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update sprint')
      }

      await mutate()
      toast.success('Sprint updated successfully')
    } catch (error: any) {
      console.error('Failed to update sprint:', error)
      toast.error(error.message || 'Failed to update sprint')
      throw error
    }
  }, [mutate])

  const deleteSprint = useCallback(async (sprintId: string) => {
    try {
      const response = await fetch(`/api/sprints/${sprintId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete sprint')
      }

      await mutate()
      toast.success('Sprint deleted successfully')
    } catch (error: any) {
      console.error('Failed to delete sprint:', error)
      toast.error(error.message || 'Failed to delete sprint')
      throw error
    }
  }, [mutate])

  const startSprint = useCallback(async (sprintId: string, startDate: string, endDate: string, name?: string, goal?: string) => {
    return updateSprint(sprintId, {
      status: 'active',
      startDate,
      endDate,
      ...(name && { name }),
      ...(goal && { goal })
    })
  }, [updateSprint])

  const finishSprint = useCallback(async (sprintId: string) => {
    try {
      const response = await fetch(`/api/sprints/${sprintId}/finish`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to finish sprint')
      }

      const result = await response.json()
      await mutate()
      
      // Return the result so the caller can handle the response
      return result
    } catch (error: any) {
      console.error('Failed to finish sprint:', error)
      toast.error(error.message || 'Failed to finish sprint')
      throw error
    }
  }, [mutate])

  return {
    sprints: data,
    isLoading,
    error,
    createSprint,
    updateSprint,
    deleteSprint,
    startSprint,
    finishSprint,
    mutate,
  }
}

export function useSprint(sprintId: string) {
  const { data, error, isLoading, mutate } = useSWR<Sprint>(
    sprintId ? `/api/sprints/${sprintId}` : null,
    fetcher
  )

  return {
    sprint: data,
    isLoading,
    error,
    mutate,
  }
}