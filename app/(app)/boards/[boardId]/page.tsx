"use client"

import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, ArrowLeft, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import ProjectBoard from '@/components/projects/project-board'
import StandaloneBoardView from '@/components/boards/standalone-board-view'
import Scrum from '@/components/scrum/Scrum'
import BoardEditForm from '@/components/boards/board-edit-form'
import BoardDeleteDialog from '@/components/boards/board-delete-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Board not found')
    }
    throw new Error('Failed to fetch board')
  }
  return res.json()
})

type Board = {
  id: string
  name: string
  boardType: string | null
  organizationId: string
  description: string | null
  color: string | null
  createdAt: string
  organization?: {
    id: string
    name: string
  } | null
  projectLinks?: Array<{
    id: string
    project: {
      id: string
      name: string
    }
  }>
  columns?: Array<{
    id: string
    name: string
    position: number
    tasks: Array<{
      id: string
      title: string
      description: string | null
      status: string | null
      taskType: string | null
      priority: string | null
      storyPoints: number | null
      assigneeId: string | null
      createdAt: string
      assignee?: {
        id: string
        fullName: string | null
        avatarUrl: string | null
      } | null
    }>
  }>
  _count?: {
    tasks: number
    sprints: number
  }
}

export default function StandaloneBoardPage() {
  const params = useParams()
  const boardId = params?.boardId as string
  
  const { data: board, error, isLoading, mutate } = useSWR<Board>(
    boardId ? `/api/boards/${boardId}` : null,
    fetcher
  )

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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md mx-4 shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              {error.message === 'Board not found' ? (
                <div className="relative">
                  <div className="w-20 h-20 mx-auto mb-6 relative">
                    <div className="absolute inset-0 bg-amber-100 dark:bg-amber-900/30 rounded-full animate-pulse"></div>
                    <div className="relative w-20 h-20 bg-amber-200 dark:bg-amber-800/50 rounded-full flex items-center justify-center animate-bounce">
                      <svg className="w-10 h-10 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-6xl font-black text-gray-300 dark:text-gray-600 mb-4 tracking-wider animate-pulse">404</div>
                </div>
              ) : (
                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center animate-pulse">
                  <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              )}
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-500 delay-200">
                {error.message === 'Board not found' ? 'Board Not Found' : 'Oops! Something went wrong'}
              </h1>
              <p className="text-gray-600 dark:text-gray-300 animate-in fade-in-0 slide-in-from-bottom-2 duration-500 delay-300">
                {error.message === 'Board not found' 
                  ? "The board you're looking for doesn't exist or you don't have access to it."
                  : error.message
                }
              </p>
            </div>
            <Button asChild variant="outline" className="w-full animate-in fade-in-0 slide-in-from-bottom-2 duration-500 delay-500 hover:scale-105 transition-all">
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

  if (!board) {
    return null // Board is still loading or not found (error state handles not found case)
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
            {board.projectLinks && board.projectLinks.length > 0
              ? `Linked to ${board.projectLinks.map(link => link.project.name).join(', ')}` 
              : `Standalone board in ${board.organization?.name}`
            }
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <BoardEditForm board={board} onSuccess={mutate}>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                Edit Board
              </DropdownMenuItem>
            </BoardEditForm>
            <DropdownMenuSeparator />
            <BoardDeleteDialog board={board}>
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
      
      <div className="flex-1">
        {board.boardType === 'scrum' ? (
          <Scrum 
            boardId={board.id}
            organizationId={board.organizationId}
          />
        ) : (
          <StandaloneBoardView board={board} onUpdate={mutate} />
        )}
      </div>
    </div>
  )
} 