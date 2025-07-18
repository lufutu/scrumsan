import useSWR from 'swr'
import { useCallback } from 'react'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
})

export interface Task {
  id: string
  title: string
  description: string | null
  status: string | null
  taskType: string | null
  priority: string | null
  storyPoints: number | null
  assigneeId: string | null
  boardId: string | null
  columnId: string | null
  projectId: string | null
  createdAt: string
  assignee?: {
    id: string
    fullName: string | null
    avatarUrl: string | null
  } | null
}

export function useTasks(projectId?: string, boardId?: string, organizationId?: string) {
  const params = new URLSearchParams()
  if (projectId) params.append('projectId', projectId)
  if (boardId) params.append('boardId', boardId)
  if (organizationId) params.append('organizationId', organizationId)
  
  const { data, error, isLoading, mutate } = useSWR<Task[]>(
    `/api/tasks?${params.toString()}`,
    fetcher
  )

  const createTask = useCallback(async (taskData: {
    title: string
    description?: string
    taskType?: string
    priority?: string
    storyPoints?: number
    assigneeId?: string
    boardId?: string
    columnId?: string
    projectId?: string
    status?: string
  }) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create task')
      }

      await mutate()
      toast.success('Task created successfully')
      return await response.json()
    } catch (error: any) {
      toast.error(error.message)
      throw error
    }
  }, [mutate])

  const updateTask = useCallback(async (taskId: string, taskData: Partial<Task>) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update task')
      }

      await mutate()
      toast.success('Task updated successfully')
    } catch (error: any) {
      toast.error(error.message)
      throw error
    }
  }, [mutate])

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete task')
      }

      await mutate()
      toast.success('Task deleted successfully')
    } catch (error: any) {
      toast.error(error.message)
      throw error
    }
  }, [mutate])

  return {
    tasks: data,
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
    mutate,
  }
}