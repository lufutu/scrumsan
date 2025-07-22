"use client"

import { useState, useMemo, useEffect } from 'react'
import { Column } from './Column'
import { TaskCardModern } from './TaskCardModern'
import { TaskTypeSelector } from './TaskTypeSelector'
import { ItemModal } from './ItemModal'
import BacklogTable from './BacklogTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Loader2, Tags } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useScrumBoard, ScrumTask } from '@/hooks/useScrumBoard'
import { useSupabase } from '@/providers/supabase-provider'
import { useLabels } from '@/hooks/useLabels'
import { useUsers } from '@/hooks/useUsers'
import TaskCreationDialog from '@/components/common/TaskCreationDialog'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDroppable } from '@dnd-kit/core'

interface ProductBacklogProps {
  boardId: string
  organizationId?: string
  projectId?: string
  viewMode?: 'cards' | 'table'
  backlogTasks?: any[]
  planningSprints?: any[]
  activeSprints?: any[]
  completedSprints?: any[]
  onCreateSprint?: (data: { name: string; goal?: string; duration?: number }) => void
  onStartSprint?: (sprintId: string, data?: { name?: string; goal?: string; startDate?: string; endDate?: string }) => void
  onFinishSprint?: (sprintId: string) => void
  onRefresh?: () => void
  onMoveTask?: (taskId: string, fromLocation: string, toLocation: string) => void
  initialTaskId?: string | null
  boardColor?: string | null
}

// Draggable Task Component
function DraggableTask({ 
  task, 
  onTaskClick,
  onClone,
  onShare,
  onDelete,
  onMoveToTop,
  onAddToPredefined,
  labels
}: { 
  task: ScrumTask; 
  onTaskClick?: (task: ScrumTask) => void;
  onClone?: (taskId: string) => void;
  onShare?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onMoveToTop?: (taskId: string) => void;
  onAddToPredefined?: (taskId: string) => void;
  labels: Array<{ id: string; name: string; color: string | null; }>;
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
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className="cursor-grab active:cursor-grabbing"
    >
      <TaskCardModern
        id={task.id}
        itemCode={task.id}
        title={task.title}
        description={task.description}
        taskType={task.taskType as 'story' | 'bug' | 'task' | 'epic' | 'improvement' | 'idea' | 'note'}
        storyPoints={task.storyPoints}
        assignee={task.assignee ? {
          name: task.assignee.fullName,
          initials: task.assignee.fullName.split(' ').map(n => n[0]).join(''),
          avatar: task.assignee.avatar
        } : undefined}
        labels={task.labels ? labels.filter(l => task.labels?.includes(l.id)).map(l => ({
          name: l.name,
          color: l.color || '#6B7280'
        })) : []}
        url={task.url}
        status={task.status === 'backlog' ? 'todo' : task.status === 'done' ? 'done' : 'in_progress'}
        onClick={() => onTaskClick?.(task)}
      />
    </div>
  )
}

// Droppable Column Component
function DroppableColumn({ 
  id, 
  title, 
  children, 
  tasks,
  columnType,
  onAddItem,
  onAddTask,
  onAddTaskEnhanced,
  users,
  labels,
  boardColor
}: { 
  id: string
  title: string
  children: React.ReactNode
  tasks: ScrumTask[]
  columnType: 'backlog' | 'sprint' | 'followup'
  onAddItem?: () => void
  onAddTask?: (title: string) => Promise<void>
  onAddTaskEnhanced?: (data: {
    title: string;
    taskType: string;
    assigneeId?: string;
    labels?: string[];
    storyPoints?: number;
    priority?: string;
  }) => Promise<void>
  users?: Array<{
    id: string;
    name: string;
    initials: string;
    avatar?: string;
  }>
  labels?: Array<{
    id: string;
    name: string;
    color: string;
  }>
  boardColor?: string | null
}) {
  const { setNodeRef } = useDroppable({ id })
  
  const totalPoints = tasks.reduce((sum, task) => sum + (task.storyPoints || 0), 0)

  return (
    <div ref={setNodeRef} className="h-full">
      <Column
        title={title}
        itemCount={tasks.length}
        pointCount={totalPoints}
        columnType={columnType}
        onAddItem={onAddItem}
        onAddTask={onAddTask}
        onAddTaskEnhanced={onAddTaskEnhanced}
        users={users}
        labels={labels}
        useEnhancedForm={true}
        boardColor={boardColor}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
      </Column>
    </div>
  )
}

