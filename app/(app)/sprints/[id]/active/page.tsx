"use client"

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useSprint, useSprints } from '@/hooks/useSprints'
import SprintBacklogView from '@/components/scrum/SprintBacklogView'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { useActiveOrg } from '@/hooks/useActiveOrg'
import { AppHeader } from '@/components/dashboard/app-header'
import { PageLoadingState } from '@/components/ui/loading-state'
import { PageErrorState } from '@/components/ui/error-state'
import { toast } from 'sonner'
import { Edit } from 'lucide-react'

export default function ActiveSprintPage() {
  const params = useParams()
  const router = useRouter()
  const activeOrg = useActiveOrg()
  const sprintId = params.id as string

  const { sprint, isLoading, error, mutate } = useSprint(sprintId)
  const { finishSprint } = useSprints()
  const [board, setBoard] = useState<{ id: string; name: string } | null>(null)
  const [boardLoading, setBoardLoading] = useState(false)
  const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

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
    } else {
      router.back()
    }
  }

  const handleFinishSprint = async () => {
    try {
      const result = await finishSprint(sprintId)

      // Show success message
      if (result.newSprintId) {
        // Sprint finished with unfinished tasks moved to new sprint
        toast.success(`Sprint finished successfully! ${result.unfinishedTasksCount} unfinished tasks were moved to "${result.newSprintName}".`)
      } else {
        // Sprint finished with all tasks completed
        toast.success('Sprint finished successfully! All tasks completed!')
      }

      // Close dialog
      setIsFinishDialogOpen(false)

      // Navigate back to the board or project
      if (sprint.boardId) {
        router.push(`/boards/${sprint.boardId}`)
      } else {
        router.push('/sprints')
      }
    } catch (error: unknown) {
      console.error('Error finishing sprint:', error)
      setIsFinishDialogOpen(false)
    }
  }

  // Create breadcrumbs based on sprint context
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    ...(sprint.boardId
      ? [{ label: 'Boards', href: '/boards' }, { label: board?.name || 'Board', href: `/boards/${sprint.boardId}` }]
      : [{ label: 'Sprints', href: '/sprints' }]
    ),
    { label: 'Active Sprint', href: `/sprints/${sprint.id}/active` }
  ]

  // Create header actions
  const headerActions = (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        onClick={() => setIsEditDialogOpen(true)}
        className="flex items-center gap-2"
      >
        <Edit className="h-4 w-4" />
        Edit Sprint
      </Button>
      <Button
        onClick={() => setIsFinishDialogOpen(true)}
        className="bg-green-600 hover:bg-green-700"
      >
        Finish Sprint
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
      <div className='px-4 py-6'>
        <SprintBacklogView
          sprint={sprint}
          boardId={sprint.boardId || ''}
          organizationId={activeOrg?.id}
          onRefresh={() => mutate()}
          onBackToBacklog={handleBackToBacklog}
          onFinishSprint={() => setIsFinishDialogOpen(true)}
          isEditDialogOpen={isEditDialogOpen}
          onEditDialogChange={setIsEditDialogOpen}
        />
      </div>

      {/* Finish Sprint Confirmation Dialog */}
      <AlertDialog open={isFinishDialogOpen} onOpenChange={setIsFinishDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finish Sprint</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to finish this sprint? All unfinished items will be moved to a new sprint in the Product Backlog.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFinishSprint}
              className="bg-green-600 hover:bg-green-700"
            >
              Finish Sprint
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}