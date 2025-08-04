"use client"

import { useEffect, useState, useCallback } from 'react'
import { useActiveOrg } from '@/hooks/useActiveOrg'
import { useToast } from '@/hooks/use-toast'
import { useSupabase } from '@/providers/supabase-provider'
import { useOrganization } from '@/providers/organization-provider'
import { useOptimizedBoards } from '@/hooks/useOptimizedBoards'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Kanban, Calendar, Plus, Users, MoreVertical } from 'lucide-react'
import { OrganizationEmptyState, BoardEmptyState } from '@/components/ui/empty-state'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AppHeader } from '@/components/dashboard/app-header'
import BoardCreationWizard from '@/components/projects/board-creation-wizard-simple'
import BoardEditForm from '@/components/boards/board-edit-form'
import BoardDeleteDialog from '@/components/boards/board-delete-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tables } from '@/types/database'

// Updated Board type to match actual Prisma schema
type Board = {
  id: string
  name: string
  description: string | null
  color: string | null
  boardType: string | null
  organizationId: string
  createdAt: string
  createdBy?: string | null
  logo?: string | null
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

export default function BoardsPage() {
  const activeOrg = useActiveOrg()
  const { toast } = useToast()
  const router = useRouter()
  const { user } = useSupabase()
  const { currentMember } = useOrganization()
  
  // Use optimized boards hook with caching and deduplication
  const { boards, isLoading, error, refresh } = useOptimizedBoards(activeOrg?.id || null)
  
  // Local state for UI interactions
  const [page, setPage] = useState(1)

  // Show error toast if boards fail to load
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error
      })
    }
  }, [error, toast])


  const handleBoardCreated = async (newBoard?: { id?: string }) => {
    // Refresh the boards list using SWR
    await refresh()

    // Redirect to the new board
    if (newBoard?.id) {
      router.push(`/boards/${newBoard.id}`)
    }
  }

  const getBoardIcon = (boardType?: string | null) => {
    return boardType === 'scrum' ? Calendar : Kanban
  }

  const getBoardTypeLabel = (boardType?: string | null) => {
    return boardType === 'scrum' ? 'Scrum' : 'Kanban'
  }

  const getBoardTypeColor = (boardType?: string | null) => {
    return boardType === 'scrum' ? 'bg-green-500/10 text-green-700 border-green-200' : 'bg-blue-500/10 text-blue-700 border-blue-200'
  }

  if (!activeOrg) {
    return (
      <>
        <AppHeader
          title="Boards"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Boards', icon: <Kanban className="w-4 h-4" />, isCurrentPage: true }
          ]}
        />
        <OrganizationEmptyState
          onCreateOrg={() => router.push('/organizations')}
          className="min-h-[60vh]"
        />
      </>
    )
  }

  if (isLoading) {
    return (
      <>
        <AppHeader
          title="Boards"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Boards', icon: <Kanban className="w-4 h-4" />, isCurrentPage: true }
          ]}
          actions={<Skeleton className="h-10 w-32" />}
        />
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <AppHeader
        title="Boards"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Boards', icon: <Kanban className="w-4 h-4" />, isCurrentPage: true }
        ]}
        actions={
          <BoardCreationWizard organizationId={activeOrg.id} onSuccess={handleBoardCreated}>
            <Button data-board-creation-trigger>
              <Plus className="h-4 w-4 mr-2" />
              Create Board
            </Button>
          </BoardCreationWizard>
        }
      />
      <div className="px-4 py-6 space-y-6">

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && boards.length === 0 ? (
          <BoardEmptyState
            onCreateBoard={() => {
              // Find the create board trigger element
              const createButton = document.querySelector('[data-board-creation-trigger]')
              if (createButton instanceof HTMLElement) {
                createButton.click()
              }
            }}
            className="min-h-[60vh]"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {boards.map((board) => {
              const BoardIcon = getBoardIcon(board.boardType)
              const taskCount = board._count?.tasks || 0
              const columnCount = 0 // Will be loaded separately if needed

              return (
                <Card key={board.id} className="hover:shadow-lg transition-all relative group">
                  <div
                    className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/boards/${board.id}`}>
                            Open Board
                          </Link>
                        </DropdownMenuItem>
                        {(user?.id === board.createdBy || ['owner', 'admin'].includes(currentMember?.role || '')) && (
                          <BoardEditForm
                            board={{
                              id: board.id,
                              name: board.name,
                              description: board.description,
                              boardType: board.boardType,
                              color: board.color
                            }}
                            onSuccess={refresh}
                          >
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              Edit Board
                            </DropdownMenuItem>
                          </BoardEditForm>
                        )}
                        <DropdownMenuSeparator />
                        {(user?.id === board.createdBy || ['owner', 'admin'].includes(currentMember?.role || '')) && (
                          <BoardDeleteDialog
                            board={{
                              id: board.id,
                              name: board.name,
                              _count: {
                                tasks: taskCount,
                                sprints: 0 // We don't have this data in the list view
                              }
                            }}
                            onSuccess={refresh}
                            redirectTo={null}
                          >
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-red-600"
                            >
                              Delete Board
                            </DropdownMenuItem>
                          </BoardDeleteDialog>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <Link href={`/boards/${board.id}`} className="block">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <BoardIcon className="h-5 w-5 text-muted-foreground" />
                          <CardTitle className="text-xl truncate">{board.name}</CardTitle>
                        </div>
                        <Badge className={`${getBoardTypeColor(board.boardType)} border`}>
                          {getBoardTypeLabel(board.boardType)}
                        </Badge>
                      </div>
                      {board.created_at && (
                        <CardDescription>
                          Created {new Date(board.created_at).toLocaleDateString()}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardContent>
                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Kanban className="h-4 w-4" />
                          <span>{columnCount} columns</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{taskCount} tasks</span>
                        </div>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
} 