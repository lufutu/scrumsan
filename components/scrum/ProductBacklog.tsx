"use client"

import React, { useState, useCallback, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { ItemModal } from './ItemModal'
import { StaticSprintColumn } from './StaticSprintColumn'
import { SprintDialogs } from './SprintDialogs'
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

import {
  DragDropContext,
  Droppable,
  DropResult,
} from '@hello-pangea/dnd'
import { useRouter } from 'next/navigation'
import { Sprint, Task, ProductBacklogProps } from '@/types/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cacheKeys } from '@/lib/query-optimization'

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
  const queryClient = useQueryClient()
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showFinishedSprints, setShowFinishedSprints] = useState(false)

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
  const [isCreateSprintOpen, setIsCreateSprintOpen] = useState(false)
  const [newSprintData, setNewSprintData] = useState({ name: '', goal: '' })
  const [isEditSprintOpen, setIsEditSprintOpen] = useState(false)
  const [editingSprintId, setEditingSprintId] = useState<string | null>(null)
  const [editSprintData, setEditSprintData] = useState({ name: '', goal: '' })
  const [isStartSprintOpen, setIsStartSprintOpen] = useState(false)
  const [startingSprintId, setStartingSprintId] = useState<string | null>(null)
  const [startSprintData, setStartSprintData] = useState({ dueDate: '', goal: '' })
  const [isFixingOrphanedTasks, setIsFixingOrphanedTasks] = useState(false)

  // Use provided data directly - React Query handles optimistic updates
  const sprints = useMemo(() => boardData?.sprints || [], [boardData?.sprints])
  const sprintDetails = useMemo(() => boardData?.sprintDetails || [], [boardData?.sprintDetails])  
  const tasks = useMemo(() => boardData?.tasks || [], [boardData?.tasks])
  const labels = useMemo(() => boardData?.labels || [], [boardData?.labels])
  const users = useMemo(() => boardData?.users || [], [boardData?.users])
  const activeSprint = boardData?.activeSprint || null

  // Task movement mutation with proper React Query optimistic updates
  const moveTaskMutation = useMutation({
    mutationFn: async ({ taskId, targetSprintId, position }: { taskId: string, targetSprintId: string, position?: number }) => {
      if (targetSprintId === 'backlog') {
        // Get current task to find its sprint
        const currentTask = tasks.find(t => t.id === taskId)
        if (!currentTask?.sprintId) {
          throw new Error('Task is already in backlog')
        }
        
        const response = await fetch(`/api/sprints/${currentTask.sprintId}/tasks/move-to-backlog`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId, position })
        })
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to move task to backlog')
        }
        return { type: 'backlog', response: await response.json() }
      } else {
        // Move to sprint
        const response = await fetch(`/api/sprints/${targetSprintId}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId })
        })
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to move task')
        }
        return { type: 'sprint', response: await response.json() }
      }
    },
    onMutate: async ({ taskId, targetSprintId }) => {
      // Get orgSlug and boardSlug from URL for cache keys
      const currentUrl = window.location.pathname
      const matches = currentUrl.match(/\/orgs\/([^\/]+)\/boards\/([^\/]+)/)
      const orgSlug = matches?.[1]
      const boardSlug = matches?.[2]

      // Cancel outgoing refetches for slug-based caches
      if (orgSlug && boardSlug) {
        await queryClient.cancelQueries({ queryKey: ['slug-tasks', orgSlug, boardSlug] })
        await queryClient.cancelQueries({ queryKey: ['slug-sprints', orgSlug, boardSlug] })
        await queryClient.cancelQueries({ queryKey: ['slug-sprintDetails', orgSlug, boardSlug] })
      }

      // Snapshot previous values
      const previousTasks = orgSlug && boardSlug ? 
        queryClient.getQueryData<Task[]>(['slug-tasks', orgSlug, boardSlug]) : null
      const previousSprints = orgSlug && boardSlug ?
        queryClient.getQueryData<Sprint[]>(['slug-sprints', orgSlug, boardSlug]) : null

      if (!previousTasks) return { previousTasks, previousSprints, orgSlug, boardSlug }

      // Find current task
      const currentTask = previousTasks.find(t => t.id === taskId)
      if (!currentTask) return { previousTasks, previousSprints, orgSlug, boardSlug }

      // Update tasks cache optimistically
      const updatedTasks = previousTasks.map(task => {
        if (task.id === taskId) {
          if (targetSprintId === 'backlog') {
            // Moving to backlog: clear sprint assignments
            return {
              ...task,
              sprintId: null,
              sprintColumnId: null,
              columnId: null
            }
          } else {
            // Moving to sprint: set sprint assignment
            return {
              ...task,
              sprintId: targetSprintId,
              sprintColumnId: null // Will be set by API when it creates default columns
            }
          }
        }
        return task
      })

      if (orgSlug && boardSlug) {
        queryClient.setQueryData(['slug-tasks', orgSlug, boardSlug], updatedTasks)
      }

      return { previousTasks, previousSprints, orgSlug, boardSlug }
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousTasks && context?.orgSlug && context?.boardSlug) {
        queryClient.setQueryData(['slug-tasks', context.orgSlug, context.boardSlug], context.previousTasks)
      }
      toast.error(error.message || 'Failed to move task')
    },
    onSuccess: (data, variables, context) => {
      const message = data.type === 'backlog' ? 'Task moved to backlog successfully' : 'Task moved successfully'
      toast.success(message)
      
      // Invalidate caches to ensure fresh data
      if (context?.orgSlug && context?.boardSlug) {
        queryClient.invalidateQueries({ queryKey: ['slug-tasks', context.orgSlug, context.boardSlug] })
        queryClient.invalidateQueries({ queryKey: ['slug-sprints', context.orgSlug, context.boardSlug] })
        queryClient.invalidateQueries({ queryKey: ['slug-sprintDetails', context.orgSlug, context.boardSlug] })
      }
      if (onDataChange) onDataChange()
    }
  })

  const sprintsLoading = !boardData
  const tasksLoading = !boardData
  const sprintsError: unknown = null
  const tasksError: unknown = null

  // Task position update mutation with proper React Query optimistic updates
  const updateTaskPositionMutation = useMutation({
    mutationFn: async ({ taskId, position }: { taskId: string, position: number }) => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position })
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update task position')
      }
      return await response.json()
    },
    onMutate: async ({ taskId, position }) => {
      // Get orgSlug and boardSlug from URL for cache keys
      const currentUrl = window.location.pathname
      const matches = currentUrl.match(/\/orgs\/([^\/]+)\/boards\/([^\/]+)/)
      const orgSlug = matches?.[1]
      const boardSlug = matches?.[2]

      // Cancel outgoing refetches
      if (orgSlug && boardSlug) {
        await queryClient.cancelQueries({ queryKey: ['slug-tasks', orgSlug, boardSlug] })
      }

      // Snapshot previous value
      const previousTasks = orgSlug && boardSlug ? 
        queryClient.getQueryData<Task[]>(['slug-tasks', orgSlug, boardSlug]) : null

      if (!previousTasks) return { previousTasks, orgSlug, boardSlug }

      // Update tasks cache optimistically
      const updatedTasks = previousTasks.map(task => 
        task.id === taskId ? { ...task, position } : task
      )

      if (orgSlug && boardSlug) {
        queryClient.setQueryData(['slug-tasks', orgSlug, boardSlug], updatedTasks)
      }

      return { previousTasks, orgSlug, boardSlug }
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousTasks && context?.orgSlug && context?.boardSlug) {
        queryClient.setQueryData(['slug-tasks', context.orgSlug, context.boardSlug], context.previousTasks)
      }
      toast.error(error.message || 'Failed to reorder task')
    },
    onSuccess: (data, variables, context) => {
      toast.success('Task reordered successfully')
      
      // Invalidate cache to ensure fresh data
      if (context?.orgSlug && context?.boardSlug) {
        queryClient.invalidateQueries({ queryKey: ['slug-tasks', context.orgSlug, context.boardSlug] })
      }
      if (onDataChange) onDataChange()
    }
  })

  // Mutation functions - trigger parent data refresh
  const mutateSprints = useCallback(() => {
    if (onDataChange) onDataChange()
  }, [onDataChange])

  const mutateTasks = useCallback(() => {
    if (onDataChange) onDataChange() // This invalidates all caches including sprintDetails
  }, [onDataChange])

  // Filter sprints - always include backlog sprint
  const visibleSprints = useMemo(() =>
    sprints.filter((s: Sprint) => 
      !s.isDeleted && 
      (s.isBacklog || showFinishedSprints || !s.isFinished)
    ),
    [sprints, showFinishedSprints]
  )

  // Group tasks by sprint - memoized to prevent infinite loops
  const getTasksForSprint = useCallback((sprintId: string) => {
    const sprint = sprintDetails.find((s: Sprint) => s.id === sprintId) || sprints.find((s: Sprint) => s.id === sprintId)
    if (!sprint) return []

    let sprintTasks: Task[] = []

    // For backlog sprint, return tasks with no sprintId
    if (sprint.isBacklog) {
      sprintTasks = tasks.filter((task: Task) => !task.sprintId)
    } else {
      // For regular sprints, return tasks from sprint relation
      if (!sprint.tasks) return []
      sprintTasks = sprint.tasks
    }

    return sprintTasks
  }, [sprintDetails, sprints, tasks])

  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId, type } = result
    console.log('Drag end', { type, source, destination })

    if (!destination) return

    // If dropped in same position, do nothing
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return
    }

    // We no longer support column reordering in Product Backlog view

    // Find the dragged task
    const draggedTask = tasks.find((t: Task) => t.id === draggableId)
    if (!draggedTask) return

    const sourceSprintId = source.droppableId
    const targetSprintId = destination.droppableId

    if (sourceSprintId === targetSprintId) {
      // Reordering within the same sprint - use React Query mutation
      updateTaskPositionMutation.mutate({
        taskId: draggableId,
        position: destination.index
      })
    } else {
      // Moving between sprints - use React Query mutation
      moveTaskMutation.mutate({
        taskId: draggableId,
        targetSprintId: targetSprintId,
        position: destination.index
      })
    }
  }, [tasks, moveTaskMutation, updateTaskPositionMutation, onDataChange])

  const handleSprintAction = async (action: string, sprintId: string) => {
    const sprint = sprints.find((s: Sprint) => s.id === sprintId)
    if (!sprint) return

    switch (action) {
      case 'start':
        // Show start sprint dialog
        setStartingSprintId(sprintId)
        setStartSprintData({
          dueDate: '',
          goal: sprint.goal || ''
        })
        setIsStartSprintOpen(true)
        break

      case 'finish':
        // Show optimistic success immediately
        toast.success(`Sprint "${sprint.name}" finished successfully!`)
        
        try {
          const response = await fetch(`/api/sprints/${sprintId}/finish`, {
            method: 'POST'
          })
          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to finish sprint')
          }
          const result = await response.json()
          
          // Refresh data to show updated state
          setTimeout(() => {
            mutateSprints()
            mutateTasks()
          }, 500)
        } catch (error: unknown) {
          toast.error((error as Error).message)
        }
        break

      case 'delete':
        if (confirm(`Are you sure you want to delete "${sprint.name}"?`)) {
          // Show optimistic success immediately
          toast.success(`Sprint "${sprint.name}" deleted successfully!`)
          
          try {
            const response = await fetch(`/api/sprints/${sprintId}`, {
              method: 'DELETE'
            })
            if (!response.ok) {
              const error = await response.json()
              throw new Error(error.error || 'Failed to delete sprint')
            }
            
            // Refresh data to remove the deleted sprint
            setTimeout(() => {
              mutateSprints()
            }, 500)
          } catch (error: unknown) {
            toast.error((error as Error).message)
            // Refresh to revert optimistic update
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

    // Close dialog immediately for better UX
    setIsCreateSprintOpen(false)
    
    // Show success toast immediately
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

      // Refresh data to show the new sprint
      mutateSprints()
      setNewSprintData({ name: '', goal: '' })
    } catch (error: unknown) {
      // Revert optimistic update on error
      toast.error((error as Error).message)
      setIsCreateSprintOpen(true) // Reopen dialog
    }
  }

  const handleEditSprint = async () => {
    if (!editSprintData.name.trim()) {
      toast.error('Sprint name is required')
      return
    }

    if (!editingSprintId) return

    // Close dialog immediately for better UX
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

      // Refresh data to show the updated sprint
      mutateSprints()
      setEditingSprintId(null)
      setEditSprintData({ name: '', goal: '' })
    } catch (error: unknown) {
      // Revert optimistic update on error
      toast.error((error as Error).message)
      setIsEditSprintOpen(true) // Reopen dialog
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

      // Show optimistic success immediately
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
        // Product Backlog context: ALWAYS assign task to the sprint (including backlog sprint)
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

      // Refresh data in background
      mutateTasks()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to create task')
    }
  }

  const handleStartSprint = async () => {
    if (!startingSprintId) return

    const sprint = sprints.find((s: Sprint) => s.id === startingSprintId)
    if (!sprint) return

    // Close dialog immediately and show success
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

      // Refresh data and redirect
      mutateSprints()
      setStartingSprintId(null)
      setStartSprintData({ dueDate: '', goal: '' })

      // Redirect to the active sprint view
      setTimeout(() => {
        router.push(`/sprints/${startingSprintId}/active`)
      }, 500)
    } catch (error: unknown) {
      // Revert optimistic update on error
      toast.error((error as Error).message)
      setIsStartSprintOpen(true) // Reopen dialog
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


  if (sprintsLoading || tasksLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (sprintsError || tasksError) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading board data</p>
          <p className="text-sm text-gray-500">{(sprintsError as Error)?.message || (tasksError as Error)?.message}</p>
        </div>
      </div>
    )
  }

  // Check for orphaned tasks (have sprintId but no sprintColumnId)
  const orphanedTasks = tasks.filter(task => task.sprintId && !task.sprintColumnId)
  const hasOrphanedTasks = orphanedTasks.length > 0

  return (
    <>
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

      {/* Sprint Columns */}
      <ScrollArea className='w-full'>
        <DragDropContext onDragEnd={handleDragEnd}>
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
                    isDragOver={false}
                    draggedTask={null}
                  />
                ))}
              </div>
        </DragDropContext>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Item Modal */}
      {selectedTask && (
        <ItemModal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          taskId={selectedTask.id}
          onUpdate={() => {
            mutateTasks() // This calls onDataChange() which invalidates all caches including sprintDetails
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
    </>
  )
}