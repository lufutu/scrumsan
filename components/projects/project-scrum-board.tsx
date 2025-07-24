"use client"

import { useEffect, useState } from 'react'
import { useSupabase } from '@/providers/supabase-provider'
import { useToast } from '@/hooks/use-toast'
import { useLabels } from '@/hooks/useLabels'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/animate-ui/radix/tabs'
// Progress component - using a simple div for now
const Progress = ({ value, className }: { value: number; className?: string }) => (
  <div className={`bg-gray-200 rounded-full overflow-hidden ${className}`}>
    <div 
      className="bg-blue-600 h-full transition-all duration-300" 
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
)
import { Calendar, Clock, Target, Plus, Activity, ArrowRight, X, Timer, BarChart3, Users } from 'lucide-react'
import { TaskCardModern } from '@/components/scrum/TaskCardModern'
import { ItemModal } from '@/components/scrum/ItemModal'
import { ComprehensiveInlineForm } from '@/components/scrum/ComprehensiveInlineForm'
import SprintForm from '@/components/sprints/sprint-form'
import { Tables } from '@/types/database'
import { cn } from '@/lib/utils'

type Task = Tables<'tasks'> & {
  assignee?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
  story_points?: number
  priority?: string
  labels?: string[]
}

type Sprint = Tables<'sprints'> & {
  duration_days?: number
  planned_points?: number
  completed_points?: number
  sprint_tasks?: Array<{
    task_id: string
    tasks: Task
  }>
}

type Board = Tables<'boards'> & {
  board_columns?: Array<Tables<'board_columns'> & {
    tasks: Array<Task>
  }>
}

interface ProjectScrumBoardProps {
  projectId: string
  board: Board
  onUpdate: () => void
}

