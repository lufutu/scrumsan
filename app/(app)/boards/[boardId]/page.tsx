"use client"

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSupabase } from '@/providers/supabase-provider'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import ProjectBoard from '@/components/projects/project-board'
import ProjectScrumBoard from '@/components/projects/project-scrum-board'
import StandaloneBoardView from '@/components/boards/standalone-board-view'
import { Tables } from '@/types/database'

type Board = Tables<'boards'> & {
  organization?: {
    name: string
  } | null
  project?: {
    name: string
    organization_id: string | null
  } | null
  board_columns?: Array<Tables<'board_columns'> & {
    tasks: Array<Tables<'tasks'> & {
      assignee?: {
        id: string
        full_name: string | null
        avatar_url: string | null
      } | null
    }>
  }>
}

export default function StandaloneBoardPage() {
  const params = useParams()
  const boardId = params?.boardId as string
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const [board, setBoard] = useState<Board | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (boardId) {
      fetchBoard()
    }
  }, [boardId])

  const fetchBoard = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('boards')
        .select(`
          *,
          organization:organizations(name),
          project:projects(name, organization_id),
          board_columns (
            *,
            tasks (
              *,
              assignee:users!assignee_id (
                id,
                full_name,
                avatar_url
              )
            )
          )
        `)
        .eq('id', boardId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          setError('Board not found')
        } else {
          throw error
        }
        return
      }

      // Sort columns by position and tasks by created_at if board_columns exist
      if (data.board_columns) {
        data.board_columns.sort((a, b) => a.position - b.position)
        data.board_columns.forEach(column => {
          column.tasks.sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime())
        })
      }

      setBoard(data)
    } catch (err: unknown) {
      console.error('Error fetching board:', err)
      setError('Failed to load board')
      toast({
        title: "Error",
        description: "Failed to load board"
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!boardId) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-6 text-center">
            <h1 className="text-2xl font-bold text-red-600">Error: Board ID not found</h1>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading board...</p>
        </div>
      </div>
    )
  }

  if (error || !board) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-6 text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">{error || 'Board not found'}</h1>
            <Button asChild variant="outline">
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{board.name}</h1>
          <p className="text-muted-foreground">
            {board.project_id 
              ? `Project board in ${board.project?.name}` 
              : `Standalone board in ${board.organization?.name}`
            }
          </p>
        </div>
      </div>
      
      <div className="flex-1">
        {board.project_id ? (
          board.board_type === 'scrum' && board.board_columns ? (
            <ProjectScrumBoard 
              projectId={board.project_id} 
              board={board as any} 
              onUpdate={fetchBoard} 
            />
          ) : (
            <ProjectBoard projectId={board.project_id} />
          )
        ) : (
          <StandaloneBoardView boardId={boardId} board={board} onUpdate={fetchBoard} />
        )}
      </div>
    </div>
  )
} 