import useSWR from 'swr'

interface Board {
  id: string
  name: string
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

// High-performance boards hook with pagination and caching
export function useOptimizedBoards(organizationId: string | null, page = 1, limit = 20) {
  const { data, error, mutate } = useSWR<BoardsResponse>(
    organizationId ? `/api/boards?organizationId=${organizationId}&page=${page}&limit=${limit}` : null,
    {
      refreshInterval: 0, // No auto-refresh for boards
      revalidateOnFocus: false,
      revalidateOnMount: true,
      dedupingInterval: 8000, // 8 seconds deduplication
    }
  )

  return {
    boards: data?.boards || [],
    pagination: data?.pagination,
    isLoading: organizationId ? (!error && !data) : false,
    error: error?.message || null,
    refresh: mutate
  }
}

// Hook for single board with optimized data fetching
export function useOptimizedBoard(boardId: string | null) {
  const { data: board, error, mutate } = useSWR<Board>(
    boardId ? `/api/boards/${boardId}` : null,
    {
      refreshInterval: 0,
      revalidateOnFocus: false,
      revalidateOnMount: true,
      dedupingInterval: 10000, // 10 seconds for single board
    }
  )

  return {
    board: board || null,
    isLoading: boardId ? (!error && !board) : false,
    error: error?.message || null,
    refresh: mutate
  }
}

// Hook for board tasks with pagination
export function useOptimizedBoardTasks(boardId: string | null, page = 1, limit = 50) {
  const { data, error, mutate } = useSWR(
    boardId ? `/api/tasks?boardId=${boardId}&page=${page}&limit=${limit}` : null,
    {
      refreshInterval: 0,
      revalidateOnFocus: false,
      revalidateOnMount: true,
      dedupingInterval: 5000, // 5 seconds for tasks (more dynamic)
    }
  )

  return {
    tasks: data?.tasks || [],
    pagination: data?.pagination,
    isLoading: boardId ? (!error && !data) : false,
    error: error?.message || null,
    refresh: mutate
  }
}