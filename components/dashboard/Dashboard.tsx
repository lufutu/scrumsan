"use client"

import { useEffect, useState } from 'react'
import { useActiveOrg } from '@/hooks/useActiveOrg'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { OrganizationEmptyState } from '@/components/ui/empty-state'

import {
  TrendingUp,
  Calendar,
  Activity,
  CheckCircle2,
  Users,
  FolderOpen,
  Kanban,
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

// Helper function to get relative time
const getRelativeTime = (date: Date): string => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  return 'Just now'
}

export default function Dashboard() {
  const activeOrg = useActiveOrg()
  const { toast } = useToast()
  const router = useRouter()
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

      // Fetch projects using our Prisma API
      // Ensure we use the UUID, not slug
      const orgId = activeOrg.id
      console.log('Dashboard: Using activeOrg.id for API call:', orgId)
      const projectsResponse = await fetch(`/api/organizations/${orgId}/projects?limit=6`)
      if (!projectsResponse.ok) {
        throw new Error('Failed to fetch projects')
      }

      const projectsData = await projectsResponse.json()

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

      // Get all projects for stats
      const allProjectsResponse = await fetch(`/api/organizations/${activeOrg.id}/projects`)
      const allProjects = allProjectsResponse.ok ? await allProjectsResponse.json() : []
      const projectIds = allProjects.map((p: any) => p.id)

      // Enhance projects with counts by calling individual project APIs
      const enhancedProjects = await Promise.all(
        projectsData.map(async (project: any) => {
          try {
            // Get project members count
            const membersResponse = await fetch(`/api/projects/${project.id}/members`)
            const members = membersResponse.ok ? await membersResponse.json() : []

            // Get project tasks count  
            const tasksResponse = await fetch(`/api/projects/${project.id}/tasks`)
            const tasks = tasksResponse.ok ? await tasksResponse.json() : []

            // Get project sprints count
            const sprintsResponse = await fetch(`/api/projects/${project.id}/sprints`)
            const sprints = sprintsResponse.ok ? await sprintsResponse.json() : []

            return {
              ...project,
              memberCount: members.length || 0,
              taskCount: tasks.length || 0,
              sprintCount: sprints.length || 0
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
        let totalTasks = 0
        let completedTasks = 0
        let activeSprints = 0

        // Aggregate stats from all projects
        await Promise.all(
          projectIds.map(async (projectId: string) => {
            try {
              // Get tasks for this project
              const tasksResponse = await fetch(`/api/projects/${projectId}/tasks`)
              if (tasksResponse.ok) {
                const tasks = await tasksResponse.json()
                totalTasks += tasks.length
                // Count completed tasks - check both board columns and sprint columns
                completedTasks += tasks.filter((task: any) => {
                  // Check if task is in a "done" board column
                  if (task.column?.name?.toLowerCase().includes('done')) return true;
                  // Check if task is in a "done" sprint column
                  if (task.sprintColumn?.isDone === true) return true;
                  // Check if task is in a sprint column named "done"
                  if (task.sprintColumn?.name?.toLowerCase().includes('done')) return true;
                  return false;
                }).length
              }

              // Get active sprints for this project
              const sprintsResponse = await fetch(`/api/projects/${projectId}/sprints`)
              if (sprintsResponse.ok) {
                const sprints = await sprintsResponse.json()
                // Count sprints that are active
                activeSprints += sprints.filter((sprint: any) =>
                  sprint.status === 'active' && !sprint.isDeleted && !sprint.isFinished
                ).length
              }
            } catch (err) {
              console.error('Error getting stats for project:', projectId, err)
            }
          })
        )

        setStats({
          totalProjects: allProjects.length || 0,
          activeSprints,
          totalTasks,
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

      // Get recent activity - for now, we'll show basic project activity
      const recentActivityItems: RecentActivity[] = []

      // Add recently created projects to activity
      projectsData.slice(0, 3).forEach((project: any, index: number) => {
        if (project.createdAt) {
          recentActivityItems.push({
            id: `project-${project.id}`,
            type: 'project',
            title: 'Project created',
            description: project.name,
            time: getRelativeTime(new Date(project.createdAt)),
            user: project.creator ? {
              name: project.creator.fullName || project.creator.email || 'Unknown'
            } : undefined
          })
        }
      })

      // Add active sprints to activity
      if (projectIds.length > 0) {
        for (const projectId of projectIds.slice(0, 2)) {
          const sprintsResponse = await fetch(`/api/projects/${projectId}/sprints`)
          if (sprintsResponse.ok) {
            const sprints = await sprintsResponse.json()
            const activeSprint = sprints.find((s: any) => s.status === 'active')
            if (activeSprint) {
              recentActivityItems.push({
                id: `sprint-${activeSprint.id}`,
                type: 'sprint',
                title: 'Sprint active',
                description: activeSprint.name,
                time: activeSprint.startDate ? getRelativeTime(new Date(activeSprint.startDate)) : 'Recently',
                user: { name: 'Team' }
              })
              break; // Only show one active sprint
            }
          }
        }
      }

      // Sort by most recent first
      setRecentActivity(recentActivityItems.length > 0 ? recentActivityItems : [
        {
          id: 'welcome',
          type: 'project',
          title: 'Welcome to ScrumSan!',
          description: 'Your activity will appear here',
          time: 'Just now',
          user: { name: 'System' }
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
      <OrganizationEmptyState
        onCreateOrg={() => router.push('/organizations')}
        className="min-h-[60vh]"
      />
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Projects Loading */}
          <div className="lg:col-span-2">
            <Card className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-48 mb-2"></div>
                <div className="h-4 bg-muted rounded w-64"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1 space-y-2">
                        <div className="h-5 bg-muted rounded w-32"></div>
                        <div className="h-4 bg-muted rounded w-48"></div>
                        <div className="flex items-center gap-4">
                          <div className="h-3 bg-muted rounded w-16"></div>
                          <div className="h-3 bg-muted rounded w-12"></div>
                          <div className="h-3 bg-muted rounded w-14"></div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-8 bg-muted rounded w-16"></div>
                        <div className="h-8 bg-muted rounded w-12"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Loading */}
          <div>
            <Card className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-32 mb-2"></div>
                <div className="h-4 bg-muted rounded w-48"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="h-5 w-5 bg-muted rounded-full flex-shrink-0"></div>
                      <div className="flex-1 space-y-1">
                        <div className="h-4 bg-muted rounded w-24"></div>
                        <div className="h-3 bg-muted rounded w-32"></div>
                        <div className="h-3 bg-muted rounded w-16"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
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