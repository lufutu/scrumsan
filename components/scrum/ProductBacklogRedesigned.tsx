"use client"

import { useState, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, ChevronDown, MoreVertical, Trash2, Edit, Calendar, Play, Check, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { ItemModal } from './ItemModal'
import { ComprehensiveInlineForm } from './ComprehensiveInlineForm'
import { TaskCardModern } from './TaskCardModern'
import useSWR, { mutate } from 'swr'
import { useSupabase } from '@/providers/supabase-provider'
import { useLabels } from '@/hooks/useLabels'
import { useUsers } from '@/hooks/useUsers'
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/animate-ui/radix/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BoardData } from '@/hooks/useBoardData'
import { Sprint, Task, ProductBacklogProps as ProductBacklogRedesignedProps } from '@/types/shared'

const fetcher = (url: string) => fetch(url).then(res => res.json())

// Draggable Task Component
function DraggableTask({
  task,
  index,
  onTaskClick,
  labels,
  boardId,
  onTaskUpdate
}: {
  task: Task
  index: number
  onTaskClick?: (task: Task) => void
  labels: Array<{ id: string; name: string; color: string | null }>
  boardId: string
  onTaskUpdate?: () => void
}) {
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="cursor-grab active:cursor-grabbing"
          style={{
            ...provided.draggableProps.style,
            opacity: snapshot.isDragging ? 0.8 : 1,
          }}
        >
      <TaskCardModern
        id={task.id}
        itemCode={task.id}
        title={task.title}
        description={task.description || ''}
        taskType={task.taskType as any}
        storyPoints={task.storyPoints || 0}
        priority={task.priority as any}
        assignees={task.taskAssignees?.map((ta: any) => ({
          id: ta.user.id,
          name: ta.user.fullName || ta.user.email || 'Unknown User',
          avatar: ta.user.avatarUrl || undefined,
          initials: ta.user.fullName?.split(' ').map((n: string) => n[0]).join('') || 'U'
        })) || []}
        labels={task.taskLabels ? task.taskLabels.map(tl => ({
          id: tl.label.id,
          name: tl.label.name,
          color: tl.label.color || '#6B7280'
        })) : []}
        organizationId={task.board?.organizationId}
        boardId={boardId}
        onClick={!snapshot.isDragging ? () => onTaskClick?.(task) : undefined}
        onAssigneesChange={() => {
          onTaskUpdate?.() // Invalidate cache when labels or assignees are changed
        }}
        onUpdate={onTaskUpdate}
      />
        </div>
      )}
    </Draggable>
  )
}

// Droppable Sprint Column Component
function DroppableSprintColumn({
  sprint,
  tasks,
  onTaskClick,
  onSprintAction,
  onAddTask,
  labels,
  users,
  boardColor,
  isActiveSprint,
  boardId,
  onTaskUpdate,
  isDragOver,
  draggedTask
}: {
  sprint: Sprint
  tasks: Task[]
  onTaskClick?: (task: Task) => void
  onSprintAction: (action: string, sprintId: string) => void
  onAddTask?: (sprintId: string, data: {
    title: string;
    taskType: string;
    assignees?: Array<{ id: string }>;
    labels?: string[];
    storyPoints?: number;
    priority?: string;
  }) => Promise<void>
  labels: Array<{ id: string; name: string; color: string | null }>
  users: Array<{ id: string; fullName: string; email: string }>
  boardColor?: string | null
  isActiveSprint: boolean
  boardId: string
  onTaskUpdate?: () => void
  isDragOver?: boolean
  draggedTask?: Task | null
}) {
  const [showAddForm, setShowAddForm] = useState(false)

  const totalPoints = tasks.reduce((sum, task) => sum + (task.storyPoints || 0), 0)

  const getSprintStatus = () => {
    if (sprint.isBacklog) return { label: 'Backlog', color: 'bg-gray-500' }
    if (sprint.status === 'active') return { label: 'Active', color: 'bg-green-500' }
    if (sprint.status === 'completed') return { label: 'Completed', color: 'bg-blue-500' }
    return { label: 'Planning', color: 'bg-yellow-500' }
  }

  const status = getSprintStatus()

  return (
    <Droppable droppableId={sprint.id}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={cn(
            "bg-white rounded-lg shadow-sm border border-gray-200 w-80 flex-shrink-0",
            snapshot.isDraggingOver && "border-blue-500 border-2 bg-blue-50/30"
          )}
        >
          {/* Sprint Header */}
          <div
            className="p-4 border-b border-gray-200"
            style={boardColor ? { backgroundColor: `${boardColor}20` } : undefined}
          >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">{sprint.name}</h3>
            <Badge className={cn("text-xs", status.color)}>
              {status.label}
            </Badge>
          </div>
          {!sprint.isBacklog && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {sprint.status === 'planning' && (
                  <>
                    <DropdownMenuItem onClick={() => onSprintAction('start', sprint.id)}>
                      <Play className="h-4 w-4 mr-2" />
                      Start Sprint
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onSprintAction('edit', sprint.id)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Sprint
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {sprint.status === 'active' && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href={`/boards/${sprint.boardId}/sprint-backlog?sprintId=${sprint.id}`}>
                        <Calendar className="h-4 w-4 mr-2" />
                        View Sprint Backlog
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onSprintAction('finish', sprint.id)}>
                      <Check className="h-4 w-4 mr-2" />
                      Finish Sprint
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  onClick={() => onSprintAction('delete', sprint.id)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Sprint
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{tasks.length} items</span>
          <span>{totalPoints} points</span>
        </div>
        {sprint.goal && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{sprint.goal}</p>
        )}
      </div>

          {/* Add Task Button */}
          {!showAddForm && (
        <div className="px-4 py-3 border-b border-gray-200">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add item
          </Button>
        </div>
          )}

          {/* Inline Form */}
          {showAddForm && (
        <div className="px-4 py-3 border-b border-gray-200">
          <ComprehensiveInlineForm
            onAdd={async (data) => {
              if (onAddTask) {
                await onAddTask(sprint.id, data)
                setShowAddForm(false)
              }
            }}
            onCancel={() => setShowAddForm(false)}
            placeholder="What needs to be done?"
            users={users}
            labels={labels}
          />
        </div>
          )}

          {/* Sprint Tasks */}
          <div
            className="p-4 space-y-3 max-h-[600px] overflow-y-auto"
          >
        <div>
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">No items in this sprint</p>
              <p className="text-xs mt-1">Drag items here to add them</p>
            </div>
          ) : (
            <div>
              {tasks.map((task, index) => (
                <DraggableTask
                  key={task.id || index}
                  task={task}
                  index={index}
                  onTaskClick={onTaskClick}
                  labels={labels}
                  boardId={boardId}
                  onTaskUpdate={onTaskUpdate}
                />
              ))}
            </div>
            )}
            {provided.placeholder}
          </div>
        </div>
      )}
    </Droppable>
  )
}

