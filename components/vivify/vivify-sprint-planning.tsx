"use client"

import { useState, useEffect } from 'react'
import { useSupabase } from '@/providers/supabase-provider'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
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
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { 
  Calendar, 
  Target, 
  Users, 
  Clock,
  BarChart3,
  Plus,
  Settings,
  Play,
  CheckCircle2,
  Archive,
  ArrowRight,
  Zap,
  GripVertical
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tables } from '@/types/database'

// Task priority colors
const PRIORITY_COLORS = {
  highest: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-green-100 text-green-800 border-green-200',
  lowest: 'bg-gray-100 text-gray-800 border-gray-200'
}

// Task type icons and colors
const TASK_TYPES = {
  story: { icon: '📋', color: 'bg-blue-100 text-blue-800', label: 'Story' },
  bug: { icon: '🐛', color: 'bg-red-100 text-red-800', label: 'Bug' },
  task: { icon: '✅', color: 'bg-green-100 text-green-800', label: 'Task' },
  epic: { icon: '🚀', color: 'bg-purple-100 text-purple-800', label: 'Epic' },
  improvement: { icon: '⚡', color: 'bg-orange-100 text-orange-800', label: 'Improvement' }
}

type Task = Tables<'tasks'> & {
  assignee?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
}

type Sprint = Tables<'sprints'> & {
  sprint_tasks?: Array<{
    task_id: string
    tasks: Task
  }>
  _count?: {
    total_tasks: number
    story_points: number
  }
}

interface TaskCardProps {
  task: Task
  isDragging?: boolean
}

