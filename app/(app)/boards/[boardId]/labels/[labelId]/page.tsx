"use client"

import { useParams, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, Edit, Target, Clock, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
})

type Task = {
  id: string
  title: string
  description: string | null
  status: string | null
  taskType: string | null
  priority: string | null
  storyPoints: number | null
  assignee: {
    id: string
    fullName: string | null
    avatarUrl: string | null
  } | null
  reviewer: {
    id: string
    fullName: string | null
    avatarUrl: string | null
  } | null
  column: {
    id: string
    name: string
  } | null
  worklogEntries: Array<{ hoursLogged: number }>
}

type SprintGroup = {
  type: 'sprint' | 'backlog'
  id: string
  name: string
  status: string | null
  startDate: string | null
  endDate: string | null
  tasks: Task[]
}

type LabelDetail = {
  id: string
  name: string
  description: string | null
  color: string | null
  createdAt: string
  tasksBySprint: SprintGroup[]
  statistics: {
    totalTasks: number
    totalPoints: number
    totalLoggedTime: number
    completedTasks: number
    assignees: Array<{
      id: string
      fullName: string | null
      avatarUrl: string | null
    }>
  }
}

export default function LabelDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const boardId = params?.boardId as string
  const labelId = params?.labelId as string
  const initialTab = searchParams?.get('tab') || 'items'
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editLabel, setEditLabel] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  })

  const { data: label, error, isLoading, mutate } = useSWR<LabelDetail>(
    boardId && labelId ? `/api/boards/${boardId}/labels/${labelId}` : null,
    fetcher
  )

  const handleEditLabel = async () => {
    try {
      const response = await fetch(`/api/boards/${boardId}/labels/${labelId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editLabel),
      })

      if (response.ok) {
        setIsEditDialogOpen(false)
        mutate()
      }
    } catch (error) {
      console.error('Failed to update label:', error)
    }
  }

  const openEditDialog = () => {
    if (label) {
      setEditLabel({
        name: label.name,
        description: label.description || '',
        color: label.color || '#3B82F6'
      })
      setIsEditDialogOpen(true)
    }
  }

  const getTaskTypeColor = (taskType: string | null) => {
    switch (taskType) {
      case 'story': return 'bg-green-100 text-green-800'
      case 'bug': return 'bg-red-100 text-red-800'
      case 'task': return 'bg-blue-100 text-blue-800'
      case 'epic': return 'bg-purple-100 text-purple-800'
      case 'improvement': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'highest': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      case 'lowest': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading label...</p>
        </div>
      </div>
    )
  }

  if (error || !label) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-6 text-center">
            <h1 className="text-2xl font-bold text-red-600">Label not found</h1>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/boards/${boardId}/labels`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Labels
            </Link>
          </Button>
          
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: label.color || '#3B82F6' }}
            />
            <div>
              <h1 className="text-2xl font-bold">{label.name}</h1>
              {label.description && (
                <p className="text-muted-foreground">{label.description}</p>
              )}
            </div>
          </div>
        </div>

        <Button variant="outline" onClick={openEditDialog}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Label
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{label.statistics.totalTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{label.statistics.completedTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Story Points</p>
                <p className="text-2xl font-bold">{label.statistics.totalPoints}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Time Logged</p>
                <p className="text-2xl font-bold">{label.statistics.totalLoggedTime.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4">
          {label.tasksBySprint.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{group.name}</span>
                    {group.status && (
                      <Badge variant={group.status === 'active' ? 'default' : 'secondary'}>
                        {group.status}
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline">{group.tasks.length} items</Badge>
                </CardTitle>
                {group.startDate && group.endDate && (
                  <p className="text-sm text-muted-foreground">
                    {new Date(group.startDate).toLocaleDateString()} - {new Date(group.endDate).toLocaleDateString()}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {group.tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-1 h-8 rounded"
                            style={{ backgroundColor: getPriorityColor(task.priority) }}
                          />
                          <div>
                            <h4 className="font-medium">{task.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge 
                                variant="outline" 
                                className={getTaskTypeColor(task.taskType)}
                              >
                                {task.taskType || 'Task'}
                              </Badge>
                              {task.column && (
                                <Badge variant="secondary">{task.column.name}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {task.storyPoints && (
                          <div className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            <span className="text-sm">{task.storyPoints}</span>
                          </div>
                        )}
                        
                        {task.assignee && (
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={task.assignee.avatarUrl || undefined} />
                            <AvatarFallback className="text-xs">
                              {task.assignee.fullName?.split(' ').map(n => n[0]).join('') || '?'}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Progress Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Completion Rate</span>
                    <span className="font-medium">
                      {label.statistics.totalTasks > 0 
                        ? Math.round((label.statistics.completedTasks / label.statistics.totalTasks) * 100)
                        : 0
                      }%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{
                        width: `${label.statistics.totalTasks > 0 
                          ? (label.statistics.completedTasks / label.statistics.totalTasks) * 100
                          : 0
                        }%`
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {label.statistics.assignees.map((assignee) => (
                    <div key={assignee.id} className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={assignee.avatarUrl || undefined} />
                        <AvatarFallback>
                          {assignee.fullName?.split(' ').map(n => n[0]).join('') || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{assignee.fullName || 'Unknown'}</span>
                    </div>
                  ))}
                  {label.statistics.assignees.length === 0 && (
                    <p className="text-muted-foreground">No assignees yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Label Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <p className="text-lg">{label.name}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Description</label>
                <p className="text-muted-foreground">
                  {label.description || 'No description provided'}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Color</label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: label.color || '#3B82F6' }}
                  />
                  <span className="font-mono text-sm">{label.color || '#3B82F6'}</span>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Created</label>
                <p className="text-muted-foreground">
                  {new Date(label.createdAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Label</DialogTitle>
            <DialogDescription>
              Update the label information and Epic details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editLabel.name}
                onChange={(e) => setEditLabel(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Label name"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editLabel.description}
                onChange={(e) => setEditLabel(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Epic description (optional)"
              />
            </div>
            <div>
              <Label htmlFor="edit-color">Color</Label>
              <Input
                id="edit-color"
                type="color"
                value={editLabel.color}
                onChange={(e) => setEditLabel(prev => ({ ...prev, color: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditLabel} disabled={!editLabel.name.trim()}>
                Update Label
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}