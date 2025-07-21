"use client"

import { useState } from 'react'
import ProductBacklog from './ProductBacklog'
import SprintBacklog from './SprintBacklog'

interface ScrumProps {
  boardId: string
  projectId?: string
  organizationId?: string
  initialTaskId?: string | null
}

interface Sprint {
  id: string
  name: string
  goal?: string
  status: 'planning' | 'active' | 'completed'
  startDate?: string
  endDate?: string
}

export default function Scrum({ boardId, projectId, organizationId }: ScrumProps) {
  const [currentView, setCurrentView] = useState<'product-backlog' | 'sprint-backlog'>('product-backlog')
  const [activeSprint, setActiveSprint] = useState<Sprint | null>({
    id: 'sprint-1',
    name: 'Sprint 1',
    goal: 'Complete user authentication and basic dashboard functionality',
    status: 'active',
    startDate: '2024-01-15',
    endDate: '2024-01-29'
  })

  const handleOpenSprintBacklog = (sprint: Sprint) => {
    setActiveSprint(sprint)
    setCurrentView('sprint-backlog')
  }

  const handleBackToProductBacklog = () => {
    setCurrentView('product-backlog')
  }

  return (
    <div className="h-full">
      {currentView === 'product-backlog' ? (
        <ProductBacklog
          boardId={boardId}
          organizationId={organizationId}
          projectId={projectId}
        />
      ) : activeSprint ? (
        <SprintBacklog
          sprint={activeSprint}
          onBackToBacklog={handleBackToProductBacklog}
        />
      ) : null}
    </div>
  )
}