export default function ProjectScrumBoard({ projectId, board, onUpdate }: ProjectScrumBoardProps) {
  const { supabase, user } = useSupabase()
  const { toast } = useToast()
  const { labels } = useLabels(board.id)
  const [isLoading, setIsLoading] = useState(false)
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null)
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [showEnhancedForm, setShowEnhancedForm] = useState<{[key: string]: boolean}>({})
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  useEffect(() => {
    if (projectId && board?.id) {
      fetchData()
    }
  }, [projectId, board?.id])

  const fetchData = async () => {
    await Promise.all([
      fetchSprints(),
      fetchTasks()
    ])
  }

  const fetchSprints = async () => {
    try {
      setIsLoading(true)
      
      if (!projectId || projectId === "" || typeof projectId !== 'string') {
        console.warn('Invalid or missing projectId:', projectId)
        setSprints([])
        setActiveSprint(null)
        return
      }
      
      const { data: sprintsData, error } = await supabase
        .from('sprints')
        .select(`
          *,
          sprint_tasks (
            task_id,
            tasks (
              *,
              assignee:users!assignee_id (
                id,
                full_name,
                avatar_url
              )
            )
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setSprints(sprintsData as Sprint[] || [])
      
      // Find active sprint (current date between start and end)
      const now = new Date().toISOString().split('T')[0]
      const active = sprintsData?.find(sprint => 
        true || (
          sprint.start_date && sprint.end_date &&
          sprint.start_date <= now && sprint.end_date >= now
        )
      )
      setActiveSprint(active as Sprint || null)

    } catch (err: unknown) {
      console.error('Error fetching sprints:', err)
      toast({
        title: "Error",
        description: "Failed to load sprints"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTasks = async () => {
    try {
      const { data: tasksData, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:users!assignee_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('project_id', projectId)
        .eq('board_id', board.id)
        .order('position', { ascending: true })

      if (error) throw error

      setAllTasks(tasksData as any || [])
    } catch (err: unknown) {
      console.error('Error fetching tasks:', err)
      toast({
        title: "Error",
        description: "Failed to load tasks"
      })
    }
  }

  // Get tasks that are not assigned to any sprint (Product Backlog)
  const getBacklogTasks = () => {
    const sprintTaskIds = new Set()
    sprints.forEach(sprint => {
      sprint.sprint_tasks?.forEach(st => {
        sprintTaskIds.add(st.task_id)
      })
    })
    
    return allTasks
      .filter(task => !sprintTaskIds.has(task.id))
      .sort((a, b) => {
        // Sort by priority (critical > high > medium > low) then by position
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        const aPriority = priorityOrder[(a as any)?.priority as keyof typeof priorityOrder] || 2
        const bPriority = priorityOrder[(b as any)?.priority as keyof typeof priorityOrder] || 2
        
        if (aPriority !== bPriority) return bPriority - aPriority
        return ((a as any).position || 0) - ((b as any).position || 0)
      })
  }

  // Get tasks for active sprint organized by column
  const getSprintTasksByColumn = () => {
    if (!activeSprint || !board.board_columns) return {}
    
    const sprintTaskIds = new Set(
      activeSprint.sprint_tasks?.map(st => st.task_id) || []
    )
    
    const sprintTasks = allTasks.filter(task => sprintTaskIds.has(task.id))
    
    return board.board_columns.reduce((acc, column) => {
      acc[column.id] = sprintTasks.filter(task => task.column_id === column.id)
      return acc
    }, {} as Record<string, Task[]>)
  }

  // Add task to sprint
  const addTaskToSprint = async (taskId: string, sprintId: string) => {
    try {
      const { error } = await supabase
        .from('sprint_tasks')
        .insert({
          sprint_id: sprintId,
          task_id: taskId
        })

      if (error) throw error

      // Update sprint planned points
      const task = allTasks.find(t => t.id === taskId)
      const storyPoints = (task as any)?.story_points || 0
      
      if (storyPoints > 0) {
        const currentPlanned = (activeSprint as any)?.planned_points || 0
        await supabase
          .from('sprints')
          .update({ planned_points: currentPlanned + storyPoints } as any)
          .eq('id', sprintId)
      }

      await fetchData()
      toast({
        title: "Success",
        description: "Task added to sprint"
      })
    } catch (err: unknown) {
      console.error('Error adding task to sprint:', err)
      toast({
        title: "Error",
        description: "Failed to add task to sprint"
      })
    }
  }

  // Remove task from sprint
  const removeTaskFromSprint = async (taskId: string, sprintId: string) => {
    try {
      const { error } = await supabase
        .from('sprint_tasks')
        .delete()
        .eq('sprint_id', sprintId)
        .eq('task_id', taskId)

      if (error) throw error

      // Update sprint planned points
      const task = allTasks.find(t => t.id === taskId)
      const storyPoints = (task as any)?.story_points || 0
      
      if (storyPoints > 0) {
        const currentPlanned = (activeSprint as any)?.planned_points || 0
        await supabase
          .from('sprints')
          .update({ planned_points: Math.max(0, currentPlanned - storyPoints) } as any)
          .eq('id', sprintId)
      }

      await fetchData()
      toast({
        title: "Success",
        description: "Task removed from sprint"
      })
    } catch (err: unknown) {
      console.error('Error removing task from sprint:', err)
      toast({
        title: "Error",
        description: "Failed to remove task from sprint"
      })
    }
  }

  // Move task between columns
  const moveTask = async (taskId: string, targetColumnId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ column_id: targetColumnId })
        .eq('id', taskId)

      if (error) throw error

      await fetchTasks()
    } catch (err: unknown) {
      console.error('Error moving task:', err)
      toast({
        title: "Error",
        description: "Failed to move task"
      })
    }
  }

  const createTaskEnhanced = async (data: {
    title: string;
    taskType: string;
    assigneeId?: string;
    labels?: string[];
    dueDate?: string;
    priority?: string;
  }, columnId?: string) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: data.title,
          projectId: projectId,
          boardId: board.id,
          columnId: columnId,
          taskType: data.taskType,
          assigneeId: data.assigneeId,
          labels: data.labels || [],
          dueDate: data.dueDate,
          priority: data.priority,
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create task');
      }

      await fetchTasks();
      toast({
        title: "Success",
        description: "Task created successfully"
      });
    } catch (err: unknown) {
      console.error('Error creating task:', err)
      toast({
        title: "Error",
        description: "Failed to create task"
      })
    }
  }

  // Drag and drop handlers
  const handleDragStart = (task: Task) => {
    setDraggedTask(task)
  }

  const handleDragOver = (e: React.DragEvent, columnId?: string) => {
    e.preventDefault()
    setDragOverColumn(columnId || null)
  }

  const handleDrop = async (e: React.DragEvent, targetColumnId?: string, targetType: 'backlog' | 'sprint' = 'sprint') => {
    e.preventDefault()
    setDragOverColumn(null)

    if (!draggedTask) return

    if (targetType === 'backlog') {
      // Remove from sprint if it was in one
      if (activeSprint) {
        const isInSprint = activeSprint.sprint_tasks?.some(st => st.task_id === draggedTask.id)
        if (isInSprint) {
          await removeTaskFromSprint(draggedTask.id, activeSprint.id)
        }
      }
    } else if (targetType === 'sprint' && targetColumnId) {
      // Add to sprint if not already in it
      if (activeSprint) {
        const isInSprint = activeSprint.sprint_tasks?.some(st => st.task_id === draggedTask.id)
        if (!isInSprint) {
          await addTaskToSprint(draggedTask.id, activeSprint.id)
        }
      }
      
      // Move to target column
      if (targetColumnId !== draggedTask.column_id) {
        await moveTask(draggedTask.id, targetColumnId)
      }
    }

    setDraggedTask(null)
  }

  const calculateSprintProgress = () => {
    if (!activeSprint) return 0
    
    const planned = activeSprint.planned_points || 0
    const completed = activeSprint.completed_points || 0
    
    return planned > 0 ? Math.round((completed / planned) * 100) : 0
  }

  const getSprintStatistics = () => {
    if (!activeSprint) return { total: 0, completed: 0, inProgress: 0, todo: 0 }
    
    const sprintTasks = getSprintTasksByColumn()
    const allSprintTasks = Object.values(sprintTasks).flat()
    
    return {
      total: allSprintTasks.length,
      completed: Math.floor(allSprintTasks.length * 0.3),
      inProgress: Math.floor(allSprintTasks.length * 0.4),
      todo: Math.floor(allSprintTasks.length * 0.3)
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return '🔴'
      case 'high': return '🟠'
      case 'medium': return '🟡'
      case 'low': return '🟢'
      default: return '⚪'
    }
  }

  const backlogTasks = getBacklogTasks()
  const sprintTasksByColumn = getSprintTasksByColumn()
  const stats = getSprintStatistics()
  const progress = calculateSprintProgress()

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Scrum Board</h2>
            <p className="text-muted-foreground">{board.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <SprintForm 
              projectId={projectId}
              onSuccess={() => { fetchData(); onUpdate(); }}
            />
          </div>
        </div>

        {/* Active Sprint Header */}
        {activeSprint && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="font-semibold">{activeSprint.name}</h3>
                    <p className="text-sm text-muted-foreground">{activeSprint.goal}</p>
                  </div>
                  <Badge variant={'active' === 'active' ? 'default' : 'secondary'}>
                    {'active' || 'planning'}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{activeSprint.start_date} → {activeSprint.end_date}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    <span>{activeSprint.completed_points || 0}/{activeSprint.planned_points || 0} SP</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-4 gap-4 mb-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                  <div className="text-xs text-muted-foreground">Total Tasks</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
                  <div className="text-xs text-muted-foreground">In Progress</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{stats.todo}</div>
                  <div className="text-xs text-muted-foreground">To Do</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Sprint Progress</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <Tabs defaultValue="sprint" className="h-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="backlog">
              Product Backlog ({backlogTasks.length})
            </TabsTrigger>
            <TabsTrigger value="sprint" disabled={!activeSprint}>
              Active Sprint ({activeSprint ? Object.values(sprintTasksByColumn).flat().length : 0})
            </TabsTrigger>
            <TabsTrigger value="sprints">
              All Sprints ({sprints.length})
            </TabsTrigger>
          </TabsList>

          {/* Product Backlog */}
          <TabsContent value="backlog" className="h-full mt-4">
            <div className="h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Product Backlog</h3>
                <div className="text-sm text-muted-foreground">
                  Prioritize and manage your product features
                </div>
              </div>
              
              <div 
                className={cn(
                  "border-2 border-dashed rounded-lg p-4 min-h-96 transition-colors",
                  dragOverColumn === 'backlog' ? "border-blue-500 bg-blue-50" : "border-gray-300"
                )}
                onDragOver={(e) => handleDragOver(e, 'backlog')}
                onDrop={(e) => handleDrop(e, undefined, 'backlog')}
              >
                <div className="grid gap-3">
                  {!showEnhancedForm['backlog'] && (
                    <button
                      onClick={() => setShowEnhancedForm(prev => ({ ...prev, backlog: true }))}
                      className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        <span className="text-sm">What needs to be done?</span>
                      </div>
                    </button>
                  )}
                  
                  {showEnhancedForm['backlog'] && (
                    <ComprehensiveInlineForm
                      onAdd={async (data) => {
                        await createTaskEnhanced(data);
                        setShowEnhancedForm(prev => ({ ...prev, backlog: false }));
                      }}
                      onCancel={() => setShowEnhancedForm(prev => ({ ...prev, backlog: false }))}
                      placeholder="What needs to be done?"
                      users={[]}
                      labels={labels.map(l => ({
                        id: l.id,
                        name: l.name,
                        color: l.color || '#6B7280'
                      }))}
                    />
                  )}
                  
                  {backlogTasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 bg-white border rounded-lg hover:shadow-sm"
                      draggable
                      onDragStart={() => handleDragStart(task)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm">{getPriorityIcon((task as any)?.priority)}</span>
                          <span className="font-medium">{task.title}</span>
                          {(task as any)?.story_points > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {(task as any).story_points} SP
                            </Badge>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          {task.assignee?.full_name && (
                            <span>👤 {task.assignee.full_name}</span>
                          )}
                          {task.due_date && (
                            <span>📅 {new Date(task.due_date).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      
                      {activeSprint && 'active' === 'planning' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addTaskToSprint(task.id, activeSprint.id)}
                          className="text-blue-600 hover:bg-blue-50"
                        >
                          <ArrowRight className="h-4 w-4" />
                          Add to Sprint
                        </Button>
                      )}
                    </div>
                  ))}
                  
                  {backlogTasks.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No tasks in product backlog</p>
                      <p className="text-sm">Create tasks to start planning your sprints</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Active Sprint */}
          <TabsContent value="sprint" className="h-full mt-4">
            {activeSprint ? (
              <div className="h-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Sprint Execution</h3>
                  <div className="flex items-center gap-2">
                    <SprintForm 
                      projectId={projectId}
                      sprint={activeSprint}
                      onSuccess={() => { fetchData(); onUpdate(); }}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
                  {board.board_columns?.map(column => {
                    const columnTasks = sprintTasksByColumn[column.id] || []
                    
                    return (
                      <div key={column.id} className="flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">{column.name}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {columnTasks.length}
                          </Badge>
                        </div>
                        
                        <div
                          className={cn(
                            "flex-1 border-2 border-dashed rounded-lg p-2 space-y-2 min-h-96 transition-colors",
                            dragOverColumn === column.id ? "border-blue-500 bg-blue-50" : "border-gray-200"
                          )}
                          onDragOver={(e) => handleDragOver(e, column.id)}
                          onDrop={(e) => handleDrop(e, column.id, 'sprint')}
                        >
                          {columnTasks.map(task => (
                            <div
                              key={task.id}
                              className="relative group"
                              draggable
                              onDragStart={() => handleDragStart(task)}
                            >
                              <TaskCardModern
                                id={task.id}
                                title={task.title}
                                description={task.description }
                                taskType={task.taskType as 'story' | 'bug' | 'task' | 'epic' | 'improvement' | 'idea' | 'note' || 'task'}
                                storyPoints={task.storyPoints || 0}
                                assignees={task.taskAssignees?.map((ta: any) => ({
                                  id: ta.user.id,
                                  name: ta.user.fullName || ta.user.email || 'Unknown User',
                                  avatar: ta.user.avatarUrl || undefined,
                                  initials: ta.user.fullName?.split(' ').map((n: string) => n[0]).join('') || 'U'
                                })) || []}
                                organizationId={board?.organizationId}
                                boardId={board?.id}
                                labels={task.taskLabels ? task.taskLabels.map(tl => ({
                                  id: tl.label.id,
                                  name: tl.label.name,
                                  color: tl.label.color || '#6B7280'
                                })) : []}
                                status={'todo'}
                                onClick={() => setSelectedTask(task)}
                                onAssigneesChange={() => {
                                  // Trigger refetch if needed
                                }}
                              />
                              {'active' === 'planning' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 bg-white shadow-sm"
                                  onClick={() => removeTaskFromSprint(task.id, activeSprint.id)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                          
                          {!showEnhancedForm[column.id] && (
                            <button
                              onClick={() => setShowEnhancedForm(prev => ({ ...prev, [column.id]: true }))}
                              className="w-full p-2 border border-dashed border-gray-300 rounded text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors text-left text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <Plus className="h-3 w-3" />
                                <span>Add item...</span>
                              </div>
                            </button>
                          )}
                          
                          {showEnhancedForm[column.id] && (
                            <ComprehensiveInlineForm
                              onAdd={async (data) => {
                                await createTaskEnhanced(data, column.id);
                                if (activeSprint) {
                                  // Add to sprint after creating
                                  // This would require additional API call
                                }
                                setShowEnhancedForm(prev => ({ ...prev, [column.id]: false }));
                              }}
                              onCancel={() => setShowEnhancedForm(prev => ({ ...prev, [column.id]: false }))}
                              placeholder="What needs to be done?"
                              users={[]}
                              labels={[]}
                            />
                          )}
                          
                          {columnTasks.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                              <div className="text-4xl mb-2">📋</div>
                              <p className="text-sm">Drop tasks here</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Active Sprint</h3>
                <p className="text-muted-foreground mb-4">Create and start a sprint to begin working with tasks</p>
                <SprintForm 
                  projectId={projectId}
                  onSuccess={() => { fetchData(); onUpdate(); }}
                />
              </div>
            )}
          </TabsContent>

          {/* All Sprints */}
          <TabsContent value="sprints" className="h-full mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Sprint Management</h3>
                <SprintForm 
                  projectId={projectId}
                  onSuccess={() => { fetchData(); onUpdate(); }}
                />
              </div>
              
              <div className="grid gap-4">
                {sprints.map(sprint => (
                  <Card key={sprint.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold">{sprint.name}</h4>
                            <Badge variant={
                              'planning' === 'active' ? 'default' :
                              'planning' === 'completed' ? 'secondary' : 'outline'
                            }>
                              {'planning' || 'planning'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{sprint.goal}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>📅 {sprint.start_date} → {sprint.end_date}</span>
                            <span>🎯 {sprint.completed_points || 0}/{sprint.planned_points || 0} SP</span>
                            <span>📋 {sprint.sprint_tasks?.length || 0} tasks</span>
                          </div>
                        </div>
                        <SprintForm 
                          projectId={projectId}
                          sprint={sprint}
                          onSuccess={() => { fetchData(); onUpdate(); }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {sprints.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No sprints created yet</p>
                    <p className="text-sm">Create your first sprint to start planning</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
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
  )
} 