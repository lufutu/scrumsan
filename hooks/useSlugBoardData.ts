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
 * Slug-based hook that fetches all board-related data efficiently using slug-based APIs
 * Uses React Query for caching and parallel fetching
 */
export const useSlugBoardData = (orgSlug: string | null, boardSlug: string | null) => {
  const queryClient = useQueryClient()

  // Only fetch if we have both slugs
  const shouldFetch = !!orgSlug && !!boardSlug

  // 1. Fetch board data first using slug-based API
  const { data: board, error: boardError, isLoading: boardLoading } = useQuery<Board>({
    queryKey: ['slug-board', orgSlug, boardSlug],
    queryFn: () => fetcher(`/api/orgs/${orgSlug}/boards/${boardSlug}`),
    enabled: shouldFetch,
  })

  // Extract organizationId from board data
  const organizationId = board?.organizationId

  // 2. Fetch all other data in parallel once we have board data using slug-based APIs
  const shouldFetchDetails = !!board && shouldFetch

  const { data: sprints, error: sprintsError } = useQuery<Sprint[]>({
    queryKey: ['slug-sprints', orgSlug, boardSlug],
    queryFn: () => fetcher(`/api/orgs/${orgSlug}/boards/${boardSlug}/sprints`),
    enabled: shouldFetchDetails,
  })

  const { data: sprintDetails, error: sprintDetailsError } = useQuery<SprintDetail[]>({
    queryKey: ['slug-sprintDetails', orgSlug, boardSlug],
    queryFn: () => fetcher(`/api/orgs/${orgSlug}/boards/${boardSlug}/sprints?includeDetails=true`),
    enabled: shouldFetchDetails,
  })

  const { data: tasks, error: tasksError } = useQuery<Task[]>({
    queryKey: ['slug-tasks', orgSlug, boardSlug],
    queryFn: async () => {
      console.log('Fetching tasks for orgSlug/boardSlug:', orgSlug, boardSlug)
      const response = await fetcher(`/api/orgs/${orgSlug}/boards/${boardSlug}/tasks`)
      // Tasks API returns { tasks: [...], pagination: {...} }
      return response.tasks || []
    },
    enabled: shouldFetchDetails,
  })

  const { data: labels, error: labelsError } = useQuery<Label[]>({
    queryKey: ['slug-labels', orgSlug, boardSlug],
    queryFn: () => fetcher(`/api/orgs/${orgSlug}/boards/${boardSlug}/labels`),
    enabled: shouldFetchDetails,
  })

  // For users, we still need to use organization-based API (this is acceptable as it's organization-level)
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
    if (shouldFetch) {
      queryClient.invalidateQueries({ queryKey: ['slug-board', orgSlug, boardSlug] })
      queryClient.invalidateQueries({ queryKey: ['slug-sprints', orgSlug, boardSlug] })
      queryClient.invalidateQueries({ queryKey: ['slug-sprintDetails', orgSlug, boardSlug] })
      queryClient.invalidateQueries({ queryKey: ['slug-tasks', orgSlug, boardSlug] })
      queryClient.invalidateQueries({ queryKey: ['slug-labels', orgSlug, boardSlug] })
    }
    if (organizationId) {
      queryClient.invalidateQueries({ queryKey: cacheKeys.organizationMembers(organizationId) })
    }
  }

  // Individual mutation functions
  const mutateBoard = () => shouldFetch && queryClient.invalidateQueries({ queryKey: ['slug-board', orgSlug, boardSlug] })
  const mutateSprints = () => shouldFetch && queryClient.invalidateQueries({ queryKey: ['slug-sprints', orgSlug, boardSlug] })
  const mutateSprintDetails = () => shouldFetch && queryClient.invalidateQueries({ queryKey: ['slug-sprintDetails', orgSlug, boardSlug] })
  const mutateTasks = () => shouldFetch && queryClient.invalidateQueries({ queryKey: ['slug-tasks', orgSlug, boardSlug] })
  const mutateLabels = () => shouldFetch && queryClient.invalidateQueries({ queryKey: ['slug-labels', orgSlug, boardSlug] })
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