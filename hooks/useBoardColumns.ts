import { useState, useEffect } from 'react'
import useSWR, { mutate } from 'swr'

interface BoardColumn {
  id: string
  boardId: string
  name: string
  position: number
  tasks: any[]
  _count: {
    tasks: number
  }
  createdAt: string
}

interface CreateBoardColumnData {
  name: string
  position: number
}

interface UpdateBoardColumnData {
  name?: string
  position?: number
}

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
})

export function useBoardColumns(boardId: string) {
  const { data: columns, error, mutate: mutateColumns } = useSWR<BoardColumn[]>(
    boardId ? `/api/boards/${boardId}/columns` : null,
    fetcher
  )

  const createColumn = async (data: CreateBoardColumnData) => {
    const response = await fetch(`/api/boards/${boardId}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create column')
    }

    const newColumn = await response.json()
    mutateColumns()
    return newColumn
  }

  const updateColumn = async (columnId: string, data: UpdateBoardColumnData) => {
    const response = await fetch(`/api/boards/${boardId}/columns/${columnId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update column')
    }

    const updatedColumn = await response.json()
    mutateColumns()
    return updatedColumn
  }

  const deleteColumn = async (columnId: string) => {
    const response = await fetch(`/api/boards/${boardId}/columns/${columnId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete column')
    }

    mutateColumns()
    return true
  }

  return {
    columns: columns || [],
    isLoading: !error && !columns,
    error,
    createColumn,
    updateColumn,
    deleteColumn,
    mutate: mutateColumns
  }
}