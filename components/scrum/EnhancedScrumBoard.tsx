"use client"

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from '@/providers/supabase-provider'
import { toast } from 'sonner'
import { useLabels } from '@/hooks/useLabels'
import { useProjects } from '@/hooks/useProjects'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Calendar, 
  Clock, 
  Target, 
  Plus, 
  Activity, 
  ArrowRight, 
  X, 
  Timer, 
  BarChart3, 
  Users,
  Play,
  Square,
  Settings,
  Filter,
  Search
} from 'lucide-react'
import { TaskCardModern } from '@/components/scrum/TaskCardModern'
import { ItemModal } from '@/components/scrum/ItemModal'
import { ComprehensiveInlineForm } from '@/components/scrum/ComprehensiveInlineForm'
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent, 
  useDroppable,
  useSensor,
  useSensors,
  PointerSensor
} from '@dnd-kit/core'
import { cn } from '@/lib/utils'

import { Task, Sprint, BoardColumn } from '@/types/shared';

interface EnhancedScrumBoardProps {
  projectId: string
  boardId: string
  organizationId?: string
}

const DroppableArea = ({ 
  id, 
  children, 
  className 
}: { 
  id: string
  children: React.ReactNode
  className?: string 
}) => {
  const { setNodeRef, isOver } = useDroppable({ id })
  
  return (
    <div 
      ref={setNodeRef} 
      className={cn(
        className,
        isOver && "bg-blue-50 border-blue-300"
      )}
    >
      {children}
    </div>
  )
}

