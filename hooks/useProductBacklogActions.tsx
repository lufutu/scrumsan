"use client"

import { Button } from '@/components/ui/button'
import { Calendar, Plus, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { Sprint } from '@/types/shared'

interface UseProductBacklogActionsProps {
  boardId: string
  activeSprint: Sprint | null
  showFinishedSprints: boolean
  onToggleFinishedSprints: () => void
  onCreateSprint: () => void
}

export function useProductBacklogActions({
  boardId,
  activeSprint,
  showFinishedSprints,
  onToggleFinishedSprints,
  onCreateSprint
}: UseProductBacklogActionsProps) {
  
  const actions = (
    <div className="flex items-center gap-2">
      {activeSprint && (
        <Button asChild variant="outline" size="sm" aria-label='Active Sprint'>
          <Link href={`/boards/${boardId}/sprint-backlog?sprintId=${activeSprint.id}`}>
            <Calendar className="h-4 w-4 mr-2" />            
          </Link>
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        aria-label={showFinishedSprints ? 'Hide finished sprints' : 'Show finished sprints'}
        onClick={onToggleFinishedSprints}
      >
        {showFinishedSprints ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}        
      </Button>
      <Button
        variant="default"
        size="sm"
        onClick={onCreateSprint}
      >
        <Plus className="h-4 w-4 mr-2" />
        New Sprint
      </Button>
    </div>
  )

  return { actions }
}