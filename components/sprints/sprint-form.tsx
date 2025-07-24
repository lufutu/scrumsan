"use client"

import { useState, useEffect } from 'react'
import { useSupabase } from '@/providers/supabase-provider'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Loader2, Calendar, Edit } from 'lucide-react'
import { Tables } from '@/types/database'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/animate-ui/radix/tabs'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type Sprint = Tables<'sprints'>
type Task = Tables<'tasks'> & {
  assignee?: {
    full_name: string | null
  } | null
}

interface SprintFormProps {
  projectId: string
  sprint?: Tables<'sprints'> & {
    status?: string
    duration_days?: number
    planned_points?: number
    completed_points?: number
  }
  onSuccess?: () => void
}

export default function SprintForm({ projectId, sprint, onSuccess }: SprintFormProps) {
  const { supabase, user } = useSupabase()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [availableTasks, setAvailableTasks] = useState<Task[]>([])
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [formData, setFormData] = useState({
    name: sprint?.name || '',
    goal: sprint?.goal || '',
    start_date: sprint?.start_date || '',
    end_date: sprint?.end_date || '',
    status: sprint?.status || 'planning',
    duration_days: sprint?.duration_days || 14
  })

  useEffect(() => {
    if (open) {
      fetchAvailableTasks()
      if (sprint) {
        fetchSprintTasks()
      }
    }
  }, [open, projectId, sprint])

  const fetchAvailableTasks = async () => {
    try {
      // Validate projectId before making queries
      if (!projectId || projectId === "" || typeof projectId !== 'string') {
        console.warn('Invalid or missing projectId:', projectId)
        setAvailableTasks([])
        return
      }
      
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:users!assignee_id (
            full_name
          )
        `)
        .eq('project_id', projectId)
        .or('status.eq.todo,status.eq.in_progress')
        .order('created_at', { ascending: false })

      if (error) throw error

      setAvailableTasks(data || [])
    } catch (err: any) {
      console.error('Error fetching tasks:', err)
    }
  }

  const fetchSprintTasks = async () => {
    if (!sprint) return

    try {
      // Validate projectId before making queries  
      if (!projectId || projectId === "" || typeof projectId !== 'string') {
        console.warn('Invalid or missing projectId:', projectId)
        setSelectedTasks([])
        return
      }

      const { data, error } = await supabase
        .from('sprint_tasks')
        .select('task_id')
        .eq('sprint_id', sprint.id)

      if (error) throw error

      setSelectedTasks(data?.map(st => st.task_id).filter((id): id is string => Boolean(id)) || [])
    } catch (err: any) {
      console.error('Error fetching sprint tasks:', err)
    }
  }

  const calculateDuration = () => {
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date)
      const end = new Date(formData.end_date)
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      setFormData(prev => ({ ...prev, duration_days: diffDays }))
    }
  }

  const calculatePlannedPoints = () => {
    return selectedTasks.reduce((total, taskId) => {
      const task = availableTasks.find(t => t.id === taskId)
      return total + ((task as any)?.story_points || 0)
    }, 0)
  }

  const handleDateChange = (field: 'start_date' | 'end_date', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Auto-calculate duration when both dates are set
    if (field === 'start_date' || field === 'end_date') {
      setTimeout(calculateDuration, 0)
    }
  }

  const canStartSprint = () => {
    const now = new Date()
    const startDate = new Date(formData.start_date)
    return formData.status === 'planning' && startDate <= now && selectedTasks.length > 0
  }

  const canCompleteSprint = () => {
    return formData.status === 'active'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate inputs
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in"
      })
      return
    }

    if (!projectId || projectId === "" || typeof projectId !== 'string') {
      toast({
        title: "Error",
        description: "Invalid project ID"
      })
      return
    }

    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Sprint name is required"
      })
      return
    }

    if (!formData.start_date || !formData.end_date) {
      toast({
        title: "Error",
        description: "Start date and end date are required"
      })
      return
    }

    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
      toast({
        title: "Error",
        description: "End date must be after start date"
      })
      return
    }

    setIsLoading(true)

    try {
      const plannedPoints = calculatePlannedPoints()
      const sprintData = {
        name: formData.name.trim(),
        goal: formData.goal.trim() || null,
        start_date: formData.start_date,
        end_date: formData.end_date,
        project_id: projectId,
        status: formData.status,
        duration_days: formData.duration_days,
        planned_points: plannedPoints,
        completed_points: sprint?.completed_points || 0
      }

      let sprintId = sprint?.id

      if (sprint) {
        // Update existing sprint
        const { error: updateError } = await supabase
          .from('sprints')
          .update(sprintData)
          .eq('id', sprint.id)

        if (updateError) throw updateError
      } else {
        // Create new sprint
        const { data: newSprint, error: createError } = await supabase
          .from('sprints')
          .insert(sprintData)
          .select()
          .single()

        if (createError) throw createError
        sprintId = newSprint.id
      }

      // Handle task assignments
      if (sprintId) {
        // Remove existing task assignments for this sprint
        await supabase
          .from('sprint_tasks')
          .delete()
          .eq('sprint_id', sprintId)

        // Add selected tasks to sprint
        if (selectedTasks.length > 0) {
          const sprintTaskData = selectedTasks.map(taskId => ({
            sprint_id: sprintId,
            task_id: taskId
          }))

          const { error: sprintTaskError } = await supabase
            .from('sprint_tasks')
            .insert(sprintTaskData)

          if (sprintTaskError) throw sprintTaskError
        }
      }

      toast({
        title: "Success",
        description: sprint ? "Sprint updated successfully" : "Sprint created successfully"
      })

      setOpen(false)
      onSuccess?.()
      
    } catch (err: any) {
      console.error('Error saving sprint:', err)
      toast({
        title: "Error",
        description: "Failed to save sprint"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSprintAction = async (action: 'start' | 'complete') => {
    if (!sprint) return

    try {
      setIsLoading(true)

      const newStatus = action === 'start' ? 'active' : 'completed'
      const updateData: any = { status: newStatus }

      if (action === 'complete') {
        // Calculate completed points
        const completedPoints = selectedTasks.reduce((total, taskId) => {
          const task = availableTasks.find(t => t.id === taskId)
          return total + ((task as any)?.story_points || 0)
        }, 0)
        updateData.completed_points = completedPoints
      }

      const { error } = await supabase
        .from('sprints')
        .update(updateData)
        .eq('id', sprint.id)

      if (error) throw error

      toast({
        title: "Success",
        description: action === 'start' ? "Sprint started successfully" : "Sprint completed successfully"
      })

      setOpen(false)
      onSuccess?.()

    } catch (err: any) {
      console.error('Error updating sprint status:', err)
      toast({
        title: "Error",
        description: `Failed to ${action} sprint`
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {sprint ? (
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit Sprint
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Sprint
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {sprint ? 'Edit Sprint' : 'Create New Sprint'}
            {sprint && (
              <Badge className={cn("text-xs", getStatusColor(sprint.status || 'planning'))}>
                {sprint.status || 'planning'}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {sprint 
              ? 'Update sprint details and manage task assignments.'
              : 'Create a new sprint with goals, timeline, and task assignments.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Sprint Details</TabsTrigger>
              <TabsTrigger value="tasks">Task Planning</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Sprint Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter sprint name (e.g., Sprint 1, Feature Release)"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  disabled={isLoading}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="goal">Sprint Goal</Label>
                <Textarea
                  id="goal"
                  placeholder="What is the main objective for this sprint?"
                  value={formData.goal}
                  onChange={(e) => setFormData(prev => ({ ...prev, goal: e.target.value }))}
                  disabled={isLoading}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleDateChange('start_date', e.target.value)}
                    disabled={isLoading || (sprint?.status === 'active' || sprint?.status === 'completed')}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleDateChange('end_date', e.target.value)}
                    disabled={isLoading || sprint?.status === 'completed'}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="duration"
                      type="number"
                      value={formData.duration_days}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration_days: parseInt(e.target.value) || 0 }))}
                      disabled
                      className="bg-muted"
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                </div>
              </div>

              {formData.status !== 'planning' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Planned Points</Label>
                    <div className="p-2 bg-muted rounded border text-sm">
                      {calculatePlannedPoints()} story points
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Completed Points</Label>
                    <div className="p-2 bg-muted rounded border text-sm">
                      {sprint?.completed_points || 0} story points
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="tasks" className="space-y-4">
              <div className="space-y-2">
                <Label>Available Tasks ({availableTasks.length})</Label>
                <div className="max-h-64 overflow-y-auto border rounded-md p-2 space-y-2">
                  {availableTasks.map(task => (
                    <div
                      key={task.id}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded cursor-pointer border",
                        selectedTasks.includes(task.id) 
                          ? "bg-blue-50 border-blue-200" 
                          : "bg-white border-gray-200 hover:border-gray-300"
                      )}
                      onClick={() => {
                        if (formData.status !== 'completed') {
                          setSelectedTasks(prev => 
                            prev.includes(task.id)
                              ? prev.filter(id => id !== task.id)
                              : [...prev, task.id]
                          )
                        }
                      }}
                    >
                      <Checkbox 
                        checked={selectedTasks.includes(task.id)}
                        disabled={formData.status === 'completed'}
                        onChange={() => {}}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{task.title}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {(task as any)?.story_points > 0 && (
                            <span>{(task as any).story_points} SP</span>
                          )}
                          {task.assignee?.full_name && (
                            <span>• {task.assignee.full_name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {selectedTasks.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Selected: {selectedTasks.length} tasks • {calculatePlannedPoints()} story points
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex justify-between">
            <div className="flex gap-2">
              {sprint && canStartSprint() && (
                <Button 
                  type="button"
                  variant="default"
                  onClick={() => handleSprintAction('start')}
                  disabled={isLoading}
                >
                  Start Sprint
                </Button>
              )}
              
              {sprint && canCompleteSprint() && (
                <Button 
                  type="button"
                  variant="secondary"
                  onClick={() => handleSprintAction('complete')}
                  disabled={isLoading}
                >
                  Complete Sprint
                </Button>
              )}
            </div>

            <div className="flex gap-2">
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
                {sprint ? 'Update Sprint' : 'Create Sprint'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 