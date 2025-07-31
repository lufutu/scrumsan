"use client"

import React, { useState, useCallback, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { ItemModal } from './ItemModal'
import { DraggableSprintColumn } from './DraggableSprintColumn'
import { SprintDialogs } from './SprintDialogs'
import { useSupabase } from '@/providers/supabase-provider'
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

import {
  DragDropContext,
  Droppable,
  DropResult,
} from '@hello-pangea/dnd'
import { useRouter } from 'next/navigation'
import { Sprint, Task, ProductBacklogProps as ProductBacklogProps } from '@/types/shared'

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
  const { } = useSupabase()
  const router = useRouter()
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
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>([])

  // Use provided data instead of fetching
  const sprints = useMemo(() => boardData?.sprints || [], [boardData?.sprints])
  const sprintDetails = useMemo(() => boardData?.sprintDetails || [], [boardData?.sprintDetails])
  const tasks = useMemo(() =>
    optimisticTasks.length > 0 ? optimisticTasks : (boardData?.tasks || []),
    [optimisticTasks, boardData?.tasks]
  )
  const labels = useMemo(() => boardData?.labels || [], [boardData?.labels])
  const users = useMemo(() => boardData?.users || [], [boardData?.users])
  const activeSprint = boardData?.activeSprint || null

  const sprintsLoading = !boardData
  const tasksLoading = !boardData
  const sprintsError: unknown = null
  const tasksError: unknown = null

  // Mutation functions - trigger parent data refresh
  const mutateSprints = useCallback(() => {
    if (onDataChange) onDataChange()
  }, [onDataChange])

  const mutateTasks = useCallback(() => {
    setOptimisticTasks([]) // Clear optimistic state
    if (onDataChange) onDataChange() // This invalidates all caches including sprintDetails
  }, [onDataChange])

  // Delayed mutation functions for better optimistic UX
  const delayedMutateSprints = useCallback(() => {
    setTimeout(() => mutateSprints(), 300)
  }, [mutateSprints])

  const delayedMutateTasks = useCallback(() => {
    setTimeout(() => mutateTasks(), 300)
  }, [mutateTasks])

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

    // Handle sprint column reordering
    if (type === 'COLUMN') {
      const sourceIndex = source.index
      const destinationIndex = destination.index

      // Optimistically reorder sprints array
      const reorderedSprints = Array.from(visibleSprints)
      const [removed] = reorderedSprints.splice(sourceIndex, 1)
      reorderedSprints.splice(destinationIndex, 0, removed)

      // Show optimistic update immediately
      const optimisticBoardData = {
        ...boardData,
        sprints: boardData?.sprints?.map((sprint: Sprint) => {
          const newIndex = reorderedSprints.findIndex(s => s.id === sprint.id)
          return newIndex !== -1 ? { ...sprint, position: newIndex } : sprint
        }) || []
      }

      // Trigger optimistic update
      if (onDataChange) {
        onDataChange()
      }

      try {
        // Call API to update sprint positions
        const response = await fetch(`/api/sprints/${draggableId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: destinationIndex })
        })

        if (!response.ok) {
          throw new Error('Failed to reorder sprint')
        }

        toast.success('Sprint reordered successfully')
        // Refresh data to get server state
        setTimeout(() => mutateSprints(), 100)
      } catch (error: unknown) {
        console.error('Error reordering sprint:', error)
        toast.error('Failed to reorder sprint')
        // Revert optimistic update
        mutateSprints()
      }
      return
    }

    // Find the dragged task
    const draggedTask = tasks.find((t: Task) => t.id === draggableId)
    if (!draggedTask) return

    const sourceSprintId = source.droppableId
    const targetSprintId = destination.droppableId

    if (sourceSprintId === targetSprintId) {
      // Reordering within the same sprint - show optimistic update immediately
      const optimisticUpdate = tasks.map((task: Task, index: number) => {
        if (task.id === draggableId) {
          return { ...task, position: destination.index }
        }
        // Adjust positions of other tasks in the same sprint
        if (task.sprintId === sourceSprintId || (sourceSprintId === 'backlog' && !task.sprintId)) {
          if (source.index < destination.index) {
            // Moving down - shift tasks up
            if (index > source.index && index <= destination.index) {
              return { ...task, position: (task.position || index) - 1 }
            }
          } else {
            // Moving up - shift tasks down
            if (index >= destination.index && index < source.index) {
              return { ...task, position: (task.position || index) + 1 }
            }
          }
        }
        return task
      })
      setOptimisticTasks(optimisticUpdate)

      try {
        const response = await fetch(`/api/tasks/${draggableId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            position: destination.index
          })
        })

        if (!response.ok) {
          throw new Error('Failed to update task position')
        }

        toast.success('Task reordered successfully')
        // Clear optimistic state and refresh
        setTimeout(() => {
          setOptimisticTasks([])
          mutateTasks()
        }, 500)
      } catch (error: unknown) {
        console.error('Error reordering task:', error)
        toast.error('Failed to reorder task')
        setOptimisticTasks([]) // Clear optimistic state to revert
      }
    } else {
      // Moving between sprints
      const targetSprint = sprints.find((s: Sprint) => s.id === targetSprintId)
      if (!targetSprint) return

      // Optimistic update - show task moved immediately with better positioning
      const optimisticUpdate = tasks.map((task: Task) => {
        if (task.id === draggableId) {
          return {
            ...task,
            sprintId: targetSprintId === 'backlog' ? null : targetSprintId,
            position: destination.index
          }
        }
        return task
      })
      setOptimisticTasks(optimisticUpdate)

      try {
        // Move task to new sprint
        const response = await fetch(`/api/sprints/${targetSprintId}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: draggableId })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to move task')
        }

        // Success - show toast and refresh data
        toast.success(`Task moved to ${targetSprint.name}`)
        setTimeout(() => {
          setOptimisticTasks([])
          mutateTasks()
          mutateSprints()
        }, 500)
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Failed to move task')
        setOptimisticTasks([]) // Clear optimistic state to revert
      }
    }
  }, [tasks, sprints, visibleSprints, mutateTasks, mutateSprints, boardData, onDataChange])

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

      // Create optimistic task
      const optimisticTask: Task = {
        id: `temp-${Date.now()}`, // Temporary ID
        title: data.title,
        description: '',
        boardId,
        taskType: data.taskType as 'story' | 'bug' | 'task' | 'epic' | 'improvement',
        storyPoints: data.storyPoints || 0,
        priority: data.priority as 'low' | 'medium' | 'high' | 'urgent',
        sprintId: sprintId === 'backlog' ? null : sprintId,
        position: tasks.filter(t => 
          sprintId === 'backlog' ? !t.sprintId : t.sprintId === sprintId
        ).length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        done: false,
        taskAssignees: data.assignees?.map(a => ({
          id: `temp-${a.id}`,
          taskId: `temp-${Date.now()}`,
          userId: a.id,
          user: users.find(u => u.id === a.id) || { id: a.id, fullName: 'Unknown', email: '' }
        })) || [],
        taskLabels: data.labels?.map(labelId => ({
          id: `temp-${labelId}`,
          taskId: `temp-${Date.now()}`,
          labelId,
          label: labels.find(l => l.id === labelId) || { id: labelId, name: 'Unknown', color: '#gray' }
        })) || []
      }

      // Show optimistic update immediately
      setOptimisticTasks([...tasks, optimisticTask])

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

      toast.success('Task created successfully')
      // Clear optimistic state and refresh with real data
      setTimeout(() => {
        setOptimisticTasks([])
        mutateTasks()
      }, 500)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to create task')
      // Remove optimistic task on error
      setOptimisticTasks([])
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

  return (
    <>


      {/* Sprint Columns */}
      <ScrollArea className='w-full'>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable
            droppableId="board"
            type="COLUMN"
            direction="horizontal"
            ignoreContainerClipping={true}
          >
            {(boardProvided) => (
              <div
                ref={boardProvided.innerRef}
                {...boardProvided.droppableProps}
                className="inline-flex min-w-full gap-4 min-h-full"
              >
                {visibleSprints.map((sprint: Sprint, index: number) => (
                  <DraggableSprintColumn
                    key={sprint.id}
                    index={index}
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
                {boardProvided.placeholder}
              </div>
            )}
          </Droppable>
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