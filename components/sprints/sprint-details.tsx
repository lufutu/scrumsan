"use client"

import { useEffect, useState } from 'react'
import { useSupabase } from '@/providers/supabase-provider'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, Clock, Target, TrendingDown, CheckCircle2, AlertCircle } from 'lucide-react'
import TaskCard from '@/components/tasks/task-card'
import { Tables } from '@/types/database'

// Simple Progress component
const Progress = ({ value, className }: { value: number; className?: string }) => (
  <div className={`w-full bg-muted rounded-full h-2 ${className}`}>
    <div 
      className="bg-primary h-2 rounded-full transition-all" 
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
)

type Sprint = Tables<'sprints'> & {
  tasks: Array<Tables<'tasks'> & {
    assignee?: {
      id: string
      full_name: string | null
      avatar_url: string | null
    } | null
  }>
}

interface SprintDetailsProps {
  sprintId: string
  projectId: string
}

export default function SprintDetails({ sprintId, projectId }: SprintDetailsProps) {
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const [sprint, setSprint] = useState<Sprint | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchSprintDetails()
  }, [sprintId])

  const fetchSprintDetails = async () => {
    try {
      setIsLoading(true)
      
      // Fetch sprint details
      const { data: sprintData, error: sprintError } = await supabase
        .from('sprints')
        .select('*')
        .eq('id', sprintId)
        .single()

      if (sprintError) throw sprintError

      // Fetch sprint tasks
      const { data: sprintTasks, error: tasksError } = await supabase
        .from('sprint_tasks')
        .select(`
          task_id,
          tasks (
            *,
            assignee:users!assignee_id (
              id,
              full_name,
              avatar_url
            )
          )
        `)
        .eq('sprint_id', sprintId)

      if (tasksError) throw tasksError

             const tasks = sprintTasks?.map(st => st.tasks).filter((task): task is NonNullable<typeof task> => task !== null) || []

      setSprint({
        ...sprintData,
        tasks
      })
    } catch (err: any) {
      console.error('Error fetching sprint details:', err)
      toast({
        title: "Error",
        description: "Failed to load sprint details"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getSprintStatus = () => {
    if (!sprint) return { status: 'planning', label: 'Planning', color: 'secondary' }
    
    const now = new Date()
    const startDate = sprint.start_date ? new Date(sprint.start_date) : null
    const endDate = sprint.end_date ? new Date(sprint.end_date) : null

    if (!startDate || !endDate) {
      return { status: 'planning', label: 'Planning', color: 'secondary' }
    }

    if (now < startDate) {
      return { status: 'upcoming', label: 'Upcoming', color: 'outline' }
    } else if (now > endDate) {
      return { status: 'completed', label: 'Completed', color: 'default' }
    } else {
      return { status: 'active', label: 'Active', color: 'destructive' }
    }
  }

  const getTaskStats = () => {
    if (!sprint?.tasks) return { total: 0, todo: 0, inProgress: 0, done: 0 }
    
    const total = sprint.tasks.length
    const todo = sprint.tasks.filter(task => task.status === 'todo').length
    const inProgress = sprint.tasks.filter(task => task.status === 'in_progress').length
    const done = sprint.tasks.filter(task => task.status === 'done').length

    return { total, todo, inProgress, done }
  }

  const getDaysRemaining = () => {
    if (!sprint?.end_date) return null
    
    const endDate = new Date(sprint.end_date)
    const now = new Date()
    const diffTime = endDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays
  }

  const getProgress = () => {
    const stats = getTaskStats()
    if (stats.total === 0) return 0
    return Math.round((stats.done / stats.total) * 100)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-muted rounded w-1/2 mb-6"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-muted rounded w-16"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!sprint) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-destructive">Sprint not found</div>
        </CardContent>
      </Card>
    )
  }

  const sprintStatus = getSprintStatus()
  const taskStats = getTaskStats()
  const daysRemaining = getDaysRemaining()
  const progress = getProgress()

  return (
    <div className="space-y-6">
      {/* Sprint Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">{sprint.name}</h1>
          <Badge variant={sprintStatus.color as any}>
            {sprintStatus.label}
          </Badge>
        </div>
        
        {sprint.goal && (
          <p className="text-muted-foreground text-lg mb-4">
            <Target className="inline h-4 w-4 mr-1" />
            <strong>Goal:</strong> {sprint.goal}
          </p>
        )}

        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          {sprint.start_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Start: {new Date(sprint.start_date).toLocaleDateString()}
            </div>
          )}
          {sprint.end_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              End: {new Date(sprint.end_date).toLocaleDateString()}
            </div>
          )}
          {daysRemaining !== null && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {daysRemaining > 0 ? `${daysRemaining} days remaining` : 
               daysRemaining === 0 ? 'Ends today' : 
               `Ended ${Math.abs(daysRemaining)} days ago`}
            </div>
          )}
        </div>
      </div>

      {/* Sprint Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold">{taskStats.total}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{taskStats.inProgress}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{taskStats.done}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Progress</p>
                <p className="text-2xl font-bold">{progress}%</p>
              </div>
              <TrendingDown className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Sprint Progress</CardTitle>
          <CardDescription>
            {taskStats.done} of {taskStats.total} tasks completed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </CardContent>
      </Card>

      {/* Task Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* To Do Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">To Do ({taskStats.todo})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sprint.tasks
              .filter(task => task.status === 'todo')
              .map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  projectId={projectId}
                  onUpdate={fetchSprintDetails}
                  className="shadow-none border"
                />
              ))
            }
            {taskStats.todo === 0 && (
              <p className="text-muted-foreground text-sm text-center py-4">
                No tasks to do
              </p>
            )}
          </CardContent>
        </Card>

        {/* In Progress Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">In Progress ({taskStats.inProgress})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sprint.tasks
              .filter(task => task.status === 'in_progress')
              .map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  projectId={projectId}
                  onUpdate={fetchSprintDetails}
                  className="shadow-none border"
                />
              ))
            }
            {taskStats.inProgress === 0 && (
              <p className="text-muted-foreground text-sm text-center py-4">
                No tasks in progress
              </p>
            )}
          </CardContent>
        </Card>

        {/* Done Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Done ({taskStats.done})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sprint.tasks
              .filter(task => task.status === 'done')
              .map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  projectId={projectId}
                  onUpdate={fetchSprintDetails}
                  className="shadow-none border opacity-75"
                />
              ))
            }
            {taskStats.done === 0 && (
              <p className="text-muted-foreground text-sm text-center py-4">
                No completed tasks
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 