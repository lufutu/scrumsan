"use client"

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useSprint } from '@/hooks/useSprints'
import SprintBacklogView from '@/components/scrum/SprintBacklogView'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Play, Calendar, Target } from 'lucide-react'
import { useActiveOrg } from '@/hooks/useActiveOrg'
import { AppHeader } from '@/components/dashboard/app-header'
import { PageLoadingState } from '@/components/ui/loading-state'
import { PageErrorState } from '@/components/ui/error-state'

export default function ActiveSprintPage() {
  const params = useParams()
  const router = useRouter()
  const activeOrg = useActiveOrg()
  const sprintId = params.id as string
  
  const { sprint, isLoading, error, mutate } = useSprint(sprintId)
  const [board, setBoard] = useState<{ id: string; name: string } | null>(null)
  const [boardLoading, setBoardLoading] = useState(false)

  // Fetch board data when sprint is loaded
  useEffect(() => {
    if (sprint?.boardId && !board) {
      setBoardLoading(true)
      fetch(`/api/boards/${sprint.boardId}`)
        .then(res => res.json())
        .then(boardData => {
          setBoard({ id: boardData.id, name: boardData.name })
        })
        .catch(console.error)
        .finally(() => setBoardLoading(false))
    }
  }, [sprint?.boardId, board])

  if (isLoading || (sprint?.boardId && boardLoading && !board)) {
    return <PageLoadingState message="Loading active sprint..." />
  }

  if (error || !sprint) {
    return (
      <PageErrorState 
        error={error?.message || 'Sprint not found'}
        onRetry={() => window.location.reload()}
        onGoHome={() => router.push('/')}
      />
    )
  }

  const handleBackToBacklog = () => {
    if (sprint.boardId) {
      router.push(`/boards/${sprint.boardId}`)
    } else if (sprint.projectId) {
      router.push(`/projects/${sprint.projectId}`)
    } else {
      router.back()
    }
  }

  const handleFinishSprint = async (sprintId: string) => {
    // This will be handled by the enhanced component
    console.log('Finishing sprint:', sprintId)
  }

  // Create breadcrumbs based on sprint context
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    ...(sprint.boardId 
      ? [{ label: 'Boards', href: '/boards' }, { label: board?.name || 'Board', href: `/boards/${sprint.boardId}` }]
      : sprint.projectId 
      ? [{ label: 'Projects', href: '/projects' }, { label: 'Project', href: `/projects/${sprint.projectId}` }]
      : [{ label: 'Sprints', href: '/sprints' }]
    ),
    { label: 'Active Sprint', href: `/sprints/${sprint.id}/active` }
  ]

  // Create header actions
  const headerActions = (
    <div className="flex items-center gap-3">
      <Badge variant="default" className="bg-green-500 hover:bg-green-600">
        <Play className="h-3 w-3 mr-1" />
        Active Sprint
      </Badge>
      
      {sprint.goal && (
        <Badge variant="outline" className="hidden sm:flex">
          <Target className="h-3 w-3 mr-1" />
          Has Goal
        </Badge>
      )}
      
      <Button variant="outline" size="sm" onClick={handleBackToBacklog}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Backlog
      </Button>
    </div>
  )

  return (
    <>
      <AppHeader 
        title={sprint?.name || 'Active Sprint'}
        breadcrumbs={breadcrumbs}
        actions={headerActions}
      />
      <main className="flex-1 overflow-auto">
        <div className="h-full flex flex-col">
          <div className="flex-1 px-6">
            <SprintBacklogView
              sprint={sprint}
              boardId={sprint.boardId || ''}
              organizationId={activeOrg?.id}
              onRefresh={() => mutate()}
              onBackToBacklog={handleBackToBacklog}
              onFinishSprint={handleFinishSprint}
            />
          </div>
        </div>
      </main>
    </>
  )
}