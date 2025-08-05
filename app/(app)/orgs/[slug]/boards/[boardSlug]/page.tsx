"use client"

import { useParams, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, ArrowLeft, MoreHorizontal, Kanban, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import StandaloneBoardView from '@/components/boards/standalone-board-view'
import Scrum from '@/components/scrum/Scrum'
import BoardEditForm from '@/components/boards/board-edit-form'
import BoardDeleteDialog from '@/components/boards/board-delete-dialog'
import { AppHeader } from '@/components/dashboard/app-header'
import { useBoardData } from '@/hooks/useBoardData'
import { useProductBacklogActions } from '@/hooks/useProductBacklogActions'
import { useSupabase } from '@/providers/supabase-provider'
import { useOrganization } from '@/providers/organization-provider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

function BoardContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const orgSlug = params.slug as string
  const boardSlug = params.boardSlug as string
  
  const [board, setBoard] = useState<Board | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get initial task ID from URL params for deep linking
  const initialTaskId = searchParams?.get('task') || null

  // IMPORTANT: All hooks must be called before any conditional returns
  // Use the existing board hooks and components with the board ID
  const { data: boardData, isLoading: boardDataLoading, mutate } = useBoardData(board?.id || null)
  const { user } = useSupabase()
  const { organizations } = useOrganization()

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
  
  // Get organization from the context
  const organization = organizations.find(org => org.slug === orgSlug)

  if (boardDataLoading) {
    return <PageLoadingState message="Loading board data..." />
  }

  if (!boardData) {
    return <PageErrorState error="Failed to load board data" onRetry={() => mutate()} />
  }

  // Render the appropriate board component based on board type
  const isScrum = boardData.boardType === 'scrum'

  return (
    <div className="flex flex-col h-screen">
      <AppHeader 
        title={boardData.name}
        breadcrumbs={[
          { label: organization?.name || 'Organization', href: `/orgs/${orgSlug}` },
          { label: 'Boards', href: `/orgs/${orgSlug}` },
          { label: boardData.name }
        ]}
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isScrum ? <Calendar className="h-4 w-4" /> : <Kanban className="h-4 w-4" />}
              <span>{isScrum ? 'Scrum Board' : 'Kanban Board'}</span>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <BoardEditForm board={boardData} onSuccess={() => mutate()}>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    Edit Board
                  </DropdownMenuItem>
                </BoardEditForm>
                <BoardDeleteDialog board={boardData}>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    Delete Board
                  </DropdownMenuItem>
                </BoardDeleteDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />
      
      <div className="flex-1 overflow-hidden">
        {isScrum ? (
          <Scrum 
            board={boardData} 
            initialTaskId={initialTaskId}
          />
        ) : (
          <StandaloneBoardView 
            board={boardData} 
            initialTaskId={initialTaskId}
          />
        )}
      </div>
    </div>
  )
}

export default function SlugBasedBoardPage() {
  return (
    <Suspense fallback={<PageLoadingState message="Loading board..." />}>
      <BoardContent />
    </Suspense>
  )
}