"use client"

import { useEffect, useState } from 'react'
import { useSupabase } from '@/providers/supabase-provider'
import { useActiveOrg } from '@/hooks/useActiveOrg'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Plus, 
  TrendingUp, 
  Calendar, 
  Activity, 
  Clock, 
  CheckCircle2, 
  Users,
  FolderOpen,
  Kanban,
  BarChart3,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import ProjectForm from '@/components/projects/project-form'
import { Tables } from '@/types/database'

// Progress component
const Progress = ({ value, className }: { value: number; className?: string }) => (
  <div className={`w-full bg-muted rounded-full h-2 ${className}`}>
    <div 
      className="bg-primary h-2 rounded-full transition-all" 
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
)

type Project = Tables<'projects'> & {
  memberCount?: number
  taskCount?: number
  sprintCount?: number
}

type RecentActivity = {
  id: string
  type: 'task' | 'project' | 'sprint'
  title: string
  description: string
  time: string
  user?: {
    name: string
    avatar?: string
  }
}

export default function Dashboard() {
  const { supabase, user } = useSupabase()
  const activeOrg = useActiveOrg()
  const { toast } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeSprints: 0,
    totalTasks: 0,
    completedTasks: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (activeOrg?.id) {
      fetchDashboardData()
    } else {
      setIsLoading(false)
    }
  }, [activeOrg?.id])

  const fetchDashboardData = async () => {
    if (!activeOrg?.id) return

    try {
      setIsLoading(true)

      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', activeOrg.id)
        .order('created_at', { ascending: false })
        .limit(6)

      if (projectsError) {
        console.error('Projects error:', projectsError)
        throw projectsError
      }

      if (!projectsData || projectsData.length === 0) {
        setProjects([])
        setStats({
          totalProjects: 0,
          activeSprints: 0,
          totalTasks: 0,
          completedTasks: 0
        })
        
        // Set welcome activity for new organizations
        setRecentActivity([
          {
            id: '1',
            type: 'project',
            title: 'Welcome to ScrumSan!',
            description: 'Create your first project to get started',
            time: 'Just now',
            user: { name: 'System' }
          }
        ])
        
        setIsLoading(false)
        return
      }

      // Get basic project stats
      const { data: allProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('organization_id', activeOrg.id)

      const projectIds = allProjects?.map(p => p.id) || []

      // Enhance projects with counts
      const enhancedProjects = await Promise.all(
        projectsData.map(async (project) => {
          try {
            const { count: memberCount } = await supabase
              .from('project_members')
              .select('*', { count: 'exact', head: true })
              .eq('project_id', project.id)

            const { count: taskCount } = await supabase
              .from('tasks')
              .select('*', { count: 'exact', head: true })
              .eq('project_id', project.id)

            const { count: sprintCount } = await supabase
              .from('sprints')
              .select('*', { count: 'exact', head: true })
              .eq('project_id', project.id)

            return {
              ...project,
              memberCount: memberCount || 0,
              taskCount: taskCount || 0,
              sprintCount: sprintCount || 0
            }
          } catch (err) {
            console.error('Error enhancing project:', project.id, err)
            return {
              ...project,
              memberCount: 0,
              taskCount: 0,
              sprintCount: 0
            }
          }
        })
      )

      setProjects(enhancedProjects)

      // Calculate overall stats
      if (projectIds.length > 0) {
        const { data: allTasks } = await supabase
          .from('tasks')
          .select('id, status')
          .in('project_id', projectIds)

        const currentDate = new Date().toISOString().split('T')[0]
        const { data: activeSprints } = await supabase
          .from('sprints')
          .select('id')
          .in('project_id', projectIds)
          .gte('end_date', currentDate)

        const completedTasks = allTasks?.filter(task => task.status === 'done').length || 0

        setStats({
          totalProjects: allProjects?.length || 0,
          activeSprints: activeSprints?.length || 0,
          totalTasks: allTasks?.length || 0,
          completedTasks
        })
      } else {
        setStats({
          totalProjects: 0,
          activeSprints: 0,
          totalTasks: 0,
          completedTasks: 0
        })
      }

      // Set recent activity
      setRecentActivity([
        {
          id: '1',
          type: 'task',
          title: 'Task completed',
          description: 'Implement user authentication system',
          time: '2 hours ago',
          user: { name: 'John Doe' }
        },
        {
          id: '2', 
          type: 'sprint',
          title: 'Sprint started',
          description: 'Q1 Development Sprint',
          time: '1 day ago',
          user: { name: 'Jane Smith' }
        },
        {
          id: '3',
          type: 'project',
          title: 'Project created',
          description: projectsData[0]?.name || 'New Project',
          time: '3 days ago',
          user: { name: 'Team Lead' }
        }
      ])

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err)
      toast({
        title: "Error",
        description: `Failed to load dashboard data: ${err.message || 'Unknown error'}`
      })
    } finally {
      setIsLoading(false)
    }
  }

  const completionRate = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0

  if (!activeOrg) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Welcome to ScrumSan</h1>
          <p className="text-muted-foreground mb-6">
            You need to select or create an organization to get started.
          </p>
          <Button asChild>
            <Link href="/organizations">Manage Organizations</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-4"></div>
          <div className="h-4 bg-muted rounded w-96 mb-8"></div>
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
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back!</h1>
          <p className="text-muted-foreground">
            Here's what's happening with {activeOrg.name} today.
          </p>
        </div>
        
        <div className="flex gap-2">
          <ProjectForm onSuccess={fetchDashboardData} />
          <Button asChild variant="outline">
            <Link href="/projects">
              <FolderOpen className="h-4 w-4 mr-2" />
              View All Projects
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Projects</p>
                <p className="text-2xl font-bold">{stats.totalProjects}</p>
              </div>
              <FolderOpen className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Sprints</p>
                <p className="text-2xl font-bold">{stats.activeSprints}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold">{stats.totalTasks}</p>
              </div>
              <Activity className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold">{completionRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Projects */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Projects</CardTitle>
                <Button asChild variant="outline" size="sm">
                  <Link href="/projects">
                    View All
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
              <CardDescription>
                Your most recently updated projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No projects yet</p>
                  <ProjectForm onSuccess={fetchDashboardData} />
                </div>
              ) : (
                <div className="space-y-4">
                  {projects.map((project) => (
                    <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <h3 className="font-semibold">{project.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {project.description || 'No description'}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{project.memberCount || 0} members</span>
                          <span>{project.taskCount || 0} tasks</span>
                          <span>{project.sprintCount || 0} sprints</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/projects/${project.id}/board`}>
                            <Kanban className="h-4 w-4 mr-1" />
                            Board
                          </Link>
                        </Button>
                        <Button asChild size="sm">
                          <Link href={`/projects/${project.id}`}>
                            View
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest updates across your projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {activity.type === 'task' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                      {activity.type === 'sprint' && <Calendar className="h-5 w-5 text-blue-500" />}
                      {activity.type === 'project' && <FolderOpen className="h-5 w-5 text-purple-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                        {activity.user && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <p className="text-xs text-muted-foreground">{activity.user.name}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full justify-start">
                <Link href="/projects">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Create Project
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/projects">
                  <Activity className="h-4 w-4 mr-2" />
                  View All Tasks
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/organizations">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Team
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Progress Overview */}
      {stats.totalTasks > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Overall Progress</CardTitle>
            <CardDescription>
              Your organization's task completion progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {stats.completedTasks} of {stats.totalTasks} tasks completed
                </span>
                <span className="font-medium">{completionRate}%</span>
              </div>
              <Progress value={completionRate} className="h-3" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}