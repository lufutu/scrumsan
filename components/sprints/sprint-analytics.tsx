'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart3, TrendingUp, Clock, Target, Users, CheckCircle } from 'lucide-react'

interface SprintAnalyticsProps {
  projectId: string
}

export default function SprintAnalytics({ projectId }: SprintAnalyticsProps) {
  // Mock data - in real implementation, fetch from API
  const sprintMetrics = {
    velocity: 42,
    burndownRate: 85,
    completionRate: 78,
    averageCycleTime: 3.2,
    teamEfficiency: 92
  }

  const pastSprints = [
    {
      id: '1',
      name: 'Sprint 1',
      startDate: '2024-01-01',
      endDate: '2024-01-14',
      plannedPoints: 40,
      completedPoints: 35,
      velocity: 35,
      completionRate: 87.5
    },
    {
      id: '2',
      name: 'Sprint 2',
      startDate: '2024-01-15',
      endDate: '2024-01-28',
      plannedPoints: 45,
      completedPoints: 42,
      velocity: 42,
      completionRate: 93.3
    },
    {
      id: '3',
      name: 'Sprint 3',
      startDate: '2024-01-29',
      endDate: '2024-02-11',
      plannedPoints: 38,
      completedPoints: 38,
      velocity: 38,
      completionRate: 100
    }
  ]

  const teamPerformance = [
    { name: 'John Doe', tasksCompleted: 15, averageTime: 2.8, efficiency: 94 },
    { name: 'Jane Smith', tasksCompleted: 12, averageTime: 3.1, efficiency: 89 },
    { name: 'Bob Johnson', tasksCompleted: 18, averageTime: 2.5, efficiency: 96 }
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Velocity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{sprintMetrics.velocity}</div>
            <div className="text-sm text-gray-600">Story Points</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Burndown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{sprintMetrics.burndownRate}%</div>
            <div className="text-sm text-gray-600">On track</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{sprintMetrics.completionRate}%</div>
            <div className="text-sm text-gray-600">Tasks done</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Cycle Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{sprintMetrics.averageCycleTime}</div>
            <div className="text-sm text-gray-600">Days avg</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600">{sprintMetrics.teamEfficiency}%</div>
            <div className="text-sm text-gray-600">Team avg</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="sprints" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sprints">Sprint History</TabsTrigger>
          <TabsTrigger value="team">Team Performance</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="sprints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sprint History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pastSprints.map((sprint) => (
                  <div key={sprint.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium">{sprint.name}</h3>
                        <p className="text-sm text-gray-600">
                          {sprint.startDate} - {sprint.endDate}
                        </p>
                      </div>
                      <Badge variant={sprint.completionRate >= 90 ? 'default' : 'secondary'}>
                        {sprint.completionRate}% Complete
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-blue-600">{sprint.plannedPoints}</div>
                        <div className="text-sm text-gray-600">Planned</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-green-600">{sprint.completedPoints}</div>
                        <div className="text-sm text-gray-600">Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-purple-600">{sprint.velocity}</div>
                        <div className="text-sm text-gray-600">Velocity</div>
                      </div>
                    </div>
                    
                    <Progress value={sprint.completionRate} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamPerformance.map((member) => (
                  <div key={member.name} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="font-medium">{member.name}</span>
                      </div>
                      <Badge variant="outline">
                        {member.efficiency}% Efficient
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-green-600">{member.tasksCompleted}</div>
                        <div className="text-sm text-gray-600">Tasks Done</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-orange-600">{member.averageTime}</div>
                        <div className="text-sm text-gray-600">Avg Days</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-purple-600">{member.efficiency}%</div>
                        <div className="text-sm text-gray-600">Efficiency</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3">Velocity Trend</h4>
                  <div className="flex items-end gap-2 h-32">
                    {pastSprints.map((sprint, index) => (
                      <div key={sprint.id} className="flex-1 flex flex-col justify-end">
                        <div 
                          className="bg-blue-500 rounded-t"
                          style={{ height: `${(sprint.velocity / 45) * 100}%` }}
                        />
                        <div className="text-xs text-center mt-1">{sprint.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Completion Rate Trend</h4>
                  <div className="flex items-end gap-2 h-32">
                    {pastSprints.map((sprint, index) => (
                      <div key={sprint.id} className="flex-1 flex flex-col justify-end">
                        <div 
                          className="bg-green-500 rounded-t"
                          style={{ height: `${sprint.completionRate}%` }}
                        />
                        <div className="text-xs text-center mt-1">{sprint.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}