export default function ProductBacklog({ 
  boardId, 
  organizationId, 
  projectId,
  viewMode = 'cards',
  backlogTasks: propBacklogTasks,
  planningSprints,
  activeSprints,
  completedSprints,
  onCreateSprint,
  onStartSprint,
  onFinishSprint,
  onRefresh,
  onMoveTask,
  initialTaskId,
  boardColor
}: ProductBacklogProps) {
  const {
    tasks,
    activeSprint,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    cloneTask,
    shareTask,
    moveTaskToTop,
    addToPredefined,
    mirrorTask,
    createSprint,
    startSprint,
    getTasksByStatus,
    mutateTasks
  } = useScrumBoard(boardId, projectId)

  const { user } = useSupabase()
  const { labels } = useLabels(boardId)
  const { users } = useUsers({ organizationId })
  const [activeTask, setActiveTask] = useState<ScrumTask | null>(null)
  const [selectedTask, setSelectedTask] = useState<ScrumTask | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedTaskType, setSelectedTaskType] = useState({
    id: 'story',
    name: 'Story',
    icon: '●',
    color: 'bg-emerald-500'
  })

  // Auto-open task dialog if initialTaskId is provided
  useEffect(() => {
    if (initialTaskId && tasks.length > 0) {
      const task = tasks.find(t => t.id === initialTaskId)
      if (task) {
        setSelectedTask(task)
      }
    }
  }, [initialTaskId, tasks])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Filter tasks by search term
  const filteredTasks = useMemo(() => {
    if (!searchTerm) return tasks
    return tasks.filter(task => 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [tasks, searchTerm])

  const handleDragStart = (event: DragStartEvent) => {
    const task = filteredTasks.find(t => t.id === event.active.id)
    if (task) {
      setActiveTask(task)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    const targetId = over.id as string

    // Find the current task and its current status
    const currentTask = filteredTasks.find(task => task.id === taskId)
    if (!currentTask) return

    // Check if we're dropping on a column or on another task
    const isColumnTarget = ['backlog', 'sprint', 'followup'].includes(targetId)
    const targetTask = isColumnTarget ? null : filteredTasks.find(task => task.id === targetId)

    // Determine if this is a column change or position change within same column
    let isColumnChange = false
    let newStatus = currentTask.status // Keep current status by default

    if (isColumnTarget) {
      // Dropping on a column - check if it's a different column
      if (targetId === 'backlog' && currentTask.status !== 'backlog') {
        isColumnChange = true
        newStatus = 'backlog'
      } else if (targetId === 'sprint' && currentTask.status !== 'in_sprint') {
        isColumnChange = true
        newStatus = 'in_sprint'
      } else if (targetId === 'followup' && currentTask.status !== 'followup') {
        isColumnChange = true
        newStatus = 'followup'
      }
    } else if (targetTask) {
      // Dropping on another task - check if they're in different columns
      if (currentTask.status !== targetTask.status) {
        isColumnChange = true
        newStatus = targetTask.status
      }
    }

    try {
      if (isColumnChange) {
        // Handle column change
        await moveTask(taskId, newStatus as 'backlog' | 'sprint' | 'followup', activeSprint?.id)
        toast.success('Task moved successfully')
      } else if (targetTask && targetTask.id !== taskId) {
        // Handle position change within the same column
        // Get tasks in the same column as the current task
        const sameColumnTasks = filteredTasks.filter(task => task.status === currentTask.status)
        const currentTaskIndex = sameColumnTasks.findIndex(task => task.id === taskId)
        const targetTaskIndex = sameColumnTasks.findIndex(task => task.id === targetTask.id)
        
        if (currentTaskIndex !== -1 && targetTaskIndex !== -1 && currentTaskIndex !== targetTaskIndex) {
          console.log('Position update:', {
            currentTask: currentTask.title,
            targetTask: targetTask.title,
            currentIndex: currentTaskIndex,
            targetIndex: targetTaskIndex,
            currentPosition: currentTask.position,
            targetPosition: targetTask.position
          })
          
          // Optimistically update local state immediately for smooth UX
          mutateTasks((currentTasks: ScrumTask[] = []) => {
            // Find tasks in the same column
            const columnTasks = currentTasks.filter(task => task.status === currentTask.status)
            const otherTasks = currentTasks.filter(task => task.status !== currentTask.status)
            
            // Reorder just the column tasks
            const reorderedColumnTasks = [...columnTasks]
            const dragTaskIndex = reorderedColumnTasks.findIndex(task => task.id === taskId)
            const dropTaskIndex = reorderedColumnTasks.findIndex(task => task.id === targetTask.id)
            
            if (dragTaskIndex !== -1 && dropTaskIndex !== -1) {
              const [movedTask] = reorderedColumnTasks.splice(dragTaskIndex, 1)
              reorderedColumnTasks.splice(dropTaskIndex, 0, movedTask)
              
              // Update positions for reordered tasks
              reorderedColumnTasks.forEach((task, index) => {
                task.position = index
              })
            }
            
            // Return all tasks with the reordered column tasks
            return [...otherTasks, ...reorderedColumnTasks]
          }, false) // false = don't revalidate immediately
          
          // Now make API calls in background
          try {
            // Reorder the tasks array to match the desired order
            const reorderedTasks = [...sameColumnTasks]
            const [movedTask] = reorderedTasks.splice(currentTaskIndex, 1)
            reorderedTasks.splice(targetTaskIndex, 0, movedTask)
            
            // Update positions for all affected tasks
            const updates = reorderedTasks.map((task, index) => 
              updateTask(task.id, { position: index })
            )
            
            console.log('Updating positions for all tasks in column')
            await Promise.all(updates)
            
            // Revalidate to ensure consistency with server
            mutateTasks()
          } catch (error) {
            // Revert optimistic update on failure
            console.error('Failed to update positions, reverting:', error)
            mutateTasks()
            throw error
          }
          toast.success('Task position updated')
        }
      }
    } catch (error) {
      toast.error('Failed to update task')
    }
  }

  const handleTaskCreated = () => {
    // Task creation is now handled by TaskCreationDialog
    // This just handles any additional logic after successful creation
  }

  const handleAddTask = async (title: string) => {
    try {
      await createTask({
        title,
        description: '',
        taskType: selectedTaskType.id as 'story' | 'bug' | 'task' | 'epic' | 'improvement',
        status: 'backlog',
        storyPoints: 0
      })
      toast.success('Task created successfully')
    } catch (error) {
      toast.error('Failed to create task')
    }
  }

  const handleAddTaskEnhanced = async (data: {
    title: string;
    taskType: string;
    assigneeId?: string;
    labels?: string[];
    storyPoints?: number;
    priority?: string;
  }) => {
    try {
      await createTask({
        title: data.title,
        description: '',
        taskType: data.taskType as 'story' | 'bug' | 'task' | 'epic' | 'improvement',
        status: 'backlog',
        storyPoints: data.storyPoints || 0,
        assigneeId: data.assigneeId,
        labels: data.labels || [],
        priority: data.priority
      })
      toast.success('Task created successfully')
    } catch (error) {
      toast.error('Failed to create task')
    }
  }

  const handleStartSprint = async () => {
    try {
      if (activeSprint) {
        await startSprint(activeSprint.id)
        toast.success('Sprint started successfully')
      }
    } catch (error) {
      toast.error('Failed to start sprint')
    }
  }

  const handleCloneTask = async (taskId: string) => {
    try {
      await cloneTask(taskId)
      toast.success('Task cloned successfully')
    } catch (error) {
      toast.error('Failed to clone task')
    }
  }

  const handleShareTask = async (taskId: string) => {
    try {
      const { link } = await shareTask(taskId)
      toast.success('Link copied to clipboard')
    } catch (error) {
      toast.error('Failed to share task')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId)
      toast.success('Task deleted successfully')
    } catch (error) {
      toast.error('Failed to delete task')
    }
  }

  const handleMoveToTop = async (taskId: string) => {
    try {
      await moveTaskToTop(taskId)
      toast.success('Task moved to top')
    } catch (error) {
      toast.error('Failed to move task')
    }
  }

  const handleAddToPredefined = async (taskId: string) => {
    try {
      await addToPredefined(taskId)
      toast.success('Added to predefined items')
    } catch (error) {
      toast.error('Failed to add to predefined items')
    }
  }

  const backlogTasks = getTasksByStatus('backlog').filter(task => 
    !searchTerm || 
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  const sprintTasks = getTasksByStatus('sprint').filter(task => 
    !searchTerm || 
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  const followupTasks = getTasksByStatus('followup').filter(task => 
    !searchTerm || 
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading board data</p>
          <p className="text-sm text-gray-500">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold">Product Backlog</h2>
            {activeSprint && activeSprint.status === 'planning' && (
              <Button 
                variant="outline" 
                onClick={handleStartSprint}
                disabled={loading}
              >
                Start Sprint
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href={`/boards/${boardId}/labels`}>
                <Tags className="w-4 h-4 mr-2" />
                Labels
              </Link>
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="search"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            {activeSprint && (
              <Badge variant="outline" className="ml-2">
                {activeSprint.name} ({activeSprint.status})
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Board Content */}
      <div className="flex-1 p-6 overflow-auto">
        {loading && !tasks.length ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : viewMode === 'table' ? (
          <>
            <BacklogTable
              boardId={boardId}
              organizationId={organizationId}
              backlogTasks={backlogTasks}
              sprints={[...(planningSprints || []), ...(activeSprints || [])]}
              onRefresh={onRefresh || (() => {})}
              onAddItem={() => setIsCreateDialogOpen(true)}
            />
            <TaskCreationDialog
              boardId={boardId}
              projectId={projectId}
              organizationId={organizationId}
              onSuccess={() => {
                handleTaskCreated()
                setIsCreateDialogOpen(false)
              }}
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            />
          </>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-3 gap-6 h-full">
              {/* Backlog Column */}
              <DroppableColumn 
                id="backlog" 
                title="Backlog" 
                tasks={backlogTasks}
                columnType="backlog"
                onAddItem={() => setIsCreateDialogOpen(true)}
                onAddTask={handleAddTask}
                onAddTaskEnhanced={handleAddTaskEnhanced}
                users={users.map(u => ({
                  id: u.id,
                  name: u.fullName || u.email || 'Unknown',
                  initials: (u.fullName || u.email || 'U').split(' ').map(n => n[0]).join('').toUpperCase(),
                  avatar: u.avatarUrl
                }))}
                labels={labels.map(l => ({
                  id: l.id,
                  name: l.name,
                  color: l.color || '#6B7280'
                }))}
                boardColor={boardColor}
              >
                {backlogTasks.map(task => (
                  <DraggableTask 
                    key={task.id} 
                    task={task} 
                    onTaskClick={setSelectedTask}
                    onClone={handleCloneTask}
                    onShare={handleShareTask}
                    onDelete={handleDeleteTask}
                    onMoveToTop={handleMoveToTop}
                    onAddToPredefined={handleAddToPredefined}
                    labels={labels}
                  />
                ))}
              </DroppableColumn>

              {/* Sprint Column */}
              <DroppableColumn 
                id="sprint" 
                title={activeSprint ? activeSprint.name : "Sprint 1"} 
                tasks={sprintTasks}
                columnType="sprint"
                onAddItem={() => setIsCreateDialogOpen(true)}
                onAddTask={handleAddTask}
                onAddTaskEnhanced={handleAddTaskEnhanced}
                users={users.map(u => ({
                  id: u.id,
                  name: u.fullName || u.email || 'Unknown',
                  initials: (u.fullName || u.email || 'U').split(' ').map(n => n[0]).join('').toUpperCase(),
                  avatar: u.avatarUrl
                }))}
                labels={labels.map(l => ({
                  id: l.id,
                  name: l.name,
                  color: l.color || '#6B7280'
                }))}
                boardColor={boardColor}
              >
                {sprintTasks.map(task => (
                  <DraggableTask 
                    key={task.id} 
                    task={task} 
                    onTaskClick={setSelectedTask}
                    onClone={handleCloneTask}
                    onShare={handleShareTask}
                    onDelete={handleDeleteTask}
                    onMoveToTop={handleMoveToTop}
                    onAddToPredefined={handleAddToPredefined}
                    labels={labels}
                  />
                ))}
              </DroppableColumn>

              {/* Follow up Column */}
              <DroppableColumn 
                id="followup" 
                title="Follow up" 
                tasks={followupTasks}
                columnType="followup"
                onAddItem={() => setIsCreateDialogOpen(true)}
                onAddTask={handleAddTask}
                onAddTaskEnhanced={handleAddTaskEnhanced}
                users={users.map(u => ({
                  id: u.id,
                  name: u.fullName || u.email || 'Unknown',
                  initials: (u.fullName || u.email || 'U').split(' ').map(n => n[0]).join('').toUpperCase(),
                  avatar: u.avatarUrl
                }))}
                labels={labels.map(l => ({
                  id: l.id,
                  name: l.name,
                  color: l.color || '#6B7280'
                }))}
                boardColor={boardColor}
              >
                {followupTasks.map(task => (
                  <DraggableTask 
                    key={task.id} 
                    task={task} 
                    onTaskClick={setSelectedTask}
                    onClone={handleCloneTask}
                    onShare={handleShareTask}
                    onDelete={handleDeleteTask}
                    onMoveToTop={handleMoveToTop}
                    onAddToPredefined={handleAddToPredefined}
                    labels={labels}
                  />
                ))}
              </DroppableColumn>
            </div>

            <DragOverlay>
              {activeTask && (
                <TaskCardModern
                  id={activeTask.id}
                  title={activeTask.title}
                  description={activeTask.description}
                  taskType={activeTask.taskType as 'story' | 'bug' | 'task' | 'epic' | 'improvement' | 'idea' | 'note'}
                  storyPoints={activeTask.storyPoints}
                  assignee={activeTask.assignee ? {
                    name: activeTask.assignee.fullName,
                    initials: activeTask.assignee.fullName.split(' ').map(n => n[0]).join(''),
                    avatar: activeTask.assignee.avatar
                  } : undefined}
                  labels={activeTask.labels ? labels.filter(l => activeTask.labels?.includes(l.id)).map(l => ({
                    name: l.name,
                    color: l.color || '#6B7280'
                  })) : []}
                  url={activeTask.url}
                  status={activeTask.status === 'backlog' ? 'todo' : activeTask.status === 'done' ? 'done' : 'in_progress'}
                />
              )}
            </DragOverlay>
          </DndContext>
        )}        
      </div>

      {/* Item Modal */}
      {selectedTask && (
        <ItemModal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          taskId={selectedTask.id}
          onUpdate={() => {
            // Refresh data
            setSelectedTask(null)
          }}
        />
      )}
    </div>
  )
}