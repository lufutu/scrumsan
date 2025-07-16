"use client"

import { useState, useEffect } from 'react'
import { useSupabase } from '@/providers/supabase-provider'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calendar, 
  Play, 
  Square, 
  CheckCircle2, 
  Plus, 
  BarChart3, 
  Target, 
  Users, 
  Clock,
  TrendingUp,
  Filter,
  Download,
  Settings,
  ChevronRight,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tables } from '@/types/database'

// Chart component (simple implementation)
const SimpleChart = ({ data, className }: { data: any[]; className?: string }) => (
  <div className={cn("h-64 flex items-end justify-center gap-1 border rounded p-4", className)}>
    {data.map((item, index) => (
      <div
        key={index}
        className="bg-teal-600 rounded-t w-8 transition-all hover:bg-teal-700"
        style={{ height: `${Math.max(item.value * 100, 5)}%` }}
        title={`${item.label}: ${item.value}`}
      />
    ))}
  </div>
)

type Sprint = Tables<'sprints'> & {
  project?: {
    id: string
    name: string
  }
  _count?: {
    total_tasks: number
    completed_tasks: number
    in_progress_tasks: number
    story_points: number
  }
  tasks?: Array<Tables<'tasks'>>
}

interface VivifySprintDashboardProps {
  projectId: string
}

