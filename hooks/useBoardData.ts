'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Task, Board, Sprint } from '@/types/shared'
import { cacheKeys } from '@/lib/query-optimization'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  return response.json()
}

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
 * Uses React Query for caching and parallel fetching
 */
export const useBoardData = (boardId: string | null) => {
  const queryClient = useQueryClient()

  // 1. Fetch board data first to get organizationId
  const { data: board, error: boardError, isLoading: boardLoading } = useQuery<Board>({
    queryKey: cacheKeys.board(boardId || ''),
    queryFn: () => fetcher(`/api/boards/${boardId}`),
    enabled: !!boardId,
  })

  // Extract organizationId from board data
  const organizationId = board?.organizationId

  // 2. Fetch all other data in parallel once we have board data
  const shouldFetchDetails = !!board && !!boardId

  const { data: sprints, error: sprintsError } = useQuery<Sprint[]>({
    queryKey: cacheKeys.sprints(boardId),
    queryFn: () => fetcher(`/api/sprints?boardId=${boardId}`),
    enabled: shouldFetchDetails,
  })

  const { data: sprintDetails, error: sprintDetailsError } = useQuery<SprintDetail[]>({
    queryKey: ['sprintDetails', boardId],
    queryFn: () => fetcher(`/api/sprints?boardId=${boardId}&includeDetails=true`),
    enabled: shouldFetchDetails,
  })

  const { data: tasks, error: tasksError } = useQuery<Task[]>({
    queryKey: cacheKeys.tasks(boardId),
    queryFn: () => fetcher(`/api/tasks?boardId=${boardId}`),
    enabled: shouldFetchDetails,
  })

  const { data: labels, error: labelsError } = useQuery<Label[]>({
    queryKey: cacheKeys.boardLabels(boardId || ''),
    queryFn: () => fetcher(`/api/boards/${boardId}/labels`),
    enabled: shouldFetchDetails,
  })

  const { data: users, error: usersError } = useQuery<User[]>({
    queryKey: cacheKeys.organizationMembers(organizationId || ''),
    queryFn: async () => {
      const data = await fetcher(`/api/organizations/${organizationId}`)
      // Extract users from organization members
      return data.members ? data.members.map((member: any) => ({
        id: member.user?.id || member.userId,
        fullName: member.user?.fullName || member.user?.full_name || 'Unknown User',
        email: member.user?.email || undefined,
        avatarUrl: member.user?.avatarUrl || member.user?.avatar_url || undefined,
        role: member.role
      })) : []
    },
    enabled: !!organizationId,
  })

  // Compute derived data
  const boardData = useMemo<BoardData | null>(() => {
    if (board && sprints && sprintDetails && tasks && labels && users) {
      const activeSprint = sprints.find(s => s.status === 'active') || null
      
      return {
        board,
        sprints,
        sprintDetails,
        tasks,
        labels,
        users,
        activeSprint
      }
    }
    return null
  }, [board, sprints, sprintDetails, tasks, labels, users])

  // Handle errors
  const error = boardError || sprintsError || sprintDetailsError || tasksError || labelsError || usersError

  // Loading state
  const isLoading = boardLoading || 
    (shouldFetchDetails && (!sprints || !sprintDetails || !tasks || !labels)) ||
    (!!organizationId && !users)

  // Mutation function to refresh all data
  const mutateAll = () => {
    if (boardId) {
      queryClient.invalidateQueries({ queryKey: cacheKeys.board(boardId) })
      queryClient.invalidateQueries({ queryKey: cacheKeys.sprints(boardId) })
      queryClient.invalidateQueries({ queryKey: ['sprintDetails', boardId] })
      queryClient.invalidateQueries({ queryKey: cacheKeys.tasks(boardId) })
      queryClient.invalidateQueries({ queryKey: cacheKeys.boardLabels(boardId) })
    }
    if (organizationId) {
      queryClient.invalidateQueries({ queryKey: cacheKeys.organizationMembers(organizationId) })
    }
  }

  // Individual mutation functions
  const mutateBoard = () => boardId && queryClient.invalidateQueries({ queryKey: cacheKeys.board(boardId) })
  const mutateSprints = () => boardId && queryClient.invalidateQueries({ queryKey: cacheKeys.sprints(boardId) })
  const mutateSprintDetails = () => boardId && queryClient.invalidateQueries({ queryKey: ['sprintDetails', boardId] })
  const mutateTasks = () => boardId && queryClient.invalidateQueries({ queryKey: cacheKeys.tasks(boardId) })
  const mutateLabels = () => boardId && queryClient.invalidateQueries({ queryKey: cacheKeys.boardLabels(boardId) })
  const mutateUsers = () => organizationId && queryClient.invalidateQueries({ queryKey: cacheKeys.organizationMembers(organizationId) })

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