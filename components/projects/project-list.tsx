"use client"

import { useEffect, useState } from 'react'
import { useSupabase } from '@/providers/supabase-provider'
import { useActiveOrg } from '@/hooks/useActiveOrg'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Users, Activity } from 'lucide-react'
import Link from 'next/link'
import { Tables } from '@/types/database'

type Project = Tables<'projects'> & {
  project_members: { count: number }[]
  _count?: {
    tasks: number
    sprints: number
  }
}

export default function ProjectList() {
  const { supabase } = useSupabase()
  const activeOrg = useActiveOrg()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!activeOrg?.id) return

    const fetchProjects = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const { data, error } = await supabase
          .from('projects')
          .select(`
            *,
            project_members!inner(count),
            tasks(count),
            sprints(count)
          `)
          .eq('organization_id', activeOrg.id)
          .order('created_at', { ascending: false })

        if (error) throw error

        setProjects(data || [])
      } catch (err: any) {
        console.error('Error fetching projects:', err)
        setError('Failed to load projects')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProjects()
  }, [supabase, activeOrg?.id])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="h-4 bg-muted rounded w-20"></div>
                <div className="h-4 bg-muted rounded w-20"></div>
                <div className="h-4 bg-muted rounded w-20"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-destructive">{error}</div>
          <Button 
            variant="outline" 
            className="mt-2"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-muted-foreground">
            No projects found. Create your first project to get started.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {projects.map((project) => (
        <Card key={project.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">
                  <Link 
                    href={`/projects/${project.id}`}
                    className="hover:text-primary transition-colors"
                  >
                    {project.name}
                  </Link>
                </CardTitle>
                {project.description && (
                  <CardDescription className="mt-1">
                    {project.description}
                  </CardDescription>
                )}
              </div>
              <Badge variant="secondary">Active</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{project.project_members?.[0]?.count || 0} members</span>
              </div>
              <div className="flex items-center gap-1">
                <Activity className="h-4 w-4" />
                <span>{project._count?.tasks || 0} tasks</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{project._count?.sprints || 0} sprints</span>
              </div>
      </div>
            
            <div className="flex gap-2 mt-4">
              <Button asChild size="sm">
                <Link href={`/projects/${project.id}/board`}>
                  View Board
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/projects/${project.id}`}>
                  Details
                </Link>
              </Button>
      </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 