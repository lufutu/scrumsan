"use client"

import { useState, useEffect } from 'react'
import { useSupabase } from '@/providers/supabase-provider'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calendar, 
  TrendingUp, 
  BarChart3, 
  Target, 
  Clock,
  Users,
  CheckCircle2,
  Download,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tables } from '@/types/database'

// Simple chart components
const SimpleLineChart = ({ data }: { data: any[] }) => (
  <div className="h-64 flex items-end justify-center gap-2 border rounded p-4">
    {data.map((item, index) => (
      <div key={index} className="flex flex-col items-center gap-1">
        <div
          className="bg-teal-600 rounded-t w-6 transition-all hover:bg-teal-700"
          style={{ height: `${Math.max(item.value * 200, 10)}px` }}
          title={`${item.label}: ${item.value}`}
        />
        <span className="text-xs text-gray-500 rotate-45 origin-left">{item.label}</span>
      </div>
    ))}
  </div>
)

const SimplePieChart = ({ data }: { data: any[] }) => (
  <div className="flex flex-col items-center gap-4">
    <div className="relative w-32 h-32">
      {data.map((item, index) => (
        <div
          key={index}
          className="absolute inset-0 rounded-full border-8"
          style={{
            borderColor: item.color,
            transform: `rotate(${index * 90}deg)`,
            borderTopColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: 'transparent'
          }}
        />
      ))}
    </div>
    <div className="space-y-2">
      {data.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded" 
            style={{ backgroundColor: item.color }}
          />
          <span className="text-sm">{item.name} ({item.value})</span>
        </div>
      ))}
    </div>
  </div>
)

type Sprint = Tables<'sprints'> & {
  _analytics?: {
    total_tasks: number
    completed_tasks: number
    total_points: number
    completed_points: number
    completion_rate: number
  }
}

interface VivifySprintAnalyticsProps {
  projectId: string
  sprintId?: string
}

