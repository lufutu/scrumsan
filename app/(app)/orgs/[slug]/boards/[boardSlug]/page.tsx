"use client"

import { useParams, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, ArrowLeft, MoreHorizontal, Kanban, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import StandaloneBoardView from '@/components/boards/standalone-board-view'
import Scrum from '@/components/scrum/Scrum'
import BoardEditForm from '@/components/boards/board-edit-form'
import BoardDeleteDialog from '@/components/boards/board-delete-dialog'
import { AppHeader } from '@/components/dashboard/app-header'
import { useSlugBoardData } from '@/hooks/useSlugBoardData'
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


function BoardContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const orgSlug = params.slug as string
  const boardSlug = params.boardSlug as string
  

  // Get initial task ID from URL params for deep linking
  const initialTaskId = searchParams?.get('task') || null

  // IMPORTANT: All hooks must be called before any conditional returns
  const { user } = useSupabase()
  const { organizations } = useOrganization()

  // Use slug-based data fetching - no more UUID API calls!
  const { data: boardData, isLoading: boardDataLoading, error: boardDataError, mutate } = useSlugBoardData(orgSlug, boardSlug)

  // Get organization from the context
  const organization = organizations.find(org => org.slug === orgSlug)

  if (boardDataLoading) {
    return <PageLoadingState message="Loading board data..." />
  }

  if (boardDataError) {
    if (boardDataError.message?.includes('not found')) {
      return <NotFoundErrorState message="Board not found" />
    }
    return <PageErrorState error={boardDataError.message || 'Failed to load board'} onRetry={() => mutate()} />
  }

  if (!boardData) {
    return <PageLoadingState message="Loading board data..." />
  }

  // Render the appropriate board component based on board type
  const isScrum = boardData.board.boardType === 'scrum'

  // Merge tasks with columns for Kanban boards (same logic as UUID board page)
  const boardWithTasks = boardData.board.boardType === 'kanban' && boardData?.tasks && Array.isArray(boardData.tasks) ? {
    ...boardData.board,
    columns: boardData.board.columns?.map(column => {
      const filteredTasks = boardData.tasks.filter(task => task.columnId === column.id)
      return {
        ...column,
        tasks: filteredTasks
      }
    }) || []
  } : boardData.board

  return (
    <div className="flex flex-col h-screen">
      <AppHeader 
        title={boardData.board.name}
        breadcrumbs={[
          { label: organization?.name || 'Organization', href: `/orgs/${orgSlug}` },
          { label: 'Boards', href: `/orgs/${orgSlug}` },
          { label: boardData.board.name }
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
                <BoardEditForm board={boardData.board} onSuccess={() => mutate()}>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    Edit Board
                  </DropdownMenuItem>
                </BoardEditForm>
                <BoardDeleteDialog board={boardData.board}>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    Delete Board
                  </DropdownMenuItem>
                </BoardDeleteDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />
      
      <div className="flex-1 overflow-hidden px-4 py-6">
        {isScrum ? (
          <Scrum
            boardId={boardData.board.id}
            organizationId={boardData.board.organizationId}
            initialTaskId={initialTaskId}
            boardColor={boardData.board.color}
            boardData={boardData}
            onDataChange={mutate}
            onProductBacklogStateChange={() => {}}
          />
        ) : (
          <StandaloneBoardView 
            board={boardWithTasks} 
            onUpdate={mutate}
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