import { useState, useEffect } from 'react'
import useSWR, { mutate } from 'swr'

interface SprintColumn {
  id: string
  sprintId: string
  name: string
  position: number
  isDone: boolean
  wipLimit?: number
  tasks: any[]
  createdAt: string
}

interface CreateSprintColumnData {
  name: string
  position: number
  isDone?: boolean
  wipLimit?: number
}

interface UpdateSprintColumnData {
  name?: string
  position?: number
  isDone?: boolean
  wipLimit?: number | null
}

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
})

export function useSprintColumns(sprintId: string) {
  const { data: columns, error, mutate: mutateColumns } = useSWR<SprintColumn[]>(
    sprintId ? `/api/sprints/${sprintId}/columns` : null,
    fetcher
  )

  const createColumn = async (data: CreateSprintColumnData) => {
    const response = await fetch(`/api/sprints/${sprintId}/columns`, {
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

  const updateColumn = async (columnId: string, data: UpdateSprintColumnData) => {
    const response = await fetch(`/api/sprints/${sprintId}/columns/${columnId}`, {
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
    const response = await fetch(`/api/sprints/${sprintId}/columns/${columnId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete column')
    }

    mutateColumns()
    return true
  }

  const finishSprint = async () => {
    const response = await fetch(`/api/sprints/${sprintId}/finish`, {
      method: 'POST',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to finish sprint')
    }

    const result = await response.json()
    // Mutate sprint data as well
    mutate(`/api/sprints/${sprintId}`)
    return result
  }

  // Initialize default columns if none exist
  const initializeDefaultColumns = async () => {
    if (!columns || columns.length > 0) return

    const defaultColumns = [
      { name: 'To Do', position: 0, isDone: false },
      { name: 'In Progress', position: 1, isDone: false },
      { name: 'Done', position: 2, isDone: true }
    ]

    for (const column of defaultColumns) {
      await createColumn(column)
    }
  }

  return {
    columns: columns || [],
    isLoading: !error && !columns,
    error,
    createColumn,
    updateColumn,
    deleteColumn,
    finishSprint,
    initializeDefaultColumns,
    mutate: mutateColumns
  }
}