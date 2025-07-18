'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Calendar, Target, Users, Clock, Play, Pause, CheckCircle } from 'lucide-react'

interface SprintDashboardProps {
  projectId: string
}

export default function SprintDashboard({ projectId }: SprintDashboardProps) {
  // Mock data - in real implementation, fetch from API
  const currentSprint = {
    id: 'sprint-1',
    name: 'Sprint 1',
    goal: 'Complete user authentication and basic dashboard functionality',
    status: 'active',
    startDate: '2024-01-15',
    endDate: '2024-01-29',
    progress: 65,
    totalTasks: 12,
    completedTasks: 8,
    inProgressTasks: 3,
    todoTasks: 1
  }

  const teamMembers = [
    { id: '1', name: 'John Doe', avatar: 'JD', tasksCompleted: 3, tasksInProgress: 1 },
    { id: '2', name: 'Jane Smith', avatar: 'JS', tasksCompleted: 2, tasksInProgress: 2 },
    { id: '3', name: 'Bob Johnson', avatar: 'BJ', tasksCompleted: 3, tasksInProgress: 0 }
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Sprint Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              {currentSprint.name}
            </CardTitle>
            <Badge variant={currentSprint.status === 'active' ? 'default' : 'secondary'}>
              {currentSprint.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Sprint Goal</p>
              <p className="font-medium">{currentSprint.goal}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm">Start: {currentSprint.startDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm">End: {currentSprint.endDate}</span>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm text-gray-600">{currentSprint.progress}%</span>
              </div>
              <Progress value={currentSprint.progress} className="h-2" />
            </div>
            
            <div className="flex gap-2">
              <Button size="sm">
                <Play className="h-4 w-4 mr-2" />
                Start Sprint
              </Button>
              <Button size="sm" variant="outline">
                <Pause className="h-4 w-4 mr-2" />
                Complete Sprint
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">To Do</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{currentSprint.todoTasks}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{currentSprint.inProgressTasks}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{currentSprint.completedTasks}</div>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {member.avatar}
                  </div>
                  <span className="font-medium">{member.name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>{member.tasksCompleted} completed</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span>{member.tasksInProgress} in progress</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}