export default function VivifySprintDashboard({ projectId }: VivifySprintDashboardProps) {
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedSprintId, setSelectedSprintId] = useState<string>('')
  const [burndownData, setBurndownData] = useState<any[]>([])
  
  // Create Sprint Form State
  const [createForm, setCreateForm] = useState({
    name: '',
    goal: '',
    start_date: '',
    end_date: '',
    duration_days: 14
  })

  useEffect(() => {
    fetchSprints()
  }, [projectId])

  useEffect(() => {
    if (activeSprint) {
      generateBurndownData(activeSprint)
    }
  }, [activeSprint])

  const fetchSprints = async () => {
    try {
      setIsLoading(true)
      
      const { data: sprintsData, error } = await supabase
        .from('sprints')
        .select(`
          *,
          project:projects(id, name),
          sprint_tasks(
            task_id,
            tasks(
              id,
              title,
              status,
              story_points,
              estimated_hours
            )
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform data with task counts
      const transformedSprints = (sprintsData || []).map(sprint => {
        const tasks = sprint.sprint_tasks?.map(st => st.tasks).filter(Boolean) || []
        const completedTasks = tasks.filter(task => task?.status === 'done')
        const inProgressTasks = tasks.filter(task => task?.status === 'in_progress')
        const totalStoryPoints = tasks.reduce((sum, task) => sum + (task?.story_points || 0), 0)
        
        return {
          ...sprint,
          _count: {
            total_tasks: tasks.length,
            completed_tasks: completedTasks.length,
            in_progress_tasks: inProgressTasks.length,
            story_points: totalStoryPoints
          },
          tasks
        }
      })

      setSprints(transformedSprints)
      
      // Set active sprint (first active one or most recent)
      const activeSprintFound = transformedSprints.find(s => s.status === 'active')
      setActiveSprint(activeSprintFound || transformedSprints[0] || null)
      
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

  const generateBurndownData = (sprint: Sprint) => {
    if (!sprint.start_date || !sprint.end_date || !sprint.tasks) return

    const startDate = new Date(sprint.start_date)
    const endDate = new Date(sprint.end_date)
    const totalPoints = sprint._count?.story_points || 0
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    
    const data = []
    for (let i = 0; i <= daysDiff; i++) {
      const currentDate = new Date(startDate)
      currentDate.setDate(startDate.getDate() + i)
      
      // Simulate burndown (in real app, use actual completion data)
      const idealRemaining = Math.max(0, totalPoints - (totalPoints * i / daysDiff))
      const actualRemaining = Math.max(0, totalPoints - (totalPoints * i / daysDiff) + Math.random() * 5 - 2.5)
      
      data.push({
        date: currentDate.toLocaleDateString(),
        ideal: idealRemaining / totalPoints,
        actual: actualRemaining / totalPoints,
        label: `Day ${i + 1}`
      })
    }
    
    setBurndownData(data)
  }

  const handleCreateSprint = async () => {
    try {
      if (!createForm.name.trim()) {
        toast({
          title: "Error",
          description: "Sprint name is required"
        })
        return
      }

      const { error } = await supabase
        .from('sprints')
        .insert({
          name: createForm.name.trim(),
          goal: createForm.goal.trim() || null,
          start_date: createForm.start_date,
          end_date: createForm.end_date,
          project_id: projectId,
          status: 'planning',
          duration_days: createForm.duration_days
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "Sprint created successfully"
      })

      setIsCreateDialogOpen(false)
      setCreateForm({ name: '', goal: '', start_date: '', end_date: '', duration_days: 14 })
      fetchSprints()

    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to create sprint"
      })
    }
  }

  const handleSprintAction = async (sprintId: string, action: 'start' | 'complete') => {
    try {
      const newStatus = action === 'start' ? 'active' : 'completed'
      
      const { error } = await supabase
        .from('sprints')
        .update({ status: newStatus })
        .eq('id', sprintId)

      if (error) throw error

      toast({
        title: "Success",
        description: `Sprint ${action}ed successfully`
      })

      fetchSprints()

    } catch (err: any) {
      toast({
        title: "Error",
        description: `Failed to ${action} sprint`
      })
    }
  }

  const getSprintStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSprintStatusIcon = (status: string) => {
    switch (status) {
      case 'planning': return <Calendar className="h-4 w-4" />
      case 'active': return <Play className="h-4 w-4" />
      case 'completed': return <CheckCircle2 className="h-4 w-4" />
      default: return <Square className="h-4 w-4" />
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-32"></div>
                <div className="h-4 bg-gray-200 rounded w-48"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sprint Management</h1>
          <p className="text-gray-600 mt-1">Plan, track, and analyze your sprints</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Plus className="h-4 w-4 mr-2" />
                New Sprint
              </Button>
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Sprint</DialogTitle>
                <DialogDescription>
                  Set up a new sprint with timeline and goals.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Sprint Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Sprint 1, Feature Development"
                    value={createForm.name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="goal">Sprint Goal</Label>
                  <Textarea
                    id="goal"
                    placeholder="What do you want to achieve in this sprint?"
                    value={createForm.goal}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, goal: e.target.value }))}
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={createForm.start_date}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, start_date: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={createForm.end_date}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, end_date: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateSprint} className="bg-teal-600 hover:bg-teal-700">
                  Create Sprint
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Active Sprint Overview */}
      {activeSprint && (
        <Card className="border-teal-200 bg-gradient-to-r from-teal-50 to-blue-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 rounded-lg">
                  <Zap className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {activeSprint.name}
                    <Badge className={cn("text-xs", getSprintStatusColor(activeSprint.status || 'planning'))}>
                      {getSprintStatusIcon(activeSprint.status || 'planning')}
                      {activeSprint.status?.toUpperCase() || 'PLANNING'}
                    </Badge>
                  </CardTitle>
                  {activeSprint.goal && (
                    <p className="text-gray-600 mt-1">{activeSprint.goal}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {activeSprint.status === 'planning' && (
                  <Button 
                    onClick={() => handleSprintAction(activeSprint.id, 'start')}
                    className="bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Sprint
                  </Button>
                )}
                
                {activeSprint.status === 'active' && (
                  <Button 
                    onClick={() => handleSprintAction(activeSprint.id, 'complete')}
                    variant="outline"
                    size="sm"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Complete Sprint
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Sprint Stats */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Target className="h-4 w-4" />
                  <span>Tasks Progress</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Completed</span>
                    <span className="font-semibold">{activeSprint._count?.completed_tasks || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>In Progress</span>
                    <span className="font-semibold">{activeSprint._count?.in_progress_tasks || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total</span>
                    <span className="font-semibold">{activeSprint._count?.total_tasks || 0}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <BarChart3 className="h-4 w-4" />
                  <span>Story Points</span>
                </div>
                <div className="text-2xl font-bold text-teal-600">
                  {activeSprint._count?.story_points || 0} SP
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Timeline</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div>Start: {activeSprint.start_date ? new Date(activeSprint.start_date).toLocaleDateString() : 'Not set'}</div>
                  <div>End: {activeSprint.end_date ? new Date(activeSprint.end_date).toLocaleDateString() : 'Not set'}</div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <TrendingUp className="h-4 w-4" />
                  <span>Completion Rate</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {activeSprint._count?.total_tasks ? 
                    Math.round((activeSprint._count.completed_tasks / activeSprint._count.total_tasks) * 100) : 0}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="planning">Planning</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Sprint Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sprints.map((sprint) => (
              <Card key={sprint.id} className={cn(
                "transition-all hover:shadow-md cursor-pointer",
                sprint.status === 'active' && "ring-2 ring-teal-200"
              )}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{sprint.name}</CardTitle>
                    <Badge className={cn("text-xs", getSprintStatusColor(sprint.status || 'planning'))}>
                      {getSprintStatusIcon(sprint.status || 'planning')}
                      {sprint.status?.toUpperCase() || 'PLANNING'}
                    </Badge>
                  </div>
                  {sprint.goal && (
                    <p className="text-sm text-gray-600 line-clamp-2">{sprint.goal}</p>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Tasks</div>
                      <div className="font-semibold">{sprint._count?.completed_tasks}/{sprint._count?.total_tasks}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Story Points</div>
                      <div className="font-semibold">{sprint._count?.story_points} SP</div>
                    </div>
                  </div>
                  
                  {sprint.start_date && sprint.end_date && (
                    <div className="text-xs text-gray-500">
                      {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-2 border-t">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setActiveSprint(sprint)}
                    >
                      View Details
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                    
                    {sprint.status === 'planning' && (
                      <Button 
                        onClick={() => handleSprintAction(sprint.id, 'start')}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Start
                      </Button>
                    )}
                    
                    {sprint.status === 'active' && (
                      <Button 
                        onClick={() => handleSprintAction(sprint.id, 'complete')}
                        size="sm"
                        variant="outline"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="planning" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sprint Planning</CardTitle>
              <p className="text-sm text-gray-600">
                Drag tasks from backlog to sprint and estimate story points
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-8">
                Sprint planning interface coming soon...
                <br />
                <Button variant="outline" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Start Planning Session
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {activeSprint && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Burndown Chart
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SimpleChart data={burndownData} />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Velocity Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-gray-500 py-8">
                    Velocity data will appear after completing more sprints
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Sprint History</CardTitle>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sprints.filter(s => s.status === 'completed').map((sprint) => (
                  <div key={sprint.id} className="flex items-center justify-between p-4 border rounded">
                    <div>
                      <div className="font-semibold">{sprint.name}</div>
                      <div className="text-sm text-gray-500">
                        {sprint.start_date && sprint.end_date && 
                          `${new Date(sprint.start_date).toLocaleDateString()} - ${new Date(sprint.end_date).toLocaleDateString()}`
                        }
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {sprint._count?.completed_tasks}/{sprint._count?.total_tasks} tasks
                      </div>
                      <div className="text-sm text-gray-500">
                        {sprint._count?.story_points} story points
                      </div>
                    </div>
                  </div>
                ))}
                
                {sprints.filter(s => s.status === 'completed').length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    No completed sprints yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 