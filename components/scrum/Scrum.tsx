"use client"

import { useState, useEffect } from 'react'
import ProductBacklogRedesigned from './ProductBacklogRedesigned'
import SprintBacklog from './SprintBacklog'
import { BoardData } from '@/hooks/useBoardData'

interface ScrumProps {
  boardId: string
  projectId?: string
  organizationId?: string
  initialTaskId?: string | null
  boardColor?: string | null
  boardData?: BoardData | null
  onDataChange?: () => void
}

interface Sprint {
  id: string
  name: string
  goal?: string
  status: 'planning' | 'active' | 'completed'
  startDate?: string
  endDate?: string
}

export default function Scrum({ boardId, projectId, organizationId, initialTaskId, boardColor, boardData, onDataChange }: ScrumProps) {
  const [currentView, setCurrentView] = useState<'product-backlog' | 'sprint-backlog'>('product-backlog')
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null)
  
  // Use provided board data instead of fetching
  const activeSprint = boardData?.activeSprint
  
  // Check URL params for sprint view
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const sprintId = urlParams.get('sprintId')
    if (sprintId && activeSprint) {
      setSelectedSprintId(sprintId)
      setCurrentView('sprint-backlog')
    }
  }, [activeSprint])

  const handleOpenSprintBacklog = (sprintId: string) => {
    setSelectedSprintId(sprintId)
    setCurrentView('sprint-backlog')
  }

  const handleBackToProductBacklog = () => {
    setCurrentView('product-backlog')
    // Remove sprintId from URL
    const url = new URL(window.location.href)
    url.searchParams.delete('sprintId')
    window.history.replaceState({}, '', url.toString())
  }

  return (
    <div className="h-full">
      {currentView === 'product-backlog' ? (
        <ProductBacklogRedesigned
          boardId={boardId}
          organizationId={organizationId}
          projectId={projectId}
          initialTaskId={initialTaskId}
          boardColor={boardColor}
          boardData={boardData}
          onDataChange={onDataChange}
        />
      ) : selectedSprintId && activeSprint ? (
        <SprintBacklog
          sprint={{ 
            id: selectedSprintId,
            name: activeSprint.name || '',
            goal: activeSprint.goal || '',
            status: activeSprint.status as 'completed' | 'active' | 'planning',
            startDate: activeSprint.startDate || '',
            endDate: activeSprint.endDate || ''
          }}
          onBackToBacklog={handleBackToProductBacklog}
        />
      ) : null}
    </div>
  )
}