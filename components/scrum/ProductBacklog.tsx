"use client"

import React, { useState, useCallback, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { ItemModal } from './ItemModal'
import { StaticSprintColumn } from './StaticSprintColumn'
import { SprintDialogs } from './SprintDialogs'
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { DragDropProvider } from '@/components/drag-drop/DragDropProvider'
import { AutoScroll } from '@/components/drag-drop/AutoScroll'
import { BoardTasksDebug } from '@/components/debug/BoardTasksDebug'

import { useRouter } from 'next/navigation'
import { Sprint, Task, ProductBacklogProps } from '@/types/shared'
import { DragDropAPI } from '@/lib/drag-drop-api'

interface ProductBacklogState {
  showFinishedSprints: boolean
  onToggleFinishedSprints: () => void
  onCreateSprint: () => void
}

interface ExtendedProductBacklogProps extends ProductBacklogProps {
  onStateChange?: (state: ProductBacklogState) => void
}

export default function ProductBacklog({
  boardId,
  boardColor,
  boardData,
  onDataChange,
  onStateChange
}: ExtendedProductBacklogProps) {
  const router = useRouter()
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showFinishedSprints, setShowFinishedSprints] = useState(false)

  // Sprint dialog states
  const [isCreateSprintOpen, setIsCreateSprintOpen] = useState(false)
  const [newSprintData, setNewSprintData] = useState({ name: '', goal: '' })
  const [isEditSprintOpen, setIsEditSprintOpen] = useState(false)
  const [editingSprintId, setEditingSprintId] = useState<string | null>(null)
  const [editSprintData, setEditSprintData] = useState({ name: '', goal: '' })
  const [isStartSprintOpen, setIsStartSprintOpen] = useState(false)
  const [startingSprintId, setStartingSprintId] = useState<string | null>(null)
  const [startSprintData, setStartSprintData] = useState({ dueDate: '', goal: '' })
  const [isFixingOrphanedTasks, setIsFixingOrphanedTasks] = useState(false)

  // Expose state to parent component
  const handleToggleFinishedSprints = useCallback(() => {
    setShowFinishedSprints(!showFinishedSprints)
  }, [showFinishedSprints])

  const handleCreateSprintAction = useCallback(() => {
    setIsCreateSprintOpen(true)
  }, [])

  // Notify parent of state changes
  React.useEffect(() => {
    if (onStateChange) {
      onStateChange({
        showFinishedSprints,
        onToggleFinishedSprints: handleToggleFinishedSprints,
        onCreateSprint: handleCreateSprintAction
      })
    }
  }, [showFinishedSprints, handleToggleFinishedSprints, handleCreateSprintAction, onStateChange])

  // Extract data from boardData
  const sprints = useMemo(() => boardData?.sprints || [], [boardData?.sprints])
  const sprintDetails = useMemo(() => boardData?.sprintDetails || [], [boardData?.sprintDetails])  
  const tasks = useMemo(() => boardData?.tasks || [], [boardData?.tasks])
  const labels = useMemo(() => boardData?.labels || [], [boardData?.labels])
  const users = useMemo(() => boardData?.users || [], [boardData?.users])
  const activeSprint = boardData?.activeSprint || null

  // Mutation functions - simplified without React Query cache fighting
  const mutateSprints = useCallback(() => {
    if (onDataChange) onDataChange()
  }, [onDataChange])

  const mutateTasks = useCallback(() => {
    if (onDataChange) onDataChange()
  }, [onDataChange])

  // Filter sprints - always include backlog sprint and ensure backlog is first
  const visibleSprints = useMemo(() => {
    const filteredSprints = sprints.filter((s: Sprint) => 
      !s.isDeleted && 
      (s.isBacklog || showFinishedSprints || !s.isFinished)
    )
    
    // Sort to ensure backlog is always first
    return filteredSprints.sort((a, b) => {
      if (a.isBacklog && !b.isBacklog) return -1
      if (!a.isBacklog && b.isBacklog) return 1
      return 0
    })
  }, [sprints, showFinishedSprints])

  // Group tasks by sprint - memoized to prevent infinite loops
  const getTasksForSprint = useCallback((sprintId: string) => {
    const sprint = sprintDetails.find((s: Sprint) => s.id === sprintId) || sprints.find((s: Sprint) => s.id === sprintId)
    if (!sprint) return []

    let sprintTasks: Task[] = []

    // For backlog sprint, return tasks that either:
    // 1. Have no sprintId (traditional backlog tasks) OR
    // 2. Have sprintId pointing to this backlog sprint (but no sprintColumnId since backlog has no columns)
    if (sprint.isBacklog) {
      sprintTasks = tasks.filter((task: Task) => 
        (
          (!task.sprintId && !task.columnId && !task.sprintColumnId) || // Traditional backlog tasks
          (task.sprintId === sprint.id && !task.sprintColumnId) // Tasks assigned to backlog sprint
        ) &&
        !task.labels?.includes('__followup__')
      )
    } else {
      // For regular sprints, return tasks from sprint relation
      if (!sprint.tasks) return []
      sprintTasks = sprint.tasks
    }

    return sprintTasks
  }, [sprintDetails, sprints, tasks])

  // Handle task movement with new API
  const handleTaskMove = useCallback(async (
    taskId: string, 
    targetLocation: { sprintId?: string | null; columnId?: string | null }
  ) => {
    const currentTask = tasks.find(t => t.id === taskId)
    if (!currentTask) {
      toast.error('Task not found')
      return
    }

    try {
      if (targetLocation.sprintId === null) {
        // Moving to backlog
        if (currentTask.sprintId) {
          await DragDropAPI.moveTask(
            'to-backlog',
            {
              taskId,
              sourceSprintId: currentTask.sprintId
            },
            () => {
              // Success callback
              mutateTasks()
            },
            (error) => {
              // Error callback - rollback will be handled by DragDropProvider
              console.error('Failed to move task to backlog:', error)
            }
          )
        }
      } else {
        // Moving to sprint
        await DragDropAPI.moveTask(
          'to-sprint',
          {
            taskId,
            targetSprintId: targetLocation.sprintId
          },
          () => {
            // Success callback
            mutateTasks()
          },
          (error) => {
            // Error callback - rollback will be handled by DragDropProvider
            console.error('Failed to move task to sprint:', error)
          }
        )
      }
    } catch (error) {
      console.error('Task move operation failed:', error)
    }
  }, [tasks, mutateTasks])

  // Handle task drop on sprint column
  const handleTaskDrop = useCallback((taskId: string, targetSprintId: string) => {
    handleTaskMove(taskId, { sprintId: targetSprintId })
  }, [handleTaskMove])

  // Sprint action handlers (simplified)
  const handleSprintAction = async (action: string, sprintId: string) => {
    const sprint = sprints.find((s: Sprint) => s.id === sprintId)
    if (!sprint) return

    switch (action) {
      case 'start':
        setStartingSprintId(sprintId)
        setStartSprintData({
          dueDate: '',
          goal: sprint.goal || ''
        })
        setIsStartSprintOpen(true)
        break

      case 'finish':
        toast.success(`Sprint "${sprint.name}" finished successfully!`)
        
        try {
          const response = await fetch(`/api/sprints/${sprintId}/finish`, {
            method: 'POST'
          })
          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to finish sprint')
          }
          
          mutateSprints()
          mutateTasks()
        } catch (error: unknown) {
          toast.error((error as Error).message)
        }
        break

      case 'delete':
        if (confirm(`Are you sure you want to delete "${sprint.name}"?`)) {
          toast.success(`Sprint "${sprint.name}" deleted successfully!`)
          
          try {
            const response = await fetch(`/api/sprints/${sprintId}`, {
              method: 'DELETE'
            })
            if (!response.ok) {
              const error = await response.json()
              throw new Error(error.error || 'Failed to delete sprint')
            }
            
            mutateSprints()
          } catch (error: unknown) {
            toast.error((error as Error).message)
            mutateSprints()
          }
        }
        break

      case 'edit':
        setEditingSprintId(sprintId)
        setEditSprintData({
          name: sprint.name,
          goal: sprint.goal || ''
        })
        setIsEditSprintOpen(true)
        break
    }
  }

  const handleCreateSprint = async () => {
    if (!newSprintData.name.trim()) {
      toast.error('Sprint name is required')
      return
    }

    setIsCreateSprintOpen(false)
    toast.success(`Sprint "${newSprintData.name}" created successfully!`)

    try {
      const response = await fetch('/api/sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newSprintData,
          boardId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create sprint')
      }

      mutateSprints()
      setNewSprintData({ name: '', goal: '' })
    } catch (error: unknown) {
      toast.error((error as Error).message)
      setIsCreateSprintOpen(true)
    }
  }

  const handleEditSprint = async () => {
    if (!editSprintData.name.trim()) {
      toast.error('Sprint name is required')
      return
    }

    if (!editingSprintId) return

    setIsEditSprintOpen(false)
    toast.success(`Sprint "${editSprintData.name}" updated successfully!`)

    try {
      const response = await fetch(`/api/sprints/${editingSprintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editSprintData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update sprint')
      }

      mutateSprints()
      setEditingSprintId(null)
      setEditSprintData({ name: '', goal: '' })
    } catch (error: unknown) {
      toast.error((error as Error).message)
      setIsEditSprintOpen(true)
    }
  }

  const handleAddTask = async (sprintId: string, data: {
    title: string;
    taskType: string;
    assignees?: Array<{ id: string }>;
    labels?: string[];
    storyPoints?: number;
    priority?: string;
  }) => {
    try {
      const sprint = sprints.find((s: Sprint) => s.id === sprintId)
      if (!sprint) {
        toast.error('Sprint not found')
        return
      }

      toast.success('Task created successfully')

      const taskData = {
        title: data.title,
        description: '',
        boardId,
        taskType: data.taskType as 'story' | 'bug' | 'task' | 'epic' | 'improvement',
        storyPoints: data.storyPoints || 0,
        assignees: data.assignees || [],
        labels: data.labels || [],
        priority: data.priority,
        sprintId
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create task')
      }

      mutateTasks()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to create task')
    }
  }

  const handleStartSprint = async () => {
    if (!startingSprintId) return

    const sprint = sprints.find((s: Sprint) => s.id === startingSprintId)
    if (!sprint) return

    setIsStartSprintOpen(false)
    toast.success(`Sprint "${sprint.name}" started successfully!`)

    try {
      const response = await fetch(`/api/sprints/${startingSprintId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endDate: startSprintData.dueDate || null,
          goal: startSprintData.goal || null
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start sprint')
      }

      mutateSprints()
      setStartingSprintId(null)
      setStartSprintData({ dueDate: '', goal: '' })

      setTimeout(() => {
        router.push(`/sprints/${startingSprintId}/active`)
      }, 500)
    } catch (error: unknown) {
      toast.error((error as Error).message)
      setIsStartSprintOpen(true)
    }
  }

  const handleFixOrphanedTasks = async () => {
    setIsFixingOrphanedTasks(true)
    try {
      const response = await fetch('/api/tasks/fix-orphaned', {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to fix orphaned tasks')
      }

      const result = await response.json()
      toast.success(result.message)
      
      // Refresh data to show fixed tasks
      if (onDataChange) {
        onDataChange()
      }
    } catch (error: unknown) {
      console.error('Error fixing orphaned tasks:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to fix orphaned tasks')
    } finally {
      setIsFixingOrphanedTasks(false)
    }
  }


  if (!boardData) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Check for orphaned tasks (have sprintId but no sprintColumnId)
  const orphanedTasks = tasks.filter(task => task.sprintId && !task.sprintColumnId)
  const hasOrphanedTasks = orphanedTasks.length > 0

  return (
    <DragDropProvider 
      initialTasks={tasks}
      onTaskMove={handleTaskMove}
    >
      {/* Debug: Fix Orphaned Tasks Button */}
      {hasOrphanedTasks && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-yellow-800">
                Found {orphanedTasks.length} orphaned task(s)
              </h4>
              <p className="text-xs text-yellow-600 mt-1">
                These tasks are assigned to sprints but not in any columns. Click to move them to backlog.
              </p>
            </div>
            <button
              onClick={handleFixOrphanedTasks}
              disabled={isFixingOrphanedTasks}
              className="ml-4 px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 disabled:opacity-50"
            >
              {isFixingOrphanedTasks ? 'Fixing...' : 'Fix Tasks'}
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-2">
              <summary className="text-xs text-yellow-600 cursor-pointer">Show orphaned tasks</summary>
              <ul className="mt-1 text-xs text-yellow-700">
                {orphanedTasks.map(task => (
                  <li key={task.id}>
                    {task.title} (sprintId: {task.sprintId?.slice(0, 8)}..., sprintColumnId: {task.sprintColumnId || 'null'})
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Debug Component - only show in development or when there are issues */}
      {(process.env.NODE_ENV === 'development' || hasOrphanedTasks) && (
        <BoardTasksDebug 
          boardId={boardId} 
          onRefresh={onDataChange}
        />
      )}

      {/* Sprint Columns */}
      <AutoScroll className='w-full h-full overflow-auto' scrollSpeed="standard">
        <ScrollArea className='w-full'>
          <div className="inline-flex min-w-full gap-4 min-h-full">
          {visibleSprints.map((sprint: Sprint) => (
            <StaticSprintColumn
              key={sprint.id}
              sprint={sprint}
              tasks={getTasksForSprint(sprint.id)}
              onTaskClick={setSelectedTask}
              onSprintAction={handleSprintAction}
              onAddTask={handleAddTask}
              labels={labels || []}
              users={users || []}
              boardColor={boardColor}
              isActiveSprint={sprint.id === activeSprint?.id}
              boardId={boardId}
              onTaskUpdate={mutateTasks}
              onTaskDrop={handleTaskDrop}
              organizationId={boardData?.board?.organizationId}
            />
          ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </AutoScroll>

      {/* Item Modal */}
      {selectedTask && (
        <ItemModal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          taskId={selectedTask.id}
          onUpdate={() => {
            mutateTasks()
          }}
        />
      )}

      {/* Sprint Dialogs */}
      <SprintDialogs
        isCreateSprintOpen={isCreateSprintOpen}
        setIsCreateSprintOpen={setIsCreateSprintOpen}
        newSprintData={newSprintData}
        setNewSprintData={setNewSprintData}
        onCreateSprint={handleCreateSprint}
        isEditSprintOpen={isEditSprintOpen}
        setIsEditSprintOpen={setIsEditSprintOpen}
        editSprintData={editSprintData}
        setEditSprintData={setEditSprintData}
        onEditSprint={handleEditSprint}
        isStartSprintOpen={isStartSprintOpen}
        setIsStartSprintOpen={setIsStartSprintOpen}
        startSprintData={startSprintData}
        setStartSprintData={setStartSprintData}
        onStartSprint={handleStartSprint}
      />
    </DragDropProvider>
  )
}