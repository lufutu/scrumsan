"use client"

import { useEffect, useState } from 'react'
import { useSupabase } from '@/providers/supabase-provider'
import { useActiveOrg } from '@/hooks/useActiveOrg'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Kanban, Calendar, Plus, Users } from 'lucide-react'
import Link from 'next/link'
import BoardCreationWizard from '@/components/projects/board-creation-wizard-simple'
import { Tables } from '@/types/database'

type Board = Tables<'boards'> & {
  tasks: { count: number }[]
  board_columns: { count: number }[]
}

export default function BoardsPage() {
  const { supabase } = useSupabase()
  const activeOrg = useActiveOrg()
  const { toast } = useToast()
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

      const { data, error } = await supabase
        .from('boards')
        .select(`
          *,
          tasks(count),
          board_columns(count)
        `)
        .eq('organization_id', activeOrg.id)
        .is('project_id', null) // Only standalone boards
        .order('created_at', { ascending: false })

      if (error) throw error

      setBoards(data || [])
    } catch (err: any) {
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
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6 text-center">
            <h1 className="text-2xl font-bold text-muted-foreground">No Organization Selected</h1>
            <p className="text-muted-foreground mt-2">Please select an organization to view boards.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Boards</h1>
            <p className="text-muted-foreground">Standalone boards in {activeOrg.name}</p>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

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
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Boards</h1>
          <p className="text-muted-foreground">
            Standalone boards in {activeOrg.name}
          </p>
        </div>
        
        <BoardCreationWizard organizationId={activeOrg.id} onSuccess={fetchBoards}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Board
          </Button>
        </BoardCreationWizard>
      </div>

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
              Create your first standalone board to start organizing work.
            </p>
            <BoardCreationWizard organizationId={activeOrg.id} onSuccess={fetchBoards}>
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
              <Card key={board.id} className="hover:shadow-lg transition-all cursor-pointer">
                <Link href={`/boards/${board.id}`}>
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
  )
} 