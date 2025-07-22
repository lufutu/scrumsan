"use client"

import { useEffect, useState } from 'react'
import { useActiveOrg } from '@/hooks/useActiveOrg'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Kanban, Calendar, Plus, Users, MoreVertical } from 'lucide-react'
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

type Board = Tables<'boards'> & {
  tasks: { count: number }[]
  board_columns: { count: number }[]
}

export default function BoardsPage() {
  const activeOrg = useActiveOrg()
  const { toast } = useToast()
  const router = useRouter()
  const [boards, setBoards] = useState<Board[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (activeOrg?.id) {
      fetchBoards()
    }
  }, [activeOrg?.id])

  const fetchBoards = async () => {
    if (!activeOrg?.id) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/boards?organizationId=${activeOrg.id}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch boards')
      }
      
      const data = await response.json()
      
      // Transform the data to match the expected format
      const transformedBoards = data.map((board: { boardType?: string; createdAt?: string; _count?: { tasks?: number; columns?: number } }) => ({
        ...board,
        board_type: board.boardType,
        created_at: board.createdAt,
        tasks: [{ count: board._count?.tasks || 0 }],
        board_columns: [{ count: board._count?.columns || 0 }]
      }))

      setBoards(transformedBoards)
    } catch (err) {
      console.error('Error fetching boards:', err)
      setError('Failed to load boards')
      toast({
        title: "Error",
        description: "Failed to load boards"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBoardCreated = async (newBoard?: { id?: string }) => {
    // Refresh the boards list
    await fetchBoards()
    
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
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-6">
            <Card>
              <CardContent className="p-6 text-center">
                <h1 className="text-2xl font-bold text-muted-foreground">No Organization Selected</h1>
                <p className="text-muted-foreground mt-2">Please select an organization to view boards.</p>
              </CardContent>
            </Card>
          </div>
        </main>
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
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-6">
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
          </div>
        </main>
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
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Board
            </Button>
          </BoardCreationWizard>
        }
      />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="space-y-6">

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

          {!isLoading && boards.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Kanban className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No boards yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first board to start organizing work.
              </p>
              <BoardCreationWizard organizationId={activeOrg.id} onSuccess={handleBoardCreated}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Board
                </Button>
              </BoardCreationWizard>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {boards.map((board) => {
              const BoardIcon = getBoardIcon(board.board_type)
              const taskCount = board.tasks?.[0]?.count || 0
              const columnCount = board.board_columns?.[0]?.count || 0

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
                        <BoardEditForm 
                          board={{
                            id: board.id,
                            name: board.name,
                            description: board.description,
                            boardType: board.board_type,
                            color: board.color
                          }} 
                          onSuccess={fetchBoards}
                        >
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            Edit Board
                          </DropdownMenuItem>
                        </BoardEditForm>
                        <DropdownMenuSeparator />
                        <BoardDeleteDialog 
                          board={{
                            id: board.id,
                            name: board.name,
                            _count: {
                              tasks: taskCount,
                              sprints: 0 // We don't have this data in the list view
                            }
                          }}
                          onSuccess={fetchBoards}
                          redirectTo={null}
                        >
                          <DropdownMenuItem 
                            onSelect={(e) => e.preventDefault()}
                            className="text-red-600"
                          >
                            Delete Board
                          </DropdownMenuItem>
                        </BoardDeleteDialog>
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
                        <Badge className={`${getBoardTypeColor(board.board_type)} border`}>
                          {getBoardTypeLabel(board.board_type)}
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
        </div>
      </main>
    </>
  )
} 