export default function VivifySprintAnalytics({ projectId, sprintId }: VivifySprintAnalyticsProps) {
  const { supabase } = useSupabase()
  const { toast } = useToast()
  
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [burndownData, setBurndownData] = useState<any[]>([])
  const [velocityData, setVelocityData] = useState<any[]>([])
  const [taskDistribution, setTaskDistribution] = useState<any[]>([])

  useEffect(() => {
    fetchSprints()
  }, [projectId])

  useEffect(() => {
    if (selectedSprint) {
      generateAnalytics(selectedSprint)
    }
  }, [selectedSprint])

  const fetchSprints = async () => {
    try {
      setIsLoading(true)
      
      const { data, error } = await supabase
        .from('sprints')
        .select(`
          *,
          sprint_tasks(
            task_id,
            tasks(
              id,
              title,
              status,
              story_points
            )
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform data with analytics
      const transformedSprints = (data || []).map(sprint => {
        const tasks = sprint.sprint_tasks?.map(st => st.tasks).filter(Boolean) || []
        const completedTasks = tasks.filter(task => task?.status === 'done')
        const totalPoints = tasks.reduce((sum, task) => sum + (task?.story_points || 0), 0)
        const completedPoints = completedTasks.reduce((sum, task) => sum + (task?.story_points || 0), 0)
        
        return {
          ...sprint,
          _analytics: {
            total_tasks: tasks.length,
            completed_tasks: completedTasks.length,
            total_points: totalPoints,
            completed_points: completedPoints,
            completion_rate: tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0
          }
        }
      })

      setSprints(transformedSprints)
      
      if (sprintId) {
        const sprint = transformedSprints.find(s => s.id === sprintId)
        setSelectedSprint(sprint || transformedSprints[0] || null)
      } else {
        setSelectedSprint(transformedSprints[0] || null)
      }
      
    } catch (err: any) {
      console.error('Error fetching sprints:', err)
      toast({
        title: "Error",
        description: "Failed to load sprint data"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const generateAnalytics = (sprint: Sprint) => {
    generateBurndownChart(sprint)
    generateVelocityChart()
    generateTaskDistribution(sprint)
  }

  const generateBurndownChart = (sprint: Sprint) => {
    if (!sprint.start_date || !sprint.end_date) return

    const startDate = new Date(sprint.start_date)
    const endDate = new Date(sprint.end_date)
    const totalPoints = sprint._analytics?.total_points || 0
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    
    const data = []
    for (let i = 0; i <= Math.min(daysDiff, 14); i++) {
      const currentDate = new Date(startDate)
      currentDate.setDate(startDate.getDate() + i)
      
      // Ideal burndown line
      const idealRemaining = Math.max(0, totalPoints - (totalPoints * i / daysDiff))
      
      // Actual burndown (simulated)
      const completionRate = Math.min(1, i / daysDiff + Math.random() * 0.1 - 0.05)
      const actualRemaining = Math.max(0, totalPoints * (1 - completionRate))
      
      data.push({
        label: `Day ${i + 1}`,
        value: actualRemaining / Math.max(totalPoints, 1),
        ideal: idealRemaining / Math.max(totalPoints, 1)
      })
    }
    
    setBurndownData(data)
  }

  const generateVelocityChart = () => {
    const completedSprints = sprints.filter(s => s.status === 'completed' && s._analytics?.completed_points)
    
    const data = completedSprints.slice(0, 6).map((sprint, index) => ({
      label: `S${index + 1}`,
      value: (sprint._analytics?.completed_points || 0) / 100,
      name: sprint.name || `Sprint ${index + 1}`
    }))
    
    setVelocityData(data)
  }

  const generateTaskDistribution = (sprint: Sprint) => {
    const analytics = sprint._analytics
    if (!analytics) return

    const data = [
      { name: 'Completed', value: analytics.completed_tasks, color: '#10b981' },
      { name: 'Remaining', value: analytics.total_tasks - analytics.completed_tasks, color: '#f3f4f6' }
    ]
    
    setTaskDistribution(data)
  }

  const handleSprintChange = (sprintId: string) => {
    const sprint = sprints.find(s => s.id === sprintId)
    if (sprint) {
      setSelectedSprint(sprint)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-32"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const sprintStats = selectedSprint?._analytics

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sprint Analytics</h1>
          <p className="text-gray-600 mt-1">Track performance, velocity, and team metrics</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select 
            value={selectedSprint?.id || ''} 
            onValueChange={handleSprintChange}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a sprint" />
            </SelectTrigger>
            <SelectContent>
              {sprints.map(sprint => (
                <SelectItem key={sprint.id} value={sprint.id}>
                  <div className="flex items-center gap-2">
                    <Badge className={cn("text-xs", 
                      sprint.status === 'active' ? 'bg-green-100 text-green-800' : 
                      sprint.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                      'bg-blue-100 text-blue-800'
                    )}>
                      {sprint.status?.toUpperCase()}
                    </Badge>
                    {sprint.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Sprint Overview Cards */}
      {selectedSprint && sprintStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Completion Rate</CardTitle>
                <CheckCircle2 className="h-5 w-5 text-teal-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-teal-600">
                {Math.round(sprintStats.completion_rate)}%
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {sprintStats.completed_tasks} of {sprintStats.total_tasks} tasks
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Velocity</CardTitle>
                <Zap className="h-5 w-5 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {sprintStats.completed_points}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Story points completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Total Tasks</CardTitle>
                <Target className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {sprintStats.total_tasks}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {sprintStats.total_points} story points planned
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Timeline</CardTitle>
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {selectedSprint.duration_days || 14}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Days in sprint
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts and Analytics */}
      <Tabs defaultValue="burndown" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="burndown">Burndown Chart</TabsTrigger>
          <TabsTrigger value="velocity">Velocity</TabsTrigger>
          <TabsTrigger value="distribution">Task Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="burndown" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Sprint Burndown Chart
              </CardTitle>
              <p className="text-sm text-gray-600">
                Track remaining work vs ideal progress
              </p>
            </CardHeader>
            <CardContent>
              <SimpleLineChart data={burndownData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="velocity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Team Velocity
              </CardTitle>
              <p className="text-sm text-gray-600">
                Story points completed per sprint
              </p>
            </CardHeader>
            <CardContent>
              <SimpleLineChart data={velocityData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Task Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SimplePieChart data={taskDistribution} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Sprint Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedSprint && (
                  <>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm text-gray-600">Start Date</span>
                      <span className="font-medium">
                        {selectedSprint.start_date ? 
                          new Date(selectedSprint.start_date).toLocaleDateString() : 
                          'Not set'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm text-gray-600">End Date</span>
                      <span className="font-medium">
                        {selectedSprint.end_date ? 
                          new Date(selectedSprint.end_date).toLocaleDateString() : 
                          'Not set'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm text-gray-600">Duration</span>
                      <span className="font-medium">{selectedSprint.duration_days || 14} days</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-600">Status</span>
                      <Badge className={cn(
                        selectedSprint.status === 'active' ? 'bg-green-100 text-green-800' : 
                        selectedSprint.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                        'bg-blue-100 text-blue-800'
                      )}>
                        {selectedSprint.status?.toUpperCase()}
                      </Badge>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 