export default function ProductBacklogRedesigned({
  boardId,
  boardColor,
  boardData,
  onDataChange
}: ProductBacklogRedesignedProps) {
  const { user } = useSupabase()
  const router = useRouter()
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showFinishedSprints, setShowFinishedSprints] = useState(false)
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
  const sprintsError: any = null
  const tasksError: any = null

  // Mutation functions - trigger parent data refresh
  const mutateSprints = useCallback(() => {
    if (onDataChange) onDataChange()
  }, [onDataChange])

  const mutateTasks = useCallback(() => {
    setOptimisticTasks([]) // Clear optimistic state
    if (onDataChange) onDataChange() // This invalidates all caches including sprintDetails
  }, [onDataChange])

  // Filter sprints
  const visibleSprints = useMemo(() =>
    sprints.filter((s: Sprint) => !s.isDeleted && (showFinishedSprints || !s.isFinished)),
    [sprints, showFinishedSprints]
  )

  // Group tasks by sprint - memoized to prevent infinite loops
  const getTasksForSprint = useCallback((sprintId: string) => {
    const sprint = sprintDetails.find((s: Sprint) => s.id === sprintId) || sprints.find((s: Sprint) => s.id === sprintId)
    if (!sprint) return []

    // For all sprints (including backlog), return tasks directly from tasks relation
    if (!sprint.tasks) return []
    return sprint.tasks
  }, [sprintDetails, sprints])



  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId } = result
    console.log('Drag end')

    if (!destination) return

    // If dropped in same position, do nothing
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return
    }

    // Find the dragged task
    const draggedTask = tasks.find((t: Task) => t.id === draggableId)
    if (!draggedTask) return

    const sourceSprintId = source.droppableId
    const targetSprintId = destination.droppableId

    if (sourceSprintId === targetSprintId) {
      // Reordering within the same sprint
      // @hello-pangea/dnd handles visual reordering, we just need to persist position
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

        mutateTasks()
        toast.success('Task reordered successfully')
      } catch (error: unknown) {
        console.error('Error reordering task:', error)
        toast.error('Failed to reorder task')
        mutateTasks() // Revert on error
      }
    } else {
      // Moving between sprints
      const targetSprint = sprints.find((s: Sprint) => s.id === targetSprintId)
      if (!targetSprint) return

      // Optimistic update - show task moved immediately
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

        // Success - show toast and revalidate
        toast.success(`Task moved to ${targetSprint.name}`)
        mutateTasks()
        mutateSprints()
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Failed to move task')
        setOptimisticTasks([]) // Clear optimistic state to revert
      }
    }
  }, [tasks, sprints, mutateTasks, mutateSprints])

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
        try {
          const response = await fetch(`/api/sprints/${sprintId}/finish`, {
            method: 'POST'
          })
          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to finish sprint')
          }
          const result = await response.json()
          mutateSprints()
          mutateTasks()
          toast.success(result.message)
        } catch (error: unknown) {
          toast.error(error.message)
        }
        break

      case 'delete':
        if (confirm(`Are you sure you want to delete "${sprint.name}"?`)) {
          try {
            const response = await fetch(`/api/sprints/${sprintId}`, {
              method: 'DELETE'
            })
            if (!response.ok) {
              const error = await response.json()
              throw new Error(error.error || 'Failed to delete sprint')
            }
            mutateSprints()
            toast.success(`Sprint "${sprint.name}" deleted successfully!`)
          } catch (error: unknown) {
            toast.error(error.message)
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
      toast.success(`Sprint "${newSprintData.name}" created successfully!`)
      setIsCreateSprintOpen(false)
      setNewSprintData({ name: '', goal: '' })
    } catch (error: unknown) {
      toast.error(error.message)
    }
  }

  const handleEditSprint = async () => {
    if (!editSprintData.name.trim()) {
      toast.error('Sprint name is required')
      return
    }

    if (!editingSprintId) return

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
      toast.success(`Sprint "${editSprintData.name}" updated successfully!`)
      setIsEditSprintOpen(false)
      setEditingSprintId(null)
      setEditSprintData({ name: '', goal: '' })
    } catch (error: unknown) {
      toast.error(error.message)
    }
  }

  const handleReorderSprint = async (sprintId: string, newPosition: number) => {
    try {
      const response = await fetch(`/api/sprints/${sprintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position: newPosition })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to reorder sprint')
      }

      mutateSprints()
      toast.success('Sprint reordered successfully')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to reorder sprint')
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

      mutateTasks()
      toast.success('Task created successfully')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to create task')
    }
  }

  const handleStartSprint = async () => {
    if (!startingSprintId) return

    const sprint = sprints.find((s: Sprint) => s.id === startingSprintId)
    if (!sprint) return

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
      toast.success(`Sprint "${sprint.name}" started successfully!`)
      setIsStartSprintOpen(false)
      setStartingSprintId(null)
      setStartSprintData({ dueDate: '', goal: '' })

      // Redirect to the active sprint view
      router.push(`/sprints/${startingSprintId}/active`)
    } catch (error: unknown) {
      toast.error(error.message)
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
          <p className="text-sm text-gray-500">{sprintsError?.message || tasksError?.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">Product Backlog</h2>
            {activeSprint && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/boards/${boardId}/sprint-backlog?sprintId=${activeSprint.id}`}>
                  <Calendar className="h-4 w-4 mr-2" />
                  View Active Sprint
                </Link>
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFinishedSprints(!showFinishedSprints)}
            >
              {showFinishedSprints ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showFinishedSprints ? 'Hide' : 'Show'} Finished Sprints
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsCreateSprintOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Sprint
            </Button>
          </div>
        </div>
      </div>

      {/* Sprint Columns */}
      <div className="flex-1 overflow-x-auto">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 p-6 min-h-full">
              {visibleSprints.map((sprint: Sprint) => (
                <DroppableSprintColumn
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
      </div>

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

      {/* Create Sprint Dialog */}
      <Dialog open={isCreateSprintOpen} onOpenChange={setIsCreateSprintOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Sprint</DialogTitle>
            <DialogDescription>
              Add a new sprint to your board. It will be created with default columns.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Sprint Name</Label>
              <Input
                id="name"
                value={newSprintData.name}
                onChange={(e) => setNewSprintData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Sprint 2"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="goal">Sprint Goal (optional)</Label>
              <Textarea
                id="goal"
                value={newSprintData.goal}
                onChange={(e) => setNewSprintData(prev => ({ ...prev, goal: e.target.value }))}
                placeholder="Complete user authentication and profile features"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateSprintOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSprint}>
              Create Sprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Sprint Dialog */}
      <Dialog open={isEditSprintOpen} onOpenChange={setIsEditSprintOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Sprint</DialogTitle>
            <DialogDescription>
              Update the sprint name and goal.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Sprint Name</Label>
              <Input
                id="edit-name"
                value={editSprintData.name}
                onChange={(e) => setEditSprintData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Sprint 2"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-goal">Sprint Goal (optional)</Label>
              <Textarea
                id="edit-goal"
                value={editSprintData.goal}
                onChange={(e) => setEditSprintData(prev => ({ ...prev, goal: e.target.value }))}
                placeholder="Complete user authentication and profile features"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditSprintOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSprint}>
              Update Sprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start Sprint Dialog */}
      <Dialog open={isStartSprintOpen} onOpenChange={setIsStartSprintOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Sprint</DialogTitle>
            <DialogDescription>
              Set the sprint goal and due date before starting the sprint.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="due-date">Due Date (optional)</Label>
              <Input
                id="due-date"
                type="date"
                value={startSprintData.dueDate}
                onChange={(e) => setStartSprintData(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sprint-goal">Sprint Goal (optional)</Label>
              <Textarea
                id="sprint-goal"
                value={startSprintData.goal}
                onChange={(e) => setStartSprintData(prev => ({ ...prev, goal: e.target.value }))}
                placeholder="Complete user authentication and profile features"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStartSprintOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartSprint}>
              Start Sprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}