import { useState, useEffect } from 'react'

interface TaskRelations {
  parent: {
    id: string
    title: string
    taskType: string
    status: string
    itemCode?: string
  } | null
  subitems: Array<{
    id: string
    title: string
    taskType: string
    status: string
    itemCode?: string
  }>
  blocking: Array<{
    id: string
    title: string
    taskType: string
    status: string
    itemCode?: string
  }>
  blockedBy: Array<{
    id: string
    title: string
    taskType: string
    status: string
    itemCode?: string
  }>
  related: Array<{
    id: string
    title: string
    taskType: string
    status: string
    itemCode?: string
    relationType: string
    direction: 'incoming' | 'outgoing'
  }>
}

export function useTaskRelations(taskId: string | null) {
  const [relations, setRelations] = useState<TaskRelations>({
    parent: null,
    subitems: [],
    blocking: [],
    blockedBy: [],
    related: []
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!taskId) {
      setRelations({
        parent: null,
        subitems: [],
        blocking: [],
        blockedBy: [],
        related: []
      })
      return
    }

    const fetchRelations = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`/api/tasks/${taskId}/relations`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch task relations')
        }
        
        const data = await response.json()
        setRelations(data)
      } catch (err) {
        console.error('Error fetching task relations:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchRelations()
  }, [taskId])

  const refresh = () => {
    if (taskId) {
      const fetchRelations = async () => {
        try {
          const response = await fetch(`/api/tasks/${taskId}/relations`)
          if (response.ok) {
            const data = await response.json()
            setRelations(data)
          }
        } catch (err) {
          console.error('Error refreshing task relations:', err)
        }
      }
      fetchRelations()
    }
  }

  // Helper functions to check relationship states
  const hasParent = !!relations.parent
  const hasSubitems = relations.subitems.length > 0
  const isBlocking = relations.blocking.length > 0
  const isBlocked = relations.blockedBy.some(item => item.status !== 'done')
  const hasIncompleteBlockers = relations.blockedBy.filter(item => item.status !== 'done').length

  return {
    relations,
    isLoading,
    error,
    refresh,
    // Helper flags
    hasParent,
    hasSubitems,
    isBlocking,
    isBlocked,
    hasIncompleteBlockers
  }
}