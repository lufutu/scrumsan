"use client"

import { useState, useEffect } from 'react'
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
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDroppable } from '@dnd-kit/core'
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
} from '@/components/ui/dialog'
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

interface Sprint {
  id: string
  name: string
  goal?: string | null
  status?: string | null
  startDate?: string | null
  endDate?: string | null
  position: number
  isBacklog: boolean
  isDeleted: boolean
  isFinished: boolean
  maxColumns?: number | null
  boardId: string
  tasks?: Task[]
  _count?: {
    tasks: number
  }
}

interface Task {
  id: string
  title: string
  description?: string | null
  taskType?: string | null
  priority?: string | null
  storyPoints?: number | null
  assignee?: {
    id: string
    fullName: string | null
    email: string
    avatarUrl?: string | null
  } | null
  boardId: string
  columnId?: string | null
  sprintColumnId?: string | null
  sprintId?: string | null
  position?: number | null
  labels?: string[]
}

import { BoardData } from '@/hooks/useBoardData'

interface ProductBacklogRedesignedProps {
  boardId: string
  organizationId?: string
  projectId?: string
  initialTaskId?: string | null
  boardColor?: string | null
  boardData?: BoardData | null
  onDataChange?: () => void
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

// Draggable Task Component
function DraggableTask({ 
  task, 
  onTaskClick,
  labels
}: { 
  task: Task
  onTaskClick?: (task: Task) => void
  labels: Array<{ id: string; name: string; color: string | null }>
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    zIndex: isDragging ? 50 : 'auto',
  }

  return (
    <motion.div
      layout
      layoutId={task.id}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ 
        opacity: isDragging ? 0.5 : 1, 
        scale: isDragging ? 0.95 : 1,
      }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{
        layout: { type: "spring", damping: 25, stiffness: 300 },
        opacity: { duration: 0.2 },
        scale: { duration: 0.2 }
      }}
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className="cursor-grab active:cursor-grabbing"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <TaskCardModern
        id={task.id}
        itemCode={task.id}
        title={task.title}
        description={task.description}
        taskType={task.taskType as any}
        storyPoints={task.storyPoints}
        priority={task.priority as any}
        assignee={task.assignee ? {
          name: task.assignee.fullName || task.assignee.email,
          initials: (task.assignee.fullName || task.assignee.email).split(' ').map(n => n[0]).join('').toUpperCase(),
          avatar: task.assignee.avatarUrl
        } : undefined}
        labels={task.labels ? labels.filter(l => task.labels?.includes(l.id)).map(l => ({
          name: l.name,
          color: l.color || '#6B7280'
        })) : []}
        onClick={!isDragging ? () => onTaskClick?.(task) : undefined}
      />
    </motion.div>
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
  isActiveSprint
}: { 
  sprint: Sprint
  tasks: Task[]
  onTaskClick?: (task: Task) => void
  onSprintAction: (action: string, sprintId: string) => void
  onAddTask?: (sprintId: string, data: any) => Promise<void>
  labels: Array<{ id: string; name: string; color: string | null }>
  users: Array<{ id: string; fullName: string; email: string }>
  boardColor?: string | null
  isActiveSprint: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: sprint.id })
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
    <motion.div 
      ref={setNodeRef}
      className={cn(
        "bg-white rounded-lg shadow-sm border border-gray-200 w-80 flex-shrink-0",
        isOver && "border-blue-300 border-2"
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        scale: isOver ? 1.02 : 1,
        boxShadow: isOver ? "0 10px 25px -5px rgba(0, 0, 0, 0.1)" : "0 1px 3px 0 rgba(0, 0, 0, 0.1)"
      }}
      transition={{ 
        type: "spring", 
        damping: 20, 
        stiffness: 300,
        scale: { duration: 0.2 }
      }}
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

      {/* Sprint Tasks */}
      <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence mode="popLayout">
            {tasks.length === 0 ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-8 text-gray-400"
              >
                <p className="text-sm">No items in this sprint</p>
                <p className="text-xs mt-1">Drag items here to add them</p>
              </motion.div>
            ) : (
              tasks.map(task => (
                <DraggableTask 
                  key={task.id} 
                  task={task} 
                  onTaskClick={onTaskClick}
                  labels={labels}
                />
              ))
            )}
          </AnimatePresence>
        </SortableContext>
        
        {/* Inline Form */}
        {showAddForm && (
          <div className="mt-3">
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
      </div>

      {/* Add Task Button */}
      {!showAddForm && (
        <div className="p-4 border-t border-gray-200">
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
    </motion.div>
  )
}

export default function ProductBacklogRedesigned({ 
  boardId, 
  organizationId, 
  projectId,
  initialTaskId,
  boardColor,
  boardData,
  onDataChange
}: ProductBacklogRedesignedProps) {
  const { user } = useSupabase()
  const router = useRouter()
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
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
  const sprints = boardData?.sprints || []
  const sprintDetails = boardData?.sprintDetails || []
  const tasks = optimisticTasks.length > 0 ? optimisticTasks : (boardData?.tasks || [])
  const labels = boardData?.labels || []
  const users = boardData?.users || []
  const activeSprint = boardData?.activeSprint || null
  
  const sprintsLoading = !boardData
  const tasksLoading = !boardData
  const sprintsError = null
  const tasksError = null

  // Mutation functions - trigger parent data refresh
  const mutateSprints = onDataChange || (() => {})
  const mutateTasks = () => {
    setOptimisticTasks([]) // Clear optimistic state
    if (onDataChange) onDataChange()
  }

  // Filter sprints
  const visibleSprints = sprints.filter(s => !s.isDeleted && (showFinishedSprints || !s.isFinished))

  // Group tasks by sprint
  const getTasksForSprint = (sprintId: string) => {
    const sprint = sprintDetails.find(s => s.id === sprintId) || sprints.find(s => s.id === sprintId)
    if (!sprint) return []
    
    // For all sprints (including backlog), return tasks directly from tasks relation
    if (!sprint.tasks) return []
    return sprint.tasks
  }

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id)
    if (task) {
      setActiveTask(task)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over || active.id === over.id) return

    const activeId = active.id as string
    const overId = over.id as string

    // Find the dragged task
    const activeTask = tasks.find(t => t.id === activeId)
    if (!activeTask) return

    // Check if we're dropping on a task or a sprint
    const overTask = tasks.find(t => t.id === overId)
    const overSprint = sprints.find(s => s.id === overId)

    if (overTask && activeTask.sprintId === overTask.sprintId) {
      // Reordering within the same sprint
      const sprintTasks = tasks
        .filter(t => t.sprintId === activeTask.sprintId)
        .sort((a, b) => (a.position || 0) - (b.position || 0))

      const oldIndex = sprintTasks.findIndex(t => t.id === activeId)
      const newIndex = sprintTasks.findIndex(t => t.id === overId)

      if (oldIndex !== newIndex) {
        // Calculate new positions for all affected tasks
        const reorderedTasks = [...sprintTasks]
        const [movedTask] = reorderedTasks.splice(oldIndex, 1)
        reorderedTasks.splice(newIndex, 0, movedTask)

        // Optimistic update - immediately show the new order
        const updatedTasks = tasks.map(task => {
          const reorderedIndex = reorderedTasks.findIndex(t => t.id === task.id)
          if (reorderedIndex !== -1) {
            return { ...task, position: reorderedIndex }
          }
          return task
        })
        setOptimisticTasks(updatedTasks)

        try {
          // Update the main task that was moved
          const response = await fetch(`/api/tasks/${activeId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ position: newIndex })
          })

          if (!response.ok) {
            throw new Error('Failed to update task position')
          }

          // Success - revalidate to get server state
          mutateTasks()
        } catch (error) {
          toast.error('Failed to reorder tasks')
          setOptimisticTasks([]) // Clear optimistic state to revert
        }
      }
      return
    }

    // Moving to a different sprint
    const targetSprintId = overSprint?.id || overTask?.sprintId
    if (!targetSprintId || activeTask.sprintId === targetSprintId) {
      return // No need to move if already in the same sprint
    }

    const targetSprint = sprints.find(s => s.id === targetSprintId)
    if (!targetSprint) return

    // Optimistic update - immediately move task to target sprint
    const updatedTasks = tasks.map(t => {
      if (t.id === activeId) {
        return { ...t, sprintId: targetSprintId }
      }
      return t
    })
    setOptimisticTasks(updatedTasks)

    try {
      // Add task to sprint
      const response = await fetch(`/api/sprints/${targetSprintId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: activeId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to move task')
      }

      // Success - show toast and revalidate
      toast.success(`Task moved to ${targetSprint.name}`)
      mutateTasks()
      mutateSprints()
    } catch (error: any) {
      toast.error(error.message || 'Failed to move task')
      setOptimisticTasks([]) // Clear optimistic state to revert
    }
  }

  const handleSprintAction = async (action: string, sprintId: string) => {
    const sprint = sprints.find(s => s.id === sprintId)
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
        } catch (error: any) {
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
          } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
      toast.error(error.message || 'Failed to reorder sprint')
    }
  }

  const handleAddTask = async (sprintId: string, data: {
    title: string;
    taskType: string;
    assigneeId?: string;
    labels?: string[];
    storyPoints?: number;
    priority?: string;
  }) => {
    try {
      const sprint = sprints.find(s => s.id === sprintId)
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
        assigneeId: data.assigneeId,
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
    } catch (error: any) {
      toast.error(error.message || 'Failed to create task')
    }
  }

  const handleStartSprint = async () => {
    if (!startingSprintId) return

    const sprint = sprints.find(s => s.id === startingSprintId)
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
      router.push(`/boards/${boardId}/sprint-backlog?sprintId=${startingSprintId}`)
    } catch (error: any) {
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 p-6 min-h-full">
            <SortableContext 
              items={visibleSprints.map(s => s.id)} 
              strategy={horizontalListSortingStrategy}
            >
              {visibleSprints.map(sprint => (
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
                />
              ))}
            </SortableContext>
          </div>

          <DragOverlay 
            dropAnimation={{
              duration: 300,
              easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
            }}
          >
            {activeTask && (
              <div 
                className="rotate-3 scale-105 shadow-2xl"
                style={{
                  filter: 'drop-shadow(0 20px 25px rgb(0 0 0 / 0.15)) drop-shadow(0 10px 10px rgb(0 0 0 / 0.04))',
                }}
              >
                <TaskCardModern
                  id={activeTask.id}
                  title={activeTask.title}
                  description={activeTask.description}
                  taskType={activeTask.taskType as any}
                  storyPoints={activeTask.storyPoints}
                  priority={activeTask.priority as any}
                  assignee={activeTask.assignee ? {
                    name: activeTask.assignee.fullName || activeTask.assignee.email,
                    initials: (activeTask.assignee.fullName || activeTask.assignee.email).split(' ').map(n => n[0]).join('').toUpperCase(),
                    avatar: activeTask.assignee.avatarUrl
                  } : undefined}
                  labels={activeTask.labels ? labels.filter(l => activeTask.labels?.includes(l.id)).map(l => ({
                    name: l.name,
                    color: l.color || '#6B7280'
                  })) : []}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Item Modal */}
      {selectedTask && (
        <ItemModal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          taskId={selectedTask.id}
          onUpdate={() => {
            mutateTasks()
            setSelectedTask(null)
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