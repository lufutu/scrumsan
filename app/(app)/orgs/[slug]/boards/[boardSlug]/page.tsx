"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useActiveOrg } from '@/hooks/useActiveOrg'
import { PageLoadingState } from '@/components/ui/loading-state'
import { PageErrorState } from '@/components/ui/error-state'
import { NotFoundErrorState } from '@/components/ui/error-state'

interface Board {
  id: string
  name: string
  slug: string
  description: string | null
  boardType: string | null
  organizationId: string
}

export default function SlugBasedBoardPage() {
  const params = useParams()
  const router = useRouter()
  const activeOrg = useActiveOrg()
  const [board, setBoard] = useState<Board | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const orgSlug = params.slug as string
  const boardSlug = params.boardSlug as string

  useEffect(() => {
    async function fetchBoard() {
      if (!orgSlug || !boardSlug) return

      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`/api/orgs/${orgSlug}/boards/${boardSlug}`)
        
        if (response.status === 404) {
          setError('Board not found')
          return
        }

        if (!response.ok) {
          throw new Error('Failed to fetch board')
        }

        const boardData = await response.json()
        setBoard(boardData)

      } catch (err) {
        console.error('Error fetching board:', err)
        setError(err instanceof Error ? err.message : 'Failed to load board')
      } finally {
        setIsLoading(false)
      }
    }

    fetchBoard()
  }, [orgSlug, boardSlug])

  if (isLoading) {
    return <PageLoadingState message="Loading board..." />
  }

  if (error) {
    if (error === 'Board not found') {
      return <NotFoundErrorState message="Board not found" />
    }
    return <PageErrorState error={error} onRetry={() => window.location.reload()} />
  }

  if (!board) {
    return <PageLoadingState message="Loading board data..." />
  }

  // Redirect to the UUID-based route for now, since that has the full implementation
  // TODO: Eventually implement the full board component here to eliminate UUID routes
  router.replace(`/boards/${board.id}`)
  
  return <PageLoadingState message="Redirecting to board..." />
}