"use client"

import { useState, useEffect } from 'react'
import { useSupabase } from '@/providers/supabase-provider'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Loader2, Tag, User, Calendar, Target, AlertCircle } from 'lucide-react'
import { Tables } from '@/types/database'

type Task = Tables<'tasks'> & {
  story_points?: number
  priority?: string
  labels?: string[]
  position?: number
}

type ProjectMember = {
  id: string
  user_id: string | null
  users: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
}

type TaskLabel = {
  id: string
  name: string
  color: string
  board_id: string
}

interface EnhancedTaskFormProps {
  projectId?: string
  organizationId?: string
  boardId?: string
  task?: Task
  onSuccess?: () => void
  defaultSprint?: string
}

export default function EnhancedTaskForm({ 
  projectId, 
  organizationId, 
  boardId, 
  task, 
  onSuccess,
  defaultSprint 
}: EnhancedTaskFormProps) {
  const { supabase, user } = useSupabase()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([])
  const [boardLabels, setBoardLabels] = useState<TaskLabel[]>([])
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    assignee_id: task?.assignee_id || 'unassigned',
    due_date: task?.due_date ? new Date(task.due_date) : undefined,
    story_points: task?.story_points || 0,
    priority: task?.priority || 'medium',
    labels: task?.labels || []
  })

  useEffect(() => {
    if (open) {
      if (projectId) fetchProjectMembers()
      if (boardId) fetchBoardLabels()
    }
  }, [open, projectId, boardId])

  const fetchProjectMembers = async () => {
    if (!projectId) return
    
    try {
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          id,
          user_id,
          users (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('project_id', projectId)

      if (error) throw error
      setProjectMembers(data || [])
    } catch (err: unknown) {
      console.error('Error fetching project members:', err)
    }
  }

  const fetchBoardLabels = async () => {
    if (!boardId) return
    
    try {
      const { data, error } = await supabase
        .from('task_labels')
        .select('*')
        .eq('board_id', boardId)
        .order('name')

      if (error) throw error
      setBoardLabels(data || [])
    } catch (err: unknown) {
      console.error('Error fetching board labels:', err)
    }
  }

  const createLabel = async (name: string, color: string = '#3B82F6') => {
    if (!boardId) return null

    try {
      const { data, error } = await supabase
        .from('task_labels')
        .insert({
          name: name.trim(),
          color,
          board_id: boardId
        })
        .select()
        .single()

      if (error) throw error
      
      setBoardLabels(prev => [...prev, data])
      return data
    } catch (err: unknown) {
      console.error('Error creating label:', err)
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in"
      })
      return
    }

    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Task title is required"
      })
      return
    }

    setIsLoading(true)

    try {
      const taskData: any = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        status: formData.status,
        assignee_id: formData.assignee_id === 'unassigned' ? null : formData.assignee_id,
        due_date: formData.due_date ? formData.due_date.toISOString().split('T')[0] : null,
        story_points: formData.story_points,
        priority: formData.priority,
        labels: formData.labels
      }

      if (projectId) taskData.project_id = projectId

      if (task) {
        // Update existing task
        const { error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', task.id)

        if (error) throw error

        toast({
          title: "Success",
          description: "Task updated successfully"
        })
      } else {
        // Create new task
        let targetBoardId = boardId
        let columnId = null

        if (!targetBoardId) {
          // Get or create board
          let query = supabase
            .from('boards')
            .select(`
              id,
              board_columns (
                id,
                name,
                position
              )
            `)

          if (projectId) {
            query = query.eq('project_id', projectId)
          } else if (organizationId) {
            query = query.eq('organization_id', organizationId)
          }

          let { data: boardData, error: boardError } = await query.single()

          if (boardError && boardError.code === 'PGRST116') {
            // Create board if doesn't exist
            const boardInsertData: any = {
              name: 'Scrum Board',
              board_type: 'scrum'
            }
            
            if (projectId) {
              boardInsertData.project_id = projectId
            } else if (organizationId) {
              boardInsertData.organization_id = organizationId
            }

            const { data: newBoard, error: createError } = await supabase
              .from('boards')
              .insert(boardInsertData)
              .select()
              .single()

            if (createError) throw createError

            // Create default scrum columns
            const defaultColumns = [
              { name: 'Product Backlog', position: 0 },
              { name: 'Sprint Backlog', position: 1 },
              { name: 'In Progress', position: 2 },
              { name: 'Testing', position: 3 },
              { name: 'Done', position: 4 }
            ]

            const { data: columnsData, error: columnsError } = await supabase
              .from('board_columns')
              .insert(defaultColumns.map(col => ({
                ...col,
                board_id: newBoard.id
              })))
              .select()

            if (columnsError) throw columnsError

            targetBoardId = newBoard.id
            columnId = columnsData[0]?.id // Default to Product Backlog
          } else if (boardError) {
            throw boardError
          } else if (boardData) {
            targetBoardId = boardData.id
            // Find backlog column or first column
            const backlogColumn = boardData.board_columns.find(col => 
              col.name.toLowerCase().includes('backlog')
            )
            columnId = backlogColumn?.id || boardData.board_columns[0]?.id
          }
        } else {
          // Get column for existing board
          const { data: columnsData, error: columnsError } = await supabase
            .from('board_columns')
            .select('*')
            .eq('board_id', targetBoardId)
            .order('position')

          if (columnsError) throw columnsError

          const backlogColumn = columnsData?.find(col => 
            col.name.toLowerCase().includes('backlog')
          )
          columnId = backlogColumn?.id || columnsData?.[0]?.id
        }

        const { error } = await supabase
          .from('tasks')
          .insert({
            ...taskData,
            board_id: targetBoardId,
            column_id: columnId,
            created_by: user.id,
            position: 0
          })

        if (error) throw error

        toast({
          title: "Success", 
          description: "Task created successfully"
        })
      }

      setOpen(false)
      setFormData({
        title: '',
        description: '',
        status: 'todo',
        assignee_id: 'unassigned',
        due_date: undefined,
        story_points: 0,
        priority: 'medium',
        labels: []
      })
      onSuccess?.()
      
    } catch (err: unknown) {
      console.error('Error saving task:', err)
      toast({
        title: "Error",
        description: "Failed to save task"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLabelToggle = (labelName: string) => {
    setFormData(prev => ({
      ...prev,
      labels: prev.labels.includes(labelName)
        ? prev.labels.filter(l => l !== labelName)
        : [...prev.labels, labelName]
    }))
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertCircle className="h-3 w-3 text-red-500" />
      case 'high': return <AlertCircle className="h-3 w-3 text-orange-500" />
      case 'medium': return <AlertCircle className="h-3 w-3 text-yellow-500" />
      case 'low': return <AlertCircle className="h-3 w-3 text-green-500" />
      default: return <AlertCircle className="h-3 w-3 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-red-500 bg-red-50'
      case 'high': return 'border-orange-500 bg-orange-50'
      case 'medium': return 'border-yellow-500 bg-yellow-50'
      case 'low': return 'border-green-500 bg-green-50'
      default: return 'border-gray-300 bg-gray-50'
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {task ? (
          <Button variant="outline" size="sm">
            Edit Task
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {task ? 'Edit Task' : 'Create New Task'}
          </DialogTitle>
          <DialogDescription>
            {task 
              ? 'Update the task details and settings.'
              : 'Create a new task with story points, priority, and labels for better project management.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="planning">Planning</TabsTrigger>
              <TabsTrigger value="labels">Labels</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Task Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter task title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  disabled={isLoading}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the task requirements and acceptance criteria"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  disabled={isLoading}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assignee">Assignee</Label>
                  <Select 
                    value={formData.assignee_id} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, assignee_id: value }))}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Unassigned
                        </div>
                      </SelectItem>
                      {projectMembers.map(member => member.users && member.user_id && (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {member.users.full_name || 'Unknown User'}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date ? formData.due_date.toISOString().split('T')[0] : ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      due_date: e.target.value ? new Date(e.target.value) : undefined 
                    }))}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="planning" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="story_points">Story Points</Label>
                  <Select 
                    value={formData.story_points.toString()} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, story_points: parseInt(value) }))}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 - Not estimated</SelectItem>
                      <SelectItem value="1">1 - Very Small</SelectItem>
                      <SelectItem value="2">2 - Small</SelectItem>
                      <SelectItem value="3">3 - Medium</SelectItem>
                      <SelectItem value="5">5 - Large</SelectItem>
                      <SelectItem value="8">8 - Very Large</SelectItem>
                      <SelectItem value="13">13 - Extra Large</SelectItem>
                      <SelectItem value="21">21 - Huge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                    disabled={isLoading}
                  >
                    <SelectTrigger className={getPriorityColor(formData.priority)}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">
                        <div className="flex items-center gap-2">
                          {getPriorityIcon('low')}
                          Low Priority
                        </div>
                      </SelectItem>
                      <SelectItem value="medium">
                        <div className="flex items-center gap-2">
                          {getPriorityIcon('medium')}
                          Medium Priority
                        </div>
                      </SelectItem>
                      <SelectItem value="high">
                        <div className="flex items-center gap-2">
                          {getPriorityIcon('high')}
                          High Priority
                        </div>
                      </SelectItem>
                      <SelectItem value="critical">
                        <div className="flex items-center gap-2">
                          {getPriorityIcon('critical')}
                          Critical Priority
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="labels" className="space-y-4">
              <div className="space-y-2">
                <Label>Task Labels</Label>
                <div className="flex flex-wrap gap-2 min-h-12 p-2 border rounded-md">
                  {boardLabels.map(label => (
                    <Badge
                      key={label.id}
                      variant={formData.labels.includes(label.name) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-opacity-80"
                      style={{
                        backgroundColor: formData.labels.includes(label.name) ? label.color : 'transparent',
                        borderColor: label.color,
                        color: formData.labels.includes(label.name) ? 'white' : label.color
                      }}
                      onClick={() => handleLabelToggle(label.name)}
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {label.name}
                    </Badge>
                  ))}
                  {boardLabels.length === 0 && (
                    <div className="text-sm text-muted-foreground">No labels available. Create labels in board settings.</div>
                  )}
                </div>
                {formData.labels.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Selected: {formData.labels.join(', ')}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {task ? 'Update Task' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 