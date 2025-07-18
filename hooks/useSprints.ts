import useSWR from 'swr'
import { useCallback } from 'react'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
})

export interface Sprint {
  id: string
  name: string
  goal: string | null
  status: string | null
  startDate: string | null
  endDate: string | null
  boardId: string | null
  projectId: string | null
  createdAt: string
  board?: {
    id: string
    name: string
    organizationId: string | null
  } | null
  project?: {
    id: string
    name: string
  } | null
  sprintTasks?: Array<{
    id: string
    task: {
      id: string
      title: string
      description: string | null
      status: string | null
      taskType: string | null
      priority: string | null
      storyPoints: number | null
      assignee?: {
        id: string
        fullName: string | null
        avatarUrl: string | null
      } | null
    }
  }>
  analytics?: Array<{
    id: string
    date: string
    remainingPoints: number | null
    completedPoints: number | null
    addedPoints: number | null
    removedPoints: number | null
  }>
  _count?: {
    sprintTasks: number
  }
}

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
      toast.error(error.message)
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
      toast.error(error.message)
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
      toast.error(error.message)
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
    return updateSprint(sprintId, {
      status: 'completed',
      endDate: new Date().toISOString().split('T')[0]
    })
  }, [updateSprint])

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