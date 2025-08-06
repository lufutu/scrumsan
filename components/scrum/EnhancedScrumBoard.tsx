"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSupabase } from '@/providers/supabase-provider'
import { toast } from 'sonner'
import { useLabels } from '@/hooks/useLabels'
import { useProjects } from '@/hooks/useProjects'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/animate-ui/radix/dialog'
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
import { DragDropProvider } from '@/components/drag-drop/DragDropProvider'
import { DragDropAPI } from '@/lib/drag-drop-api'
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { DragDataTypes } from '@/lib/optimistic-drag-drop'
import { cn } from '@/lib/utils'

import { Task, Sprint, BoardColumn } from '@/types/shared';

interface EnhancedScrumBoardProps {
  projectId: string
  boardId: string
  organizationId?: string
}

const PragmaticDropZone = ({ 
  id, 
  children, 
  className,
  onDrop
}: { 
  id: string
  children: React.ReactNode
  className?: string
  onDrop?: (taskId: string) => void
}) => {
  const [isDraggedOver, setIsDraggedOver] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = dropRef.current
    if (!element) return

    return dropTargetForElements({
      element,
      canDrop: ({ source }) => DragDataTypes.isTask(source.data),
      getData: () => ({
        type: id === 'backlog' ? 'backlog' : 'column',
        columnId: id
      }),
      onDragEnter: () => setIsDraggedOver(true),
      onDragLeave: () => setIsDraggedOver(false),
      onDrop: ({ source }) => {
        setIsDraggedOver(false)
        if (DragDataTypes.isTask(source.data) && onDrop) {
          onDrop(source.data.taskId)
        }
      }
    })
  }, [id, onDrop])

  return (
    <div 
      ref={dropRef}
      className={cn(
        className,
        isDraggedOver && "bg-blue-50 border-blue-300"
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



  // Fetch data
  const fetchData = useCallback(async () => {
    await Promise.all([
      fetchBacklogTasks(),
      fetchSprints(),
      fetchSprintColumns()
    ])
  }, [fetchBacklogTasks, fetchSprints, fetchSprintColumns])

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

  const fetchSprints = useCallback(async () => {
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
  })

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

  // Drag and drop handlers for Pragmatic D&D
  const handleTaskMove = useCallback(async (
    taskId: string,
    targetLocation: { columnId?: string | null }
  ) => {
    const draggedTask = backlogTasks.find(t => t.id === taskId) ||
                       sprintColumns.flatMap(col => col.tasks).find(t => t.id === taskId)
    
    if (!draggedTask) {
      toast.error('Task not found')
      return
    }

    try {
      if (targetLocation.columnId === 'backlog') {
        // Moving to backlog
        if (activeSprint && draggedTask.sprintColumnId) {
          await DragDropAPI.moveTask(
            'to-backlog',
            { taskId, sourceSprintId: activeSprint.id },
            () => {
              // Success - refresh data
              fetchData()
            },
            (error) => {
              console.error('Failed to move task to backlog:', error)
            }
          )
        }
      } else if (targetLocation.columnId && activeSprint) {
        // Moving to a sprint column
        if (!draggedTask.sprintColumnId) {
          // From backlog to sprint column - need to add to sprint first
          await DragDropAPI.moveTask(
            'to-sprint',
            { taskId, targetSprintId: activeSprint.id },
            async () => {
              // Then move to specific column
              await DragDropAPI.moveTask(
                'to-column',
                { taskId, sprintId: activeSprint.id, columnId: targetLocation.columnId },
                () => {
                  fetchData()
                },
                (error) => {
                  console.error('Failed to move task to column:', error)
                }
              )
            },
            (error) => {
              console.error('Failed to add task to sprint:', error)
            }
          )
        } else {
          // Moving between sprint columns
          await DragDropAPI.moveTask(
            'to-column',
            { taskId, sprintId: activeSprint.id, columnId: targetLocation.columnId },
            () => {
              fetchData()
            },
            (error) => {
              console.error('Failed to move task between columns:', error)
            }
          )
        }
      }
    } catch (error) {
      console.error('Task move operation failed:', error)
    }
  }, [backlogTasks, sprintColumns, activeSprint, fetchData])

  // Handler for drop zones
  const handleDrop = useCallback((columnId: string) => {
    return (taskId: string) => {
      handleTaskMove(taskId, { columnId })
    }
  }, [handleTaskMove])


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

  // Get all tasks for DragDropProvider
  const allTasks = [...backlogTasks, ...sprintColumns.flatMap(col => col.tasks)]

  return (
    <DragDropProvider 
      initialTasks={allTasks}
      onTaskMove={handleTaskMove}
    >
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
                <PragmaticDropZone id="backlog" className="h-full" onDrop={handleDrop('backlog')}>
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
                    {filteredBacklogTasks.map((task, index) => (
                      <div key={task.id} className="p-3 bg-white border rounded-lg hover:shadow-sm">
                        <TaskCardModern
                          id={task.id}
                          itemCode={task.itemCode}
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
                </PragmaticDropZone>
              </CardContent>
            </Card>
          </div>

          {/* Sprint Columns - Right Side */}
          <div className="col-span-8">
            {activeSprint ? (
              <div className="flex gap-4 h-full overflow-x-auto">
                <div className="flex gap-4 min-w-max">
                  {sprintColumns.map(column => (
                    <Card key={column.id} className="h-full w-[350px] flex-shrink-0">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between text-base">
                        <span>{column.name}</span>
                        <Badge variant="secondary">{column.tasks.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-full">
                      <PragmaticDropZone id={column.id} className="h-full" onDrop={handleDrop(column.id)}>
                        <div className="space-y-3">
                          {/* Column Tasks */}
                          {column.tasks.map((task, index) => (
                            <TaskCardModern
                              key={task.id}
                              id={task.id}
                              itemCode={task.itemCode}
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
                              sprintId={activeSprint?.id}
                              sprintColumnId={column.id}
                            />
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
                      </PragmaticDropZone>
                    </CardContent>
                    </Card>
                  ))}
                </div>
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
      </div>
    </DragDropProvider>
  )
}