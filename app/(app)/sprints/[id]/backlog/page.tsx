"use client"

import { useParams, useRouter } from 'next/navigation'
import { useSprint } from '@/hooks/useSprints'
import SprintBacklogView from '@/components/scrum/SprintBacklogView'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useActiveOrg } from '@/hooks/useActiveOrg'

export default function SprintBacklogPage() {
  const params = useParams()
  const router = useRouter()
  const activeOrg = useActiveOrg()
  const sprintId = params.id as string
  
  const { sprint, isLoading, error, mutate } = useSprint(sprintId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Loading sprint backlog...</div>
      </div>
    )
  }

  if (error || !sprint) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-lg text-destructive">
          {error?.message || 'Sprint not found'}
        </div>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
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

  return (
    <div className="h-full">
      <SprintBacklogView
        sprint={sprint}
        boardId={sprint.boardId || ''}
        organizationId={activeOrg?.id}
        onRefresh={mutate}
        onBackToBacklog={handleBackToBacklog}
        onFinishSprint={handleFinishSprint}
      />
    </div>
  )
}