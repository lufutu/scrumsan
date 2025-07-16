"use client"

import { use, useEffect, useState } from 'react'
import { useSupabase } from '@/providers/supabase-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar, Users, Activity, BarChart3, Settings, Kanban } from 'lucide-react'
import Link from 'next/link'
import { Tables } from '@/types/database'
import ProjectForm from '@/components/projects/project-form'

type Project = Tables<'projects'> & {
  created_by_user?: {
    full_name: string | null
  } | null
  project_members: { count: number }[]
  tasks: { count: number }[]
  sprints: { count: number }[]
  organization?: {
    name: string
  } | null
}

export default function ProjectDetailsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { supabase } = useSupabase()
  const { projectId } = use(params)
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const { data, error } = await supabase
          .from('projects')
          .select(`
            *,
            created_by_user:users!created_by(full_name),
            project_members(count),
            tasks(count),
            sprints(count),
            organization:organizations(name)
          `)
          .eq('id', projectId)
          .single()

        if (error) throw error

        setProject(data)
      } catch (err: any) {
        console.error('Error fetching project:', err)
        setError('Failed to load project details')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProject()
  }, [supabase, projectId])

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-6 w-8" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="flex gap-4 flex-wrap">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-24" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-destructive mb-2">
              {error || 'Project not found'}
            </div>
            <Button asChild variant="outline">
              <Link href="/projects">Back to Projects</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = [
    {
      label: 'Team Members',
      value: project.project_members?.[0]?.count || 0,
      icon: Users
    },
    {
      label: 'Total Tasks',
      value: project.tasks?.[0]?.count || 0,
      icon: Activity
    },
    {
      label: 'Active Sprints',
      value: project.sprints?.[0]?.count || 0,
      icon: Calendar
    },
    {
      label: 'Completion',
      value: '0%', // TODO: Calculate from tasks
      icon: BarChart3
    }
  ]

  const navigationLinks = [
    {
      href: `/projects/${project.id}/board`,
      label: 'Kanban Board',
      icon: Kanban,
      variant: 'default' as const
    },
    {
      href: `/projects/${project.id}/sprints`,
      label: 'Sprints',
      icon: Calendar,
      variant: 'outline' as const
    },
    {
      href: `/projects/${project.id}/tasks`,
      label: 'Tasks',
      icon: Activity,
      variant: 'outline' as const
    },
    {
      href: `/projects/${project.id}/analytics`,
      label: 'Analytics',
      icon: BarChart3,
      variant: 'outline' as const
    },
    {
      href: `/projects/${project.id}/settings`,
      label: 'Settings',
      icon: Settings,
      variant: 'outline' as const
    }
  ]

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Project Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <Badge variant="secondary">Active</Badge>
          </div>
          
          {project.description && (
            <p className="text-muted-foreground text-lg mb-2">
              {project.description}
            </p>
          )}
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              Organization: <strong>{project.organization?.name || 'Unknown'}</strong>
            </span>
            {project.created_by_user?.full_name && (
              <span>
                Created by: <strong>{project.created_by_user.full_name}</strong>
              </span>
            )}
            <span>
              Created: <strong>{new Date(project.created_at || '').toLocaleDateString()}</strong>
            </span>
          </div>
        </div>
        
        <ProjectForm project={project} />
      </div>

      {/* Project Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <stat.icon className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Navigation Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Navigate to different sections of your project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            {navigationLinks.map((link) => (
              <Button
                key={link.href}
                asChild
                variant={link.variant}
                className="flex items-center gap-2"
              >
                <Link href={link.href}>
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest updates and changes in this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Activity feed coming soon...
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 