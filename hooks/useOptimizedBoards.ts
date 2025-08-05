import { useQuery } from '@tanstack/react-query'
import { cacheKeys } from '@/lib/query-optimization'

interface Board {
  id: string
  name: string
  slug: string | null
  description: string | null
  color: string | null
  boardType: string | null
  organizationId: string
  _count?: {
    tasks: number
    sprints: number
  }
  organization?: {
    id: string
    name: string
    slug: string | null
  }
  projectLinks?: Array<{
    id: string
    project: {
      id: string
      name: string
    }
  }>
}

interface BoardsResponse {
  boards: Board[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch')
  }
  return response.json()
}

// High-performance boards hook with pagination and caching
export function useOptimizedBoards(organizationId: string | null, page = 1, limit = 20) {
  const { data, error, isLoading, refetch } = useQuery<BoardsResponse>({
    queryKey: ['boards', organizationId, page, limit],
    queryFn: () => fetcher(`/api/boards?organizationId=${organizationId}&page=${page}&limit=${limit}`),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  })

  return {
    boards: data?.boards || [],
    pagination: data?.pagination,
    isLoading,
    error: error?.message || null,
    refresh: refetch
  }
}

// Hook for single board with optimized data fetching
export function useOptimizedBoard(boardId: string | null) {
  const { data: board, error, isLoading, refetch } = useQuery<Board>({
    queryKey: cacheKeys.board(boardId || ''),
    queryFn: () => fetcher(`/api/boards/${boardId}`),
    enabled: !!boardId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  })

  return {
    board: board || null,
    isLoading,
    error: error?.message || null,
    refresh: refetch
  }
}

// Hook for board tasks with pagination
export function useOptimizedBoardTasks(boardId: string | null, page = 1, limit = 50) {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['tasks', boardId, page, limit],
    queryFn: () => fetcher(`/api/tasks?boardId=${boardId}&page=${page}&limit=${limit}`),
    enabled: !!boardId,
    staleTime: 2 * 60 * 1000, // 2 minutes (more dynamic data)
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })

  return {
    tasks: data?.tasks || [],
    pagination: data?.pagination,
    isLoading,
    error: error?.message || null,
    refresh: refetch
  }
}