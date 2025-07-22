"use client"

import { useEffect, useState } from 'react'
import { useSupabase } from '@/providers/supabase-provider'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Users,
  Target,
  Activity
} from 'lucide-react'
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

interface ProjectAnalyticsProps {
  projectId: string
}

type Sprint = Tables<'sprints'> & {
  sprint_tasks: Array<{
    task: Tables<'tasks'>
  }>
}

type Task = Tables<'tasks'> & {
  assignee?: {
    id: string
    full_name: string | null
  }
}

type ProjectMember = {
  user: {
    id: string
    full_name: string | null
  }
  tasks_assigned: number
  tasks_completed: number
}

export default function ProjectAnalytics({ projectId }: ProjectAnalyticsProps) {
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    todoTasks: 0,
    totalSprints: 0,
    activeSprints: 0,
    completedSprints: 0,
    averageTasksPerSprint: 0,
    completionRate: 0
  })

  useEffect(() => {
    fetchAnalytics()
  }, [projectId])

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)

      // Fetch sprints with tasks
      const { data: sprintsData, error: sprintsError } = await supabase
        .from('sprints')
        .select(`
          *,
          sprint_tasks (
            task:tasks (*)
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (sprintsError) throw sprintsError

      // Fetch all tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:users!assignee_id (
            id,
            full_name
          )
        `)
        .eq('project_id', projectId)

      if (tasksError) throw tasksError

      // Fetch project members with task stats
      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select(`
          user:users (
            id,
            full_name
          )
        `)
        .eq('project_id', projectId)

      if (membersError) throw membersError

      // Calculate member stats
      const memberStats = membersData?.map(member => {
        const userTasks = tasksData?.filter(task => task.assignee_id === member.user?.id) || []
        const completedTasks = userTasks.filter(task => 
          task.column?.name?.toLowerCase().includes('done')
        )
        
        return {
          user: member.user!,
          tasks_assigned: userTasks.length,
          tasks_completed: completedTasks.length
        }
      }) || []

      // Calculate stats
      const totalTasks = tasksData?.length || 0
      const completedTasks = tasksData?.filter(task => 
        task.column?.name?.toLowerCase().includes('done')
      ).length || 0
      const inProgressTasks = tasksData?.filter(task => 
        task.column?.name?.toLowerCase().includes('progress')
      ).length || 0
      const todoTasks = (tasksData?.length || 0) - completedTasks - inProgressTasks
      
      const totalSprints = sprintsData?.length || 0
      const now = new Date()
      const activeSprints = sprintsData?.filter(sprint => 
        sprint.start_date && sprint.end_date &&
        new Date(sprint.start_date) <= now && 
        new Date(sprint.end_date) >= now
      ).length || 0
      
      const completedSprints = sprintsData?.filter(sprint =>
        sprint.end_date && new Date(sprint.end_date) < now
      ).length || 0

      const averageTasksPerSprint = totalSprints > 0 ? Math.round(totalTasks / totalSprints) : 0
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

             // Filter out null tasks from sprint_tasks
       const cleanedSprints = sprintsData?.map(sprint => ({
         ...sprint,
         sprint_tasks: sprint.sprint_tasks.filter(st => st.task !== null) as Array<{
           task: Tables<'tasks'>
         }>
       })) || []

       // Filter out null assignees from tasks  
       const cleanedTasks = tasksData?.map(task => ({
         ...task,
         assignee: task.assignee || undefined
       })) || []

       setSprints(cleanedSprints)
       setTasks(cleanedTasks)
      setMembers(memberStats)
      setStats({
        totalTasks,
        completedTasks,
        inProgressTasks,
        todoTasks,
        totalSprints,
        activeSprints,
        completedSprints,
        averageTasksPerSprint,
        completionRate
      })

    } catch (err: any) {
      console.error('Error fetching analytics:', err)
      toast({
        title: "Error",
        description: "Failed to load analytics data"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getSprintProgress = (sprint: Sprint) => {
    const tasks = sprint.sprint_tasks?.map(st => st.task) || []
    const completed = tasks.filter(task => 
      task.column?.name?.toLowerCase().includes('done')
    ).length
    return tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0
  }

  const getSprintStatus = (sprint: Sprint) => {
    if (!sprint.start_date || !sprint.end_date) return 'planning'
    
    const now = new Date()
    const start = new Date(sprint.start_date)
    const end = new Date(sprint.end_date)
    
    if (now < start) return 'upcoming'
    if (now > end) return 'completed'
    return 'active'
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-4"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Project Analytics</h2>
        <p className="text-muted-foreground">
          Track progress, performance, and team productivity
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold">{stats.completionRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
            <Progress value={stats.completionRate} className="mt-3 h-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold">{stats.totalTasks}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.completedTasks} completed, {stats.inProgressTasks} in progress
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Sprints</p>
                <p className="text-2xl font-bold">{stats.activeSprints}</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalSprints} total sprints
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Tasks/Sprint</p>
                <p className="text-2xl font-bold">{stats.averageTasksPerSprint}</p>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sprints" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sprints">Sprint Performance</TabsTrigger>
          <TabsTrigger value="tasks">Task Breakdown</TabsTrigger>
          <TabsTrigger value="team">Team Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="sprints" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sprint Performance</CardTitle>
              <CardDescription>
                Track progress and completion rates across sprints
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sprints.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No sprints created yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sprints.map((sprint) => {
                    const progress = getSprintProgress(sprint)
                    const status = getSprintStatus(sprint)
                    const tasks = sprint.sprint_tasks?.map(st => st.task) || []
                    
                    return (
                      <div key={sprint.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-semibold">{sprint.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {sprint.goal || 'No goal set'}
                            </p>
                          </div>
                          <Badge variant={status === 'active' ? 'default' : status === 'completed' ? 'secondary' : 'outline'}>
                            {status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>{tasks.filter(t => 
              t.column?.name?.toLowerCase().includes('done')
            ).length} of {tasks.length} tasks completed</span>
                            <span className="font-medium">{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                        
                        {sprint.start_date && sprint.end_date && (
                          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                            <span>Start: {new Date(sprint.start_date).toLocaleDateString()}</span>
                            <span>End: {new Date(sprint.end_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{stats.completedTasks}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="h-12 w-12 text-orange-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{stats.inProgressTasks}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <AlertCircle className="h-12 w-12 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{stats.todoTasks}</p>
                <p className="text-sm text-muted-foreground">To Do</p>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Task Distribution</CardTitle>
              <CardDescription>
                Breakdown of tasks by status and priority
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Completed Tasks</span>
                    <span className="text-sm font-medium">{Math.round((stats.completedTasks / stats.totalTasks) * 100)}%</span>
                  </div>
                  <Progress value={(stats.completedTasks / stats.totalTasks) * 100} className="h-2" />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">In Progress</span>
                    <span className="text-sm font-medium">{Math.round((stats.inProgressTasks / stats.totalTasks) * 100)}%</span>
                  </div>
                  <Progress value={(stats.inProgressTasks / stats.totalTasks) * 100} className="h-2" />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">To Do</span>
                    <span className="text-sm font-medium">{Math.round((stats.todoTasks / stats.totalTasks) * 100)}%</span>
                  </div>
                  <Progress value={(stats.todoTasks / stats.totalTasks) * 100} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Performance</CardTitle>
              <CardDescription>
                Individual team member contributions and task completion rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No team members found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {members.map((member) => {
                    const completionRate = member.tasks_assigned > 0 
                      ? Math.round((member.tasks_completed / member.tasks_assigned) * 100) 
                      : 0

                    return (
                      <div key={member.user.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-semibold">
                              {member.user.full_name || 'Unnamed User'}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {member.tasks_assigned} tasks assigned
                            </p>
                          </div>
                          <Badge variant={completionRate >= 75 ? 'default' : completionRate >= 50 ? 'secondary' : 'outline'}>
                            {completionRate}% complete
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>{member.tasks_completed} of {member.tasks_assigned} tasks completed</span>
                            <span className="font-medium">{completionRate}%</span>
                          </div>
                          <Progress value={completionRate} className="h-2" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 