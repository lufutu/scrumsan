"use client"

import { useEffect, useState } from 'react'
import { useSupabase } from '@/providers/supabase-provider'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
// Progress component placeholder - create a simple one
const Progress = ({ value, className }: { value: number; className?: string }) => (
  <div className={`w-full bg-muted rounded-full h-2 ${className}`}>
    <div 
      className="bg-primary h-2 rounded-full transition-all" 
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
)
import { Calendar, Play, Pause, CheckCircle2, Plus } from 'lucide-react'
import SprintForm from '@/components/sprints/sprint-form'
import { Tables } from '@/types/database'

type Sprint = Tables<'sprints'> & {
  sprint_tasks?: Array<{
    task_id: string | null
    tasks: {
      id: string
      title: string
      status: string | null
    } | null
  }>
  _count?: {
    tasks: number
    completed_tasks: number
  }
}

interface SprintListProps {
  projectId: string
}

export default function SprintList({ projectId }: SprintListProps) {
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchSprints()
  }, [projectId])

  const fetchSprints = async () => {
    try {
      setIsLoading(true)
      
      const { data: sprintsData, error } = await supabase
        .from('sprints')
        .select(`
          *,
          sprint_tasks (
            task_id,
            tasks (
              id,
              title,
              status
            )
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) throw error

             // Transform data to include task counts
       const transformedSprints = (sprintsData || []).map(sprint => {
         const tasks = sprint.sprint_tasks?.map(st => st.tasks).filter(Boolean) || []
         const completedTasks = tasks.filter(task => task?.status === 'done')
         
         return {
           ...sprint,
           _count: {
             tasks: tasks.length,
             completed_tasks: completedTasks.length
           }
         }
       })

      setSprints(transformedSprints)
    } catch (err: any) {
      console.error('Error fetching sprints:', err)
      toast({
        title: "Error",
        description: "Failed to load sprints"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getSprintStatus = (sprint: Sprint) => {
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

  const getProgressPercentage = (sprint: Sprint) => {
    if (!sprint._count?.tasks || sprint._count.tasks === 0) return 0
    return Math.round((sprint._count.completed_tasks / sprint._count.tasks) * 100)
  }

  const getSprintIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="h-4 w-4" />
      case 'completed': return <CheckCircle2 className="h-4 w-4" />
      case 'upcoming': return <Calendar className="h-4 w-4" />
      default: return <Pause className="h-4 w-4" />
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sprints</CardTitle>
          <CardDescription>Loading sprints...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 border rounded-lg animate-pulse">
                <div className="h-5 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/4 mb-3"></div>
                <div className="h-2 bg-muted rounded w-full mb-2"></div>
                <div className="flex gap-2">
                  <div className="h-6 bg-muted rounded w-16"></div>
                  <div className="h-6 bg-muted rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sprints ({sprints.length})</CardTitle>
            <CardDescription>
              Plan and track sprints for this project
            </CardDescription>
          </div>
          <SprintForm projectId={projectId} onSuccess={fetchSprints} />
        </div>
      </CardHeader>
      
      <CardContent>
        {sprints.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No sprints found. Create your first sprint to start planning.
          </div>
        ) : (
          <div className="space-y-4">
            {sprints.map((sprint) => {
              const sprintStatus = getSprintStatus(sprint)
              const progress = getProgressPercentage(sprint)
              
              return (
                <div key={sprint.id} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{sprint.name}</h3>
                        <Badge variant={sprintStatus.color as any} className="flex items-center gap-1">
                          {getSprintIcon(sprintStatus.status)}
                          {sprintStatus.label}
                        </Badge>
                      </div>
                      
                      {sprint.goal && (
                        <p className="text-muted-foreground text-sm mb-3">
                          <strong>Goal:</strong> {sprint.goal}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <SprintForm sprint={sprint} projectId={projectId} onSuccess={fetchSprints} />
                    </div>
                  </div>

                  {/* Sprint dates */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
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
                  </div>

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Progress: {sprint._count?.completed_tasks || 0} of {sprint._count?.tasks || 0} tasks completed
                      </span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  {/* Task breakdown */}
                  {sprint._count?.tasks && sprint._count.tasks > 0 && (
                    <div className="flex gap-4 text-xs text-muted-foreground mt-3 pt-3 border-t">
                      <span>Total: {sprint._count.tasks}</span>
                      <span>Completed: {sprint._count.completed_tasks}</span>
                      <span>Remaining: {sprint._count.tasks - sprint._count.completed_tasks}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 