export default function EnhancedScrumBoard({ 
  projectId, 
  boardId, 
  organizationId 
}: EnhancedScrumBoardProps) {
  const { supabase, user } = useSupabase()
  const { labels } = useLabels(boardId)
  const { projects } = useProjects(organizationId || '')
  
  // State
  const [isLoading, setIsLoading] = useState(false)
  const [backlogTasks, setBacklogTasks] = useState<Task[]>([])
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null)
  const [sprintColumns, setSprintColumns] = useState<BoardColumn[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPriority, setFilterPriority] = useState<string[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  
  // Sprint creation state
  const [isCreateSprintOpen, setIsCreateSprintOpen] = useState(false)
  const [isStartSprintOpen, setIsStartSprintOpen] = useState(false)
  const [newSprint, setNewSprint] = useState({
    name: '',
    goal: '',
    duration: 14, // days
    startDate: new Date().toISOString().split('T')[0]
  })

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Fetch data
  const fetchData = useCallback(async () => {
    await Promise.all([
      fetchBacklogTasks(),
      fetchSprints(),
      fetchSprintColumns()
    ])
  }, [projectId, boardId])

  const fetchBacklogTasks = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks?backlog=true`)
      if (!response.ok) throw new Error('Failed to fetch backlog tasks')
      const data = await response.json()
      setBacklogTasks(data)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch backlog tasks')
    }
  }

  const fetchSprints = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/sprints`)
      if (!response.ok) throw new Error('Failed to fetch sprints')
      const data = await response.json()
      setSprints(data)
      
      // Find active sprint
      const active = data.find((s: Sprint) => s.status === 'active')
      setActiveSprint(active || null)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch sprints')
    }
  }

  const fetchSprintColumns = async () => {
    if (!activeSprint) {
      // Default columns
      setSprintColumns([
        { id: 'todo', name: 'To Do', position: 0, tasks: [] },
        { id: 'in_progress', name: 'In Progress', position: 1, tasks: [] },
        { id: 'testing', name: 'Testing/Review', position: 2, tasks: [] },
        { id: 'done', name: 'Done', position: 3, tasks: [] }
      ])
      return
    }

    try {
      const response = await fetch(`/api/sprints/${activeSprint.id}/columns`)
      if (!response.ok) throw new Error('Failed to fetch sprint columns')
      const data = await response.json()
      setSprintColumns(data)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch sprint columns')
    }
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Create sprint
  const handleCreateSprint = async () => {
    try {
      const response = await fetch('/api/sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newSprint,
          projectId,
          boardId,
          status: 'planning'
        })
      })

      if (!response.ok) throw new Error('Failed to create sprint')

      toast.success('Sprint created successfully')
      setIsCreateSprintOpen(false)
      setNewSprint({ name: '', goal: '', duration: 14, startDate: new Date().toISOString().split('T')[0] })
      fetchSprints()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to create sprint')
    }
  }

  // Start sprint
  const handleStartSprint = async (sprintId: string) => {
    try {
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + newSprint.duration)

      const response = await fetch(`/api/sprints/${sprintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'active',
          startDate: newSprint.startDate,
          endDate: endDate.toISOString().split('T')[0]
        })
      })

      if (!response.ok) throw new Error('Failed to start sprint')

      toast.success('Sprint started successfully')
      setIsStartSprintOpen(false)
      fetchSprints()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to start sprint')
    }
  }

  // Finish sprint
  const handleFinishSprint = async (sprintId: string) => {
    try {
      const response = await fetch(`/api/sprints/${sprintId}/finish`, {
        method: 'POST'
      })

      if (!response.ok) throw new Error('Failed to finish sprint')

      const result = await response.json()
      toast.success(result.message || 'Sprint finished successfully')
      fetchData()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to finish sprint')
    }
  }

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveId(active.id as string)
    
    // Find the dragged task
    const task = backlogTasks.find(t => t.id === active.id) ||
                sprintColumns.flatMap(col => col.tasks).find(t => t.id === active.id)
    setDraggedTask(task || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setDraggedTask(null)

    if (!over || !draggedTask) return

    const overId = over.id as string

    try {
      // If dropping on backlog
      if (overId === 'backlog') {
        // Remove from sprint if it was in one
        if (activeSprint && draggedTask.sprintColumnId) {
          await fetch(`/api/sprints/${activeSprint.id}/tasks/${draggedTask.id}`, {
            method: 'DELETE'
          })
          toast.success('Task moved to backlog')
          fetchData()
        }
        return
      }

      // If dropping on a sprint column
      const targetColumn = sprintColumns.find(col => col.id === overId)
      if (targetColumn && activeSprint) {
        // Add to sprint if not already in it
        if (!draggedTask.sprintColumnId) {
          await fetch(`/api/sprints/${activeSprint.id}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId: draggedTask.id })
          })
        }

        // Move to target column
        await fetch(`/api/sprints/${activeSprint.id}/tasks/move`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: draggedTask.id,
            targetColumnId: overId
          })
        })

        toast.success('Task moved successfully')
        fetchData()
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to move task')
    }
  }

  // Create task
  const handleCreateTask = async (data: any, targetArea: 'backlog' | string) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          projectId,
          boardId,
          sprintColumnId: targetArea !== 'backlog' ? targetArea : null
        })
      })

      if (!response.ok) throw new Error('Failed to create task')

      // If creating in sprint column, add to active sprint
      if (targetArea !== 'backlog' && activeSprint) {
        const task = await response.json()
        await fetch(`/api/sprints/${activeSprint.id}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: task.id })
        })
      }

      toast.success('Task created successfully')
      fetchData()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to create task')
    }
  }

  // Filter tasks
  const filteredBacklogTasks = backlogTasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (task.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    const matchesPriority = filterPriority.length === 0 || filterPriority.includes(task.priority || 'medium')
    return matchesSearch && matchesPriority
  })

  // Sprint statistics
  const getSprintStats = () => {
    if (!activeSprint) return { total: 0, completed: 0, inProgress: 0, todo: 0 }
    
    const allTasks = sprintColumns.flatMap(col => col.tasks)
    return {
      total: allTasks.length,
      completed: 0,
      inProgress: 0,
      todo: allTasks.length
    }
  }

  const stats = getSprintStats()

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Scrum Board</h1>
            <p className="text-muted-foreground">Product Backlog & Sprint Execution</p>
          </div>
          
          <div className="flex items-center gap-2">
            {!activeSprint ? (
              <Dialog open={isCreateSprintOpen} onOpenChange={setIsCreateSprintOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Sprint
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Sprint</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="sprintName">Sprint Name</Label>
                      <Input
                        id="sprintName"
                        value={newSprint.name}
                        onChange={(e) => setNewSprint(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Sprint 1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sprintGoal">Sprint Goal</Label>
                      <Input
                        id="sprintGoal"
                        value={newSprint.goal}
                        onChange={(e) => setNewSprint(prev => ({ ...prev, goal: e.target.value }))}
                        placeholder="What do you want to achieve?"
                      />
                    </div>
                    <div>
                      <Label htmlFor="duration">Duration (days)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={newSprint.duration}
                        onChange={(e) => setNewSprint(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                        min="1"
                        max="30"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={() => setIsCreateSprintOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateSprint} disabled={!newSprint.name}>
                      Create Sprint
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <div className="flex items-center gap-2">
                {activeSprint.status === 'planning' && (
                  <Button onClick={() => handleStartSprint(activeSprint.id)}>
                    <Play className="h-4 w-4 mr-2" />
                    Start Sprint
                  </Button>
                )}
                {activeSprint.status === 'active' && (
                  <Button variant="outline" onClick={() => handleFinishSprint(activeSprint.id)}>
                    <Square className="h-4 w-4 mr-2" />
                    Finish Sprint
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Active Sprint Info */}
        {activeSprint && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {activeSprint.name}
                    <Badge variant={activeSprint.status === 'active' ? 'default' : 'secondary'}>
                      {activeSprint.status}
                    </Badge>
                  </CardTitle>
                  {activeSprint.goal && (
                    <p className="text-sm text-muted-foreground mt-1">{activeSprint.goal}</p>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {activeSprint.startDate && activeSprint.endDate && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{activeSprint.startDate} → {activeSprint.endDate}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    <span>{stats.completed}/{stats.total} tasks</span>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>

        {/* Main Board Layout */}
        <div className="flex-1 grid grid-cols-12 gap-6">
          {/* Product Backlog - Left Side */}
          <div className="col-span-4">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span>Product Backlog</span>
                  <Badge variant="secondary">{filteredBacklogTasks.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-full">
                <DroppableArea id="backlog" className="h-full">
                  <div className="space-y-3">
                    {/* Add Task Form */}
                    <ComprehensiveInlineForm
                      onAdd={(data) => handleCreateTask(data, 'backlog')}
                      onCancel={() => {}}
                      placeholder="What needs to be done?"
                      users={[]}
                      labels={labels.map(l => ({
                        id: l.id,
                        name: l.name,
                        color: l.color || '#6B7280'
                      }))}
                    />
                    
                    {/* Backlog Tasks */}
                    {filteredBacklogTasks.map(task => (
                      <div
                        key={task.id}
                        className="p-3 bg-white border rounded-lg hover:shadow-sm cursor-move"
                        draggable
                      >
                        <TaskCardModern
                          id={task.id}
                          title={task.title}
                          description={task.description || ''}
                          taskType={task.taskType as any}
                          storyPoints={task.storyPoints || 0}
                          assignees={task.taskAssignees?.map((ta: any) => ({
                            id: ta.user.id,
                            name: ta.user.fullName || ta.user.email || 'Unknown User',
                            avatar: ta.user.avatarUrl || undefined,
                            initials: ta.user.fullName?.split(' ').map((n: string) => n[0]).join('') || 'U'
                          })) || []}
                          boardId={boardId}
                          labels={task.taskLabels?.map((tl: any) => ({
                            id: tl.label.id,
                            name: tl.label.name,
                            color: tl.label.color
                          })) || []}
                          onClick={() => setSelectedTask(task)}
                          onAssigneesChange={() => {
                            // Trigger refetch if needed
                          }}
                        />
                      </div>
                    ))}
                    
                    {filteredBacklogTasks.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No items in backlog</p>
                        <p className="text-sm">Add items to start planning</p>
                      </div>
                    )}
                  </div>
                </DroppableArea>
              </CardContent>
            </Card>
          </div>

          {/* Sprint Columns - Right Side */}
          <div className="col-span-8">
            {activeSprint ? (
              <div className="grid grid-cols-4 gap-4 h-full">
                {sprintColumns.map(column => (
                  <Card key={column.id} className="h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between text-base">
                        <span>{column.name}</span>
                        <Badge variant="secondary">{column.tasks.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-full">
                      <DroppableArea id={column.id} className="h-full">
                        <div className="space-y-3">
                          {/* Column Tasks */}
                          {column.tasks.map(task => (
                            <div
                              key={task.id}
                              className="cursor-move"
                              draggable
                            >
                              <TaskCardModern
                                id={task.id}
                                title={task.title}
                                description={task.description || ''}
                                taskType={task.taskType as any}
                                storyPoints={task.storyPoints || 0}
                                assignees={task.taskAssignees?.map((ta: any) => ({
                                  id: ta.user.id,
                                  name: ta.user.fullName || ta.user.email || 'Unknown User',
                                  avatar: ta.user.avatarUrl || undefined,
                                  initials: ta.user.fullName?.split(' ').map((n: string) => n[0]).join('') || 'U'
                                })) || []}
                                boardId={boardId}
                                labels={task.taskLabels?.map((tl: any) => ({
                                  id: tl.label.id,
                                  name: tl.label.name,
                                  color: tl.label.color
                                })) || []}
                                onClick={() => setSelectedTask(task)}
                                onAssigneesChange={() => {
                                  // Trigger refetch if needed
                                }}
                              />
                            </div>
                          ))}
                          
                          {/* Add Task in Column */}
                          <ComprehensiveInlineForm
                            onAdd={(data) => handleCreateTask(data, column.id)}
                            onCancel={() => {}}
                            placeholder="Add item..."
                            users={[]}
                            labels={[]}
                            compact
                          />
                          
                          {column.tasks.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                              <div className="text-3xl mb-2">📋</div>
                              <p className="text-sm">Drop tasks here</p>
                            </div>
                          )}
                        </div>
                      </DroppableArea>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Active Sprint</h3>
                  <p className="text-muted-foreground mb-4">Create a sprint to start working with your backlog</p>
                  <Button onClick={() => setIsCreateSprintOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Sprint
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedTask && (
            <div className="opacity-50">
              <TaskCardModern
                id={draggedTask.id}
                title={draggedTask.title}
                description={draggedTask.description}
                taskType={draggedTask.taskType as any}
                storyPoints={draggedTask.storyPoints || 0}
                assignee={draggedTask.assignee ? {
                  name: draggedTask.assignee.fullName,
                  initials: draggedTask.assignee.fullName.split(' ').map(n => n[0]).join(''),
                  avatar: draggedTask.assignee.avatarUrl
                } : undefined}
                labels={[]}
              />
            </div>
          )}
        </DragOverlay>
      </div>

      {/* Task Modal */}
      {selectedTask && (
        <ItemModal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          taskId={selectedTask.id}
          onUpdate={() => {
            fetchData();
          }}
        />
      )}
    </DndContext>
  )
}