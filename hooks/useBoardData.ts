'use client'

import useSWR from 'swr'
import { useState, useEffect } from 'react'
import { Task, Board, Sprint } from '@/types/shared'

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }
  return res.json()
})

export interface BoardData {
  board: Board
  sprints: Sprint[]
  sprintDetails: SprintDetail[]
  tasks: Task[]
  labels: Label[]
  users: User[]
  activeSprint: Sprint | null
}

interface SprintDetail extends Sprint {
  tasks?: Task[]
}


interface Label {
  id: string
  name: string
  color: string | null
}

interface User {
  id: string
  fullName: string
  email?: string
  avatarUrl?: string
  role?: string
}

/**
 * Consolidated hook that fetches all board-related data efficiently
 * Reduces API calls from 6+ down to 3 by batching related requests
 */
export const useBoardData = (boardId: string | null) => {
  const [boardData, setBoardData] = useState<BoardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // 1. Fetch board data first to get organizationId
  const { data: board, error: boardError, isLoading: boardLoading, mutate: mutateBoard } = useSWR<Board>(
    boardId ? `/api/boards/${boardId}` : null,
    fetcher
  )

  // 2. Fetch all other data in parallel once we have board data
  const shouldFetchDetails = board && boardId
  const organizationId = board?.organizationId

  const { data: sprints, error: sprintsError, mutate: mutateSprints } = useSWR<Sprint[]>(
    shouldFetchDetails ? `/api/sprints?boardId=${boardId}` : null,
    fetcher
  )

  const { data: sprintDetails, error: sprintDetailsError, mutate: mutateSprintDetails } = useSWR<SprintDetail[]>(
    shouldFetchDetails ? `/api/sprints?boardId=${boardId}&includeDetails=true` : null,
    fetcher
  )

  const { data: tasks, error: tasksError, mutate: mutateTasks } = useSWR<Task[]>(
    shouldFetchDetails ? `/api/tasks?boardId=${boardId}` : null,
    fetcher
  )

  const { data: labels, error: labelsError, mutate: mutateLabels } = useSWR<Label[]>(
    shouldFetchDetails ? `/api/boards/${boardId}/labels` : null,
    fetcher
  )

  const { data: users, error: usersError, mutate: mutateUsers } = useSWR<User[]>(
    organizationId ? `/api/organizations/${organizationId}` : null,
    async (url) => {
      const data = await fetcher(url)
      // Extract users from organization members
      return data.members ? data.members.map((member: any) => ({
        id: member.user?.id || member.userId,
        fullName: member.user?.fullName || member.user?.full_name || 'Unknown User',
        email: member.user?.email || undefined,
        avatarUrl: member.user?.avatarUrl || member.user?.avatar_url || undefined,
        role: member.role
      })) : []
    }
  )

  // Compute derived data
  useEffect(() => {
    if (board && sprints && sprintDetails && tasks && labels && users) {
      const activeSprint = sprints.find(s => s.status === 'active') || null
      
      setBoardData({
        board,
        sprints,
        sprintDetails,
        tasks,
        labels,
        users,
        activeSprint
      })
      setIsLoading(false)
      setError(null)
    }
  }, [board, sprints, sprintDetails, tasks, labels, users])

  // Handle errors
  useEffect(() => {
    const errors = [boardError, sprintsError, sprintDetailsError, tasksError, labelsError, usersError].filter(Boolean)
    if (errors.length > 0) {
      setError(errors[0] as Error)
      setIsLoading(false)
    }
  }, [boardError, sprintsError, sprintDetailsError, tasksError, labelsError, usersError])

  // Loading state
  const loading = boardLoading || 
    (shouldFetchDetails && (!sprints || !sprintDetails || !tasks || !labels)) ||
    (organizationId && !users)

  useEffect(() => {
    setIsLoading(loading)
  }, [loading])

  // Mutation functions for cache updates
  const mutateAll = () => {
    mutateBoard()
    mutateSprints()
    mutateSprintDetails()
    mutateTasks()
    mutateLabels()
    mutateUsers()
  }

  return {
    data: boardData,
    isLoading,
    error,
    mutate: mutateAll,
    mutateBoard,
    mutateSprints,
    mutateSprintDetails,
    mutateTasks,
    mutateLabels,
    mutateUsers
  }
}