import useSWR from 'swr'
import { useCallback } from 'react'
import { toast } from 'sonner'

// Remove custom fetcher to use global SWR configuration with deduplication

export interface Board {
  id: string
  name: string
  boardType: string | null
  projectId: string | null
  organizationId: string | null
  description: string | null
  color: string | null
  createdAt: string
  organization?: {
    id: string
    name: string
  } | null
  project?: {
    id: string
    name: string
    organizationId: string | null
  } | null
  columns?: Array<{
    id: string
    name: string
    position: number
    tasks: Array<{
      id: string
      title: string
      description: string | null
      status: string | null
      taskType: string | null
      priority: string | null
      storyPoints: number | null
      assigneeId: string | null
      createdAt: string
      assignee?: {
        id: string
        fullName: string | null
        avatarUrl: string | null
      } | null
    }>
  }>
}

export function useBoards(organizationId?: string, projectId?: string) {
  const params = new URLSearchParams()
  if (organizationId) params.append('organizationId', organizationId)
  if (projectId) params.append('projectId', projectId)
  
  const { data, error, isLoading, mutate } = useSWR<Board[]>(
    `/api/boards?${params.toString()}`
    // Uses global SWR configuration with deduplication
  )

  const createBoard = useCallback(async (boardData: {
    name: string
    boardType?: string
    projectId?: string
    organizationId?: string
    description?: string
    color?: string
  }) => {
    try {
      const response = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(boardData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create board')
      }

      await mutate()
      toast.success('Board created successfully')
      return await response.json()
    } catch (error: any) {
      console.error('Failed to create board:', error)
      toast.error(error.message || 'Failed to create board')
      throw error
    }
  }, [mutate])

  return {
    boards: data,
    isLoading,
    error,
    createBoard,
    mutate,
  }
}

export function useBoard(boardId: string) {
  const { data, error, isLoading, mutate } = useSWR<Board>(
    boardId ? `/api/boards/${boardId}` : null
    // Uses global SWR configuration with deduplication
  )

  return {
    board: data,
    isLoading,
    error,
    mutate,
  }
}