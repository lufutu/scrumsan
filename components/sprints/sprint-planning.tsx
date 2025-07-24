'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/animate-ui/radix/progress'
import { Calendar, Plus, Target, Clock, User } from 'lucide-react'
import TaskCreationDialog from '@/components/common/TaskCreationDialog'

interface SprintPlanningProps {
  projectId: string
  boardId?: string
  organizationId?: string
}

export default function SprintPlanning({ projectId, boardId, organizationId }: SprintPlanningProps) {
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)

  // Mock data - in real implementation, fetch from API
  const backlogItems = [
    {
      id: '1',
      title: 'User Authentication System',
      type: 'story',
      storyPoints: 8,
      priority: 'high',
      assignee: 'John Doe'
    },
    {
      id: '2',
      title: 'Dashboard Layout',
      type: 'story',
      storyPoints: 5,
      priority: 'medium',
      assignee: 'Jane Smith'
    },
    {
      id: '3',
      title: 'Fix login validation bug',
      type: 'bug',
      storyPoints: 3,
      priority: 'high',
      assignee: 'Bob Johnson'
    }
  ]

  const sprintCapacity = {
    totalCapacity: 40,
    currentCommitment: 16,
    remainingCapacity: 24
  }

  const getTaskTypeColor = (type: string) => {
    switch (type) {
      case 'story': return 'bg-emerald-500'
      case 'bug': return 'bg-red-500'
      case 'task': return 'bg-orange-500'
      default: return 'bg-gray-500'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Sprint Planning Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Sprint Planning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sprint-name">Sprint Name</Label>
              <Input id="sprint-name" placeholder="Enter sprint name" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="sprint-duration">Duration (weeks)</Label>
              <Input id="sprint-duration" type="number" placeholder="2" className="mt-1" />
            </div>
          </div>
          <div className="mt-4">
            <Label htmlFor="sprint-goal">Sprint Goal</Label>
            <Textarea 
              id="sprint-goal" 
              placeholder="What do you want to achieve in this sprint?" 
              className="mt-1"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Capacity Planning */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Sprint Capacity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{sprintCapacity.totalCapacity}</div>
                <div className="text-sm text-gray-600">Total Capacity</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{sprintCapacity.currentCommitment}</div>
                <div className="text-sm text-gray-600">Committed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{sprintCapacity.remainingCapacity}</div>
                <div className="text-sm text-gray-600">Remaining</div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Capacity Utilization</span>
                <span className="text-sm text-gray-600">
                  {Math.round((sprintCapacity.currentCommitment / sprintCapacity.totalCapacity) * 100)}%
                </span>
              </div>
              <Progress 
                value={(sprintCapacity.currentCommitment / sprintCapacity.totalCapacity) * 100} 
                className="h-2" 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Backlog */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Product Backlog</CardTitle>
            {boardId && (
              <TaskCreationDialog
                projectId={projectId}
                boardId={boardId}
                organizationId={organizationId}
                trigger={
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                }
                onSuccess={() => {
                  // Refresh data when task is created
                  console.log('Task created successfully')
                }}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {backlogItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${getTaskTypeColor(item.type)}`} />
                  <div>
                    <div className="font-medium">{item.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={getPriorityColor(item.priority)}>
                        {item.priority}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <User className="h-3 w-3" />
                        {item.assignee}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {item.storyPoints} SP
                  </div>
                  <Button size="sm" variant="outline">
                    Add to Sprint
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button className="flex-1">
          <Calendar className="h-4 w-4 mr-2" />
          Start Sprint
        </Button>
        <Button variant="outline" className="flex-1">
          Save as Draft
        </Button>
      </div>
    </div>
  )
}