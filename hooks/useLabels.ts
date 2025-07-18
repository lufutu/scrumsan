import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
})

export type Label = {
  id: string
  name: string
  description: string | null
  color: string | null
  createdAt: string
}

export type LabelWithStats = Label & {
  itemCount: number
  totalPoints: number
  totalLoggedTime: number
  assignees: Array<{
    id: string
    fullName: string | null
    avatarUrl: string | null
  }>
}

export function useLabels(boardId: string) {
  const { data, error, isLoading, mutate } = useSWR<LabelWithStats[]>(
    boardId ? `/api/boards/${boardId}/labels` : null,
    fetcher
  )

  const createLabel = async (labelData: {
    name: string
    description?: string
    color?: string
  }) => {
    const response = await fetch(`/api/boards/${boardId}/labels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(labelData),
    })

    if (!response.ok) {
      throw new Error('Failed to create label')
    }

    const label = await response.json()
    mutate()
    return label
  }

  const updateLabel = async (labelId: string, labelData: {
    name?: string
    description?: string
    color?: string
  }) => {
    const response = await fetch(`/api/boards/${boardId}/labels/${labelId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(labelData),
    })

    if (!response.ok) {
      throw new Error('Failed to update label')
    }

    const label = await response.json()
    mutate()
    return label
  }

  const deleteLabel = async (labelId: string) => {
    const response = await fetch(`/api/boards/${boardId}/labels/${labelId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error('Failed to delete label')
    }

    mutate()
  }

  return {
    labels: data || [],
    loading: isLoading,
    error,
    createLabel,
    updateLabel,
    deleteLabel,
    mutate
  }
}

export function useLabel(boardId: string, labelId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    boardId && labelId ? `/api/boards/${boardId}/labels/${labelId}` : null,
    fetcher
  )

  return {
    label: data,
    loading: isLoading,
    error,
    mutate
  }
}