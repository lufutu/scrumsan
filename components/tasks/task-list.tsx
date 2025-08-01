"use client"

import { useEffect, useState } from 'react'
import { useSupabase } from '@/providers/supabase-provider'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { EnhancedAvatar } from '@/components/ui/enhanced-avatar'
import { Search, Filter, Calendar, User, AlertCircle } from 'lucide-react'
import TaskCreationDialog from '@/components/common/TaskCreationDialog'
import { Tables } from '@/types/database'

type Task = Tables<'tasks'> & {
  assignee: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
  created_by_user: {
    id: string
    full_name: string | null
  } | null
}

interface TaskListProps {
  projectId: string
}

export default function TaskList({ projectId }: TaskListProps) {
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState('all')

  const fetchTasksCallback = async () => {
    try {
      setIsLoading(true)
      
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:assigned_to (
            id,
            full_name,
            avatar_url
          ),
          created_by_user:created_by (
            id,
            full_name
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      setTasks(data || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
      toast({
        title: "Error",
        description: "Failed to load tasks"
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTasksCallback()
  }, [projectId, fetchTasksCallback])





  // Filter tasks based on search and filters
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === 'all' || task.task_type === typeFilter
    const matchesAssignee = assigneeFilter === 'all' || 
                           (assigneeFilter === 'unassigned' && !task.assignee_id) ||
                           task.assignee_id === assigneeFilter

    return matchesSearch && matchesType && matchesAssignee
  })

  // Get unique assignees for filter
  const uniqueAssignees = tasks.reduce((acc, task) => {
    if (task.assignee && !acc.find(a => a && a.id === task.assignee!.id)) {
      acc.push(task.assignee)
    }
    return acc
  }, [] as Task['assignee'][])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
          <CardDescription>Loading tasks...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 border rounded-lg animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2 mb-3"></div>
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
            <CardTitle>Tasks ({filteredTasks.length})</CardTitle>
            <CardDescription>
              Manage and track tasks for this project
            </CardDescription>
          </div>
          <TaskCreationDialog projectId={projectId} onSuccess={fetchTasks} />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="story">Story</SelectItem>
              <SelectItem value="bug">Bug</SelectItem>
              <SelectItem value="task">Task</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-40">
              <User className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {uniqueAssignees.map(assignee => assignee && (
                <SelectItem key={assignee.id} value={assignee.id}>
                  {assignee.full_name || 'Unknown User'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Task List */}
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {tasks.length === 0 
              ? "No tasks found. Create your first task to get started."
              : "No tasks match your current filters."
            }
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <div key={task.id} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-lg mb-1">{task.title}</h3>
                    {task.description && (
                      <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                  </div>
                  
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {task.task_type || 'task'}
                    </Badge>
                    
                    {task.due_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Due {new Date(task.due_date).toLocaleDateString()}
                      </div>
                    )}
                    
                    <div>
                      Created by {task.created_by_user?.full_name || 'Unknown'}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {task.assignee ? (
                      <div className="flex items-center gap-2">
                        <EnhancedAvatar
                          src={task.assignee.avatar_url}
                          fallbackSeed={task.assignee.full_name || 'user'}
                          size="sm"
                          className="h-6 w-6"
                          alt={task.assignee.full_name || 'Unknown'}
                        />
                        <span className="text-sm text-muted-foreground">
                          {task.assignee.full_name || 'Unknown'}
                        </span>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Unassigned
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 