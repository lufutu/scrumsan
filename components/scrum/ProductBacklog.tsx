"use client"

import React, { useState, useCallback, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { ItemModal } from './ItemModal'
import { StaticSprintColumn } from './StaticSprintColumn'
import { SprintDialogs } from './SprintDialogs'
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { OptimisticDragDropProvider, useOptimisticDragDrop } from '@/components/drag-drop/OptimisticDragDropProvider'
import { AutoScroll } from '@/components/drag-drop/AutoScroll'
import { useOptimisticUpdates } from '@/lib/optimistic-updates'

import { useRouter } from 'next/navigation'
import { Sprint, Task, ProductBacklogProps } from '@/types/shared'

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

  // API sync function for optimistic drag-drop
  const handleTaskMoveAPI = useCallback(async (params: {
    taskId: string
    targetSprintId: string | null
    targetColumnId: string | null
    originalTask: Task
  }) => {
    const { taskId, targetSprintId, originalTask } = params
    
    console.log('🚀 API Sync called with:', { taskId, targetSprintId, originalTask: originalTask.title })
    
    try {
      if (targetSprintId === null) {
        // Moving to backlog
        console.log('📤 Moving to backlog from sprint:', originalTask.sprintId)
        if (originalTask.sprintId) {
          const response = await fetch(`/api/sprints/${originalTask.sprintId}/tasks/move-to-backlog`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              taskId,
              position: 0
            })
          })
          
          console.log('📤 Backlog move response status:', response.status)
          if (!response.ok) {
            const errorData = await response.text()
            console.error('📤 Backlog move failed:', errorData)
            throw new Error(`Failed to move task to backlog: ${response.status} ${errorData}`)
          }
          console.log('✅ Successfully moved task to backlog')
        }
      } else {
        // Moving to sprint
        console.log('📥 Moving to sprint:', targetSprintId)
        const response = await fetch(`/api/sprints/${targetSprintId}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId
          })
        })
        
        console.log('📥 Sprint move response status:', response.status)
        if (!response.ok) {
          const errorData = await response.text()
          console.error('📥 Sprint move failed:', errorData)
          throw new Error(`Failed to move task to sprint: ${response.status} ${errorData}`)
        }
        console.log('✅ Successfully moved task to sprint')
      }
      
      // Refresh data after successful API call
      if (onDataChange) {
        console.log('🔄 Refreshing board data...')
        onDataChange()
      }
      console.log('🎉 API sync completed successfully')
    } catch (error) {
      console.error('❌ Failed to sync task move:', error)
      throw error
    }
  }, [onDataChange])

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
        console.log('🏁 Starting optimistic sprint finish...')
        
        // Show optimistic success immediately
        toast.success(`Sprint "${sprint.name}" finished successfully!`)
        
        // Optimistically update data
        mutateSprints()
        mutateTasks()

        try {
          console.log('📡 Making sprint finish API call...')
          const response = await fetch(`/api/sprints/${sprintId}/finish`, {
            method: 'POST'
          })
          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to finish sprint')
          }
          
          console.log('✅ Sprint finish confirmed by API')
          
          // Refresh data again for consistency
          mutateSprints()
          mutateTasks()
        } catch (error: unknown) {
          console.error('❌ Sprint finish failed:', error)
          toast.error((error as Error).message)
          
          // Refresh to restore actual state
          mutateSprints()
          mutateTasks()
        }
        break

      case 'delete':
        if (confirm(`Are you sure you want to delete "${sprint.name}"?`)) {
          console.log('🗑️ Starting optimistic sprint deletion...')
          
          // Show optimistic success immediately
          toast.success(`Sprint "${sprint.name}" deleted successfully!`)
          
          // Optimistically update data
          mutateSprints()

          try {
            console.log('📡 Making sprint deletion API call...')
            const response = await fetch(`/api/sprints/${sprintId}`, {
              method: 'DELETE'
            })
            if (!response.ok) {
              const error = await response.json()
              throw new Error(error.error || 'Failed to delete sprint')
            }
            
            console.log('✅ Sprint deletion confirmed by API')
            
            // Refresh data again for consistency
            mutateSprints()
          } catch (error: unknown) {
            console.error('❌ Sprint deletion failed:', error)
            toast.error((error as Error).message)
            
            // Refresh to restore actual state
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

    console.log('🏃 Starting optimistic sprint creation...')

    // Close dialog immediately for better UX
    setIsCreateSprintOpen(false)
    const originalSprintData = { ...newSprintData }
    setNewSprintData({ name: '', goal: '' })

    // Show optimistic success message
    toast.success(`Sprint "${originalSprintData.name}" created successfully!`)

    try {
      console.log('📡 Making sprint creation API call...')
      const response = await fetch('/api/sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...originalSprintData,
          boardId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create sprint')
      }

      console.log('✅ Sprint creation confirmed by API')
      
      // Refresh data in background
      mutateSprints()
    } catch (error: unknown) {
      console.error('❌ Sprint creation failed:', error)
      
      // Rollback optimistic changes
      toast.error((error as Error).message)
      
      // Restore dialog and data
      setIsCreateSprintOpen(true)
      setNewSprintData(originalSprintData)
    }
  }

  const handleEditSprint = async () => {
    if (!editSprintData.name.trim()) {
      toast.error('Sprint name is required')
      return
    }

    if (!editingSprintId) return

    console.log('✏️ Starting optimistic sprint update...')

    // Close dialog immediately for better UX
    setIsEditSprintOpen(false)
    const originalSprintData = { ...editSprintData }
    const originalEditingSprintId = editingSprintId

    // Show optimistic success message  
    toast.success(`Sprint "${editSprintData.name}" updated successfully!`)

    // Clear editing state optimistically
    setEditingSprintId(null)
    setEditSprintData({ name: '', goal: '' })

    try {
      console.log('📡 Making sprint update API call...')
      const response = await fetch(`/api/sprints/${originalEditingSprintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(originalSprintData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update sprint')
      }

      console.log('✅ Sprint update confirmed by API')
      
      // Refresh data in background
      mutateSprints()
    } catch (error: unknown) {
      console.error('❌ Sprint update failed:', error)
      
      // Rollback optimistic changes
      toast.error((error as Error).message)
      
      // Restore dialog and data
      setIsEditSprintOpen(true)
      setEditingSprintId(originalEditingSprintId)
      setEditSprintData(originalSprintData)
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

      console.log('🚀 Creating task optimistically via ProductBacklog...')
      
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

      console.log('✅ Task created via API')
      mutateTasks()
      toast.success('Task created successfully')
    } catch (error: unknown) {
      console.error('❌ Task creation failed:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create task')
    }
  }

  const handleStartSprint = async () => {
    if (!startingSprintId) return

    const sprint = sprints.find((s: Sprint) => s.id === startingSprintId)
    if (!sprint) return

    console.log('🚀 Starting optimistic sprint start...')

    // Close dialog immediately for better UX
    setIsStartSprintOpen(false)
    const originalStartingSprintId = startingSprintId
    const originalStartSprintData = { ...startSprintData }

    // Show optimistic success message
    toast.success(`Sprint "${sprint.name}" started successfully!`)

    // Navigate immediately for better UX
    router.push(`/sprints/${startingSprintId}/active`)

    // Clear state optimistically
    setStartingSprintId(null)
    setStartSprintData({ dueDate: '', goal: '' })

    try {
      console.log('📡 Making sprint start API call...')
      const response = await fetch(`/api/sprints/${originalStartingSprintId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endDate: originalStartSprintData.dueDate || null,
          goal: originalStartSprintData.goal || null
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start sprint')
      }

      console.log('✅ Sprint start confirmed by API')
      
      // Refresh data in background
      mutateSprints()
    } catch (error: unknown) {
      console.error('❌ Sprint start failed:', error)
      
      // Show error message (user is already on sprint page)
      toast.error((error as Error).message)
      
      // Note: We can't easily rollback navigation, but the user will see the error
      // and the sprint page will handle the invalid state gracefully
    }
  }


  if (!boardData) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <OptimisticDragDropProvider 
      initialTasks={tasks}
      initialSprints={sprints}
      onTaskMove={handleTaskMoveAPI}
    >
      <ProductBacklogInner 
        boardId={boardId}
        boardColor={boardColor}
        boardData={boardData}
        onDataChange={onDataChange}
        sprints={sprints}
        sprintDetails={sprintDetails}
        labels={labels}
        users={users}
        activeSprint={activeSprint}
        visibleSprints={visibleSprints}
        handleSprintAction={handleSprintAction}
        handleAddTask={handleAddTask}
        selectedTask={selectedTask}
        setSelectedTask={setSelectedTask}
        mutateTasks={mutateTasks}
        isCreateSprintOpen={isCreateSprintOpen}
        setIsCreateSprintOpen={setIsCreateSprintOpen}
        newSprintData={newSprintData}
        setNewSprintData={setNewSprintData}
        handleCreateSprint={handleCreateSprint}
        isEditSprintOpen={isEditSprintOpen}
        setIsEditSprintOpen={setIsEditSprintOpen}
        editSprintData={editSprintData}
        setEditSprintData={setEditSprintData}
        handleEditSprint={handleEditSprint}
        isStartSprintOpen={isStartSprintOpen}
        setIsStartSprintOpen={setIsStartSprintOpen}
        startSprintData={startSprintData}
        setStartSprintData={setStartSprintData}
        handleStartSprint={handleStartSprint}
      />
    </OptimisticDragDropProvider>
  )
}

// Component that has access to optimistic DragDrop context
function ProductBacklogInner({
  boardId,
  boardColor, 
  boardData,
  onDataChange,
  sprints,
  sprintDetails,
  labels,
  users,
  activeSprint,
  visibleSprints,
  handleSprintAction,
  handleAddTask,
  selectedTask,
  setSelectedTask,
  mutateTasks,
  isCreateSprintOpen,
  setIsCreateSprintOpen,
  newSprintData,
  setNewSprintData,
  handleCreateSprint,
  isEditSprintOpen,
  setIsEditSprintOpen,
  editSprintData,
  setEditSprintData,
  handleEditSprint,
  isStartSprintOpen,
  setIsStartSprintOpen,
  startSprintData,
  setStartSprintData,
  handleStartSprint
}: any) {
  // Get optimistic tasks from drag-drop context
  const { tasks: optimisticTasks, setTasks } = useOptimisticDragDrop()
  
  // Set up optimistic updates for task operations
  const { optimisticCreate } = useOptimisticUpdates(optimisticTasks, setTasks)
  
  // Use optimistic tasks for display
  const tasks = optimisticTasks

  // Create optimistic version of handleAddTask
  const handleAddTaskOptimistic = useCallback(async (sprintId: string, data: {
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

      console.log('🚀 Starting optimistic task creation...')
      
      // Generate temporary task for optimistic update
      const tempTaskId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const tempTask: Task = {
        id: tempTaskId,
        title: data.title,
        description: '',
        itemCode: `TEMP-${Date.now().toString().slice(-4)}`, // Temporary item code
        boardId,
        taskType: data.taskType as 'story' | 'bug' | 'task' | 'epic' | 'improvement',
        storyPoints: data.storyPoints || 0,
        priority: data.priority || 'medium',
        sprintId,
        columnId: null,
        sprintColumnId: null,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        taskAssignees: data.assignees?.map(assignee => ({
          id: `temp_assign_${assignee.id}`,
          userId: assignee.id,
          taskId: tempTaskId,
          user: users.find(u => u.id === assignee.id) || {
            id: assignee.id,
            fullName: 'Unknown User',
            email: 'unknown@example.com'
          }
        })) || [],
        taskLabels: data.labels?.map((labelId, index) => {
          const label = labels.find(l => l.id === labelId)
          return {
            id: `temp_label_${index}`,
            taskId: tempTaskId,
            labelId,
            label: label || {
              id: labelId,
              name: 'Unknown Label',
              color: '#6B7280'
            }
          }
        }) || [],
        labels: data.labels || []
      }

      // Execute optimistic creation with the existing system
      await optimisticCreate(
        tempTask,
        async () => {
          console.log('📡 Creating task via API...')
          
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

          const realTask = await response.json()
          console.log('✅ Task created successfully via API:', realTask.id)
          
          // Refresh data to sync the real task data
          if (onDataChange) {
            console.log('🔄 Refreshing board data...')
            setTimeout(onDataChange, 100) // Small delay to ensure API consistency
          }
          
          return realTask
        },
        {
          successMessage: 'Task created successfully',
          errorMessage: 'Failed to create task'
        }
      )
      
    } catch (error: unknown) {
      console.error('❌ Optimistic task creation failed:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create task')
    }
  }, [sprints, boardId, users, labels, optimisticCreate, onDataChange])

  // Update getTasksForSprint to use optimistic tasks
  const getOptimisticTasksForSprint = useCallback((sprintId: string) => {
    const sprint = sprintDetails.find((s: Sprint) => s.id === sprintId) || sprints.find((s: Sprint) => s.id === sprintId)
    if (!sprint) return []

    let sprintTasks: Task[] = []

    // For backlog sprint, return tasks that either:
    // 1. Have no sprintId (traditional backlog tasks) OR  
    // 2. Have sprintId pointing to this backlog sprint (assigned to backlog sprint)
    if (sprint.isBacklog) {
      sprintTasks = tasks.filter((task: Task) => 
        (
          (!task.sprintId && !task.columnId && !task.sprintColumnId) || // Traditional backlog tasks
          (task.sprintId === sprint.id) // Tasks assigned to backlog sprint
        ) &&
        !task.labels?.includes('__followup__')
      )
    } else {
      // For regular sprints, filter optimistic tasks that belong to this sprint
      sprintTasks = tasks.filter((task: Task) => task.sprintId === sprint.id)
    }

    return sprintTasks
  }, [sprintDetails, sprints, tasks])

  // Skip orphaned task warning - this is normal during optimistic updates
  const hasOrphanedTasks = false

  if (!boardData) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <>

      {/* Sprint Columns */}
      <AutoScroll className='w-full h-full overflow-auto' scrollSpeed="standard">
        <ScrollArea className='w-full'>
          <div className="inline-flex min-w-full gap-4 min-h-full">
          {visibleSprints.map((sprint: Sprint) => (
            <StaticSprintColumn
              key={sprint.id}
              sprint={sprint}
              tasks={getOptimisticTasksForSprint(sprint.id)}
              onTaskClick={setSelectedTask}
              onSprintAction={handleSprintAction}
              onAddTask={handleAddTaskOptimistic}
              labels={labels || []}
              users={users || []}
              boardColor={boardColor}
              isActiveSprint={sprint.id === activeSprint?.id}
              boardId={boardId}
              onTaskUpdate={mutateTasks}
              onTaskDrop={() => {
                // This will be handled by the OptimisticDragDropProvider
                // No need to do anything here as drag-drop is handled globally
              }}
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
    </>
  )
}