function TaskCard({ task, isDragging = false }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const taskType = TASK_TYPES[task.task_type as keyof typeof TASK_TYPES] || TASK_TYPES.task

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-3 bg-white border rounded-lg shadow-sm transition-all cursor-move",
        isDragging && "opacity-50 shadow-lg"
      )}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-gray-400" />
          <Badge variant="secondary" className={taskType.color}>
            {taskType.icon} {taskType.label}
          </Badge>
          {task.priority && (
            <Badge 
              variant="outline" 
              className={cn("text-xs", PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS])}
            >
              {task.priority.toUpperCase()}
            </Badge>
          )}
        </div>
        {task.story_points && (
          <Badge variant="outline" className="text-xs">
            {task.story_points} SP
          </Badge>
        )}
      </div>
      
      <h4 className="font-medium text-sm line-clamp-2 mb-2">{task.title}</h4>
      
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          TASK-{task.id.slice(-4).toUpperCase()}
        </div>
        {task.assignee && (
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center text-white text-xs">
              {task.assignee.full_name?.charAt(0) || 'U'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface VivifySprintPlanningProps {
  projectId: string
  sprintId?: string
}

export default function VivifySprintPlanning({ projectId, sprintId }: VivifySprintPlanningProps) {
  const { supabase } = useSupabase()
  const { toast } = useToast()
  
  const [backlogTasks, setBacklogTasks] = useState<Task[]>([])
  const [sprintTasks, setSprintTasks] = useState<Task[]>([])
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  useEffect(() => {
    fetchData()
  }, [projectId])

  useEffect(() => {
    if (sprintId) {
      const sprint = sprints.find(s => s.id === sprintId)
      setSelectedSprint(sprint || null)
    }
  }, [sprintId, sprints])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      await Promise.all([
        fetchBacklogTasks(),
        fetchSprints()
      ])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchBacklogTasks = async () => {
    try {
      const { data, error } = await supabase
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
        .in('status', ['todo', 'backlog'])
        .order('created_at', { ascending: false })

      if (error) throw error
      setBacklogTasks(data || [])
    } catch (err: any) {
      console.error('Error fetching backlog tasks:', err)
    }
  }

  const fetchSprints = async () => {
    try {
      const { data, error } = await supabase
        .from('sprints')
        .select('*')
        .eq('project_id', projectId)
        .in('status', ['planning', 'active'])
        .order('created_at', { ascending: false })

      if (error) throw error
      setSprints(data || [])
      
      if ((data || []).length > 0 && !selectedSprint) {
        const activeSprint = (data || []).find(s => s.status === 'active') || (data || [])[0]
        if (activeSprint && typeof activeSprint.id === 'string') {
          setSelectedSprint(activeSprint)
          fetchSprintTasks(activeSprint.id)
        }
      }
    } catch (err: any) {
      console.error('Error fetching sprints:', err)
    }
  }

  const fetchSprintTasks = async (sprintId: string) => {
    try {
      const { data, error } = await supabase
        .from('sprint_tasks')
        .select(`
          tasks(
            *,
            assignee:users!assignee_id (
              id,
              full_name,
              avatar_url
            )
          )
        `)
        .eq('sprint_id', sprintId)

      if (error) throw error
      
      const tasks = (data || []).map(st => st.tasks).filter(Boolean) as Task[]
      setSprintTasks(tasks)
    } catch (err: any) {
      console.error('Error fetching sprint tasks:', err)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    setActiveId(null)
    
    if (!over) return

    const taskId = active.id as string
    const overId = over.id as string

    // Determine source and destination
    const isTaskInSprint = sprintTasks.some(t => t.id === taskId)
    const isTaskInBacklog = backlogTasks.some(t => t.id === taskId)
    
    const isOverBacklog = overId === 'backlog' || backlogTasks.some(t => t.id === overId)
    const isOverSprint = overId === 'sprint' || sprintTasks.some(t => t.id === overId)

    try {
      if (isTaskInSprint && isOverBacklog) {
        // Move from sprint to backlog
        await supabase
          .from('sprint_tasks')
          .delete()
          .eq('task_id', taskId)
          .eq('sprint_id', selectedSprint?.id)

        const task = sprintTasks.find(t => t.id === taskId)
        if (task) {
          setSprintTasks(prev => prev.filter(t => t.id !== taskId))
          setBacklogTasks(prev => [task, ...prev])
        }

      } else if (isTaskInBacklog && isOverSprint && selectedSprint) {
        // Move from backlog to sprint
        await supabase
          .from('sprint_tasks')
          .insert({
            sprint_id: selectedSprint.id,
            task_id: taskId
          })

        const task = backlogTasks.find(t => t.id === taskId)
        if (task) {
          setBacklogTasks(prev => prev.filter(t => t.id !== taskId))
          setSprintTasks(prev => [...prev, task])
        }
      }

      toast({
        title: "Success",
        description: "Task moved successfully"
      })

    } catch (err: any) {
      console.error('Error moving task:', err)
      toast({
        title: "Error",
        description: "Failed to move task"
      })
    }
  }

  const handleSprintChange = (sprintId: string) => {
    const sprint = sprints.find(s => s.id === sprintId)
    if (sprint) {
      setSelectedSprint(sprint)
      fetchSprintTasks(sprint.id)
    }
  }

  const handleStartSprint = async () => {
    if (!selectedSprint) return

    try {
      const { error } = await supabase
        .from('sprints')
        .update({ status: 'active' })
        .eq('id', selectedSprint.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Sprint started successfully"
      })

      fetchSprints()
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to start sprint"
      })
    }
  }

  const getSprintStats = () => {
    const totalTasks = sprintTasks.length
    const totalStoryPoints = sprintTasks.reduce((sum, task) => sum + (task.story_points || 0), 0)
    
    return { totalTasks, totalStoryPoints }
  }

  const activeTask = activeId ? [...backlogTasks, ...sprintTasks].find(t => t.id === activeId) : null

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-32"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="h-20 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const sprintStats = getSprintStats()

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sprint Planning</h1>
          <p className="text-gray-600 mt-1">Drag tasks from backlog to sprint and plan your iteration</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select 
            value={selectedSprint?.id || ''} 
            onValueChange={handleSprintChange}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a sprint" />
            </SelectTrigger>
            <SelectContent>
              {sprints.map(sprint => (
                <SelectItem key={sprint.id} value={sprint.id}>
                  <div className="flex items-center gap-2">
                    <Badge className={cn("text-xs", 
                      sprint.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    )}>
                      {sprint.status === 'active' ? <Play className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                      {sprint.status?.toUpperCase()}
                    </Badge>
                    {sprint.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedSprint?.status === 'planning' && sprintTasks.length > 0 && (
            <Button 
              onClick={handleStartSprint}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Sprint
            </Button>
          )}
        </div>
      </div>

      {/* Sprint Overview */}
      {selectedSprint && (
        <Card className="border-teal-200 bg-gradient-to-r from-teal-50 to-blue-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 rounded-lg">
                  <Target className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {selectedSprint.name}
                    <Badge className={cn("text-xs",
                      selectedSprint.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    )}>
                      {selectedSprint.status === 'active' ? <Play className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                      {selectedSprint.status?.toUpperCase()}
                    </Badge>
                  </CardTitle>
                  {selectedSprint.goal && (
                    <p className="text-gray-600 mt-1">{selectedSprint.goal}</p>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Sprint Tasks</span>
                </div>
                <div className="text-2xl font-bold text-teal-600">
                  {sprintStats.totalTasks}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <BarChart3 className="h-4 w-4" />
                  <span>Story Points</span>
                </div>
                <div className="text-2xl font-bold text-teal-600">
                  {sprintStats.totalStoryPoints} SP
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Duration</span>
                </div>
                <div className="text-sm">
                  {selectedSprint.start_date && selectedSprint.end_date && (
                    <>
                      {new Date(selectedSprint.start_date).toLocaleDateString()} -<br />
                      {new Date(selectedSprint.end_date).toLocaleDateString()}
                    </>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>Days Remaining</span>
                </div>
                <div className="text-2xl font-bold text-orange-600">
                  {selectedSprint.end_date && 
                    Math.max(0, Math.ceil((new Date(selectedSprint.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
                  } days
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Drag and Drop Interface */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product Backlog */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5" />
                Product Backlog
                <Badge variant="outline">{backlogTasks.length}</Badge>
              </CardTitle>
              <p className="text-sm text-gray-600">
                Drag tasks to add them to the sprint
              </p>
            </CardHeader>
            <CardContent>
              <SortableContext items={backlogTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div 
                  id="backlog"
                  className="space-y-3 min-h-96 p-3 rounded border-2 border-dashed border-gray-200"
                >
                  {backlogTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                  
                  {backlogTasks.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      No tasks in backlog
                    </div>
                  )}
                </div>
              </SortableContext>
            </CardContent>
          </Card>

          {/* Sprint Backlog */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-teal-600" />
                Sprint Backlog
                <Badge variant="outline">{sprintTasks.length}</Badge>
                {sprintStats.totalStoryPoints > 0 && (
                  <Badge className="bg-teal-100 text-teal-800">
                    {sprintStats.totalStoryPoints} SP
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-gray-600">
                Tasks planned for {selectedSprint?.name || 'this sprint'}
              </p>
            </CardHeader>
            <CardContent>
              <SortableContext items={sprintTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div 
                  id="sprint"
                  className="space-y-3 min-h-96 p-3 rounded border-2 border-dashed border-gray-200"
                >
                  {sprintTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                  
                  {sprintTasks.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <Target className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No tasks in sprint</p>
                      <p className="text-xs">Drag tasks from backlog to plan your sprint</p>
                    </div>
                  )}
                </div>
              </SortableContext>
            </CardContent>
          </Card>
        </div>

        <DragOverlay>
          {activeId && activeTask ? (
            <TaskCard task={activeTask} isDragging />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
} 