'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, X, ChevronDown, ChevronRight, User, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { getItemTypeColor } from '@/lib/constants'

interface SubitemManagerProps {
  taskId: string
  boardId?: string
  availableTasks?: Array<{
    id: string
    title: string
    taskType: string
    status: string
    itemCode?: string
  }>
  users?: Array<{
    id: string
    fullName: string
    avatarUrl?: string
  }>
  onSubitemAdded?: () => void
  onSubitemRemoved?: () => void
}

interface Subitem {
  id: string
  title: string
  description?: string
  taskType: string
  status?: string
  itemCode?: string
  assignee?: {
    id: string
    fullName: string
    avatarUrl?: string
  }
  _count?: {
    subitems: number
    comments: number
  }
}

export function SubitemsManager({
  taskId,
  boardId,
  availableTasks = [],
  users = [],
  onSubitemAdded,
  onSubitemRemoved
}: SubitemManagerProps) {
  const [subitems, setSubitems] = useState<Subitem[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addMode, setAddMode] = useState<'new' | 'existing'>('new')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // New subitem form data
  const [newSubitem, setNewSubitem] = useState({
    title: '',
    description: '',
    taskType: 'task',
    assigneeId: ''
  })

  // Selected existing task
  const [selectedExistingTask, setSelectedExistingTask] = useState('')

  useEffect(() => {
    loadSubitems()
  }, [taskId])

  const loadSubitems = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/subitems`)
      if (response.ok) {
        const data = await response.json()
        setSubitems(data)
      }
    } catch (error) {
      console.error('Error loading subitems:', error)
    }
  }

  const handleAddSubitem = async () => {
    if (addMode === 'new' && !newSubitem.title.trim()) return
    if (addMode === 'existing' && !selectedExistingTask) return

    setIsLoading(true)
    try {
      const payload = addMode === 'new' 
        ? newSubitem
        : { existingTaskId: selectedExistingTask }

      const response = await fetch(`/api/tasks/${taskId}/subitems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        await loadSubitems()
        setShowAddDialog(false)
        setNewSubitem({ title: '', description: '', taskType: 'task', assigneeId: '' })
        setSelectedExistingTask('')
        onSubitemAdded?.()
      }
    } catch (error) {
      console.error('Error adding subitem:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveSubitem = async (subitemId: string) => {
    try {
      const response = await fetch(`/api/tasks/${subitemId}/relations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId: null })
      })

      if (response.ok) {
        await loadSubitems()
        onSubitemRemoved?.()
      }
    } catch (error) {
      console.error('Error removing subitem:', error)
    }
  }

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }


  const getTaskTypeIcon = (taskType: string) => {
    switch (taskType) {
      case 'story': return '●'
      case 'bug': return '🐛'
      case 'task': return '●'
      case 'epic': return '⚡'
      case 'improvement': return '⬆️'
      default: return '●'
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'done': return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'todo': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const filteredAvailableTasks = availableTasks.filter(task =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.itemCode?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Subitems ({subitems.length})</Label>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowAddDialog(true)}
          className="h-8"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Subitem
        </Button>
      </div>

      {subitems.length > 0 ? (
        <div className="space-y-2">
          {subitems.map((subitem) => (
            <Card key={subitem.id} className="border border-gray-200">
              <CardContent className="p-3">
                <div className="flex items-start space-x-3">
                  {/* Expand/Collapse Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 mt-0.5"
                    onClick={() => toggleExpanded(subitem.id)}
                  >
                    {expandedItems.has(subitem.id) ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </Button>

                  {/* Task Type Icon */}
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-white text-xs mt-0.5",
                    getItemTypeColor(subitem.taskType).bgColor
                  )}>
                    {getTaskTypeIcon(subitem.taskType)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium truncate">{subitem.title}</h4>
                        {subitem.itemCode && (
                          <Badge variant="outline" className="text-xs">
                            {subitem.itemCode}
                          </Badge>
                        )}
                        {subitem.status && (
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", getStatusColor(subitem.status))}
                          >
                            {subitem.status}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                        onClick={() => handleRemoveSubitem(subitem.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>

                    {expandedItems.has(subitem.id) && (
                      <div className="mt-2 space-y-2">
                        {subitem.description && (
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {subitem.description}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center space-x-4">
                            {subitem.assignee && (
                              <div className="flex items-center space-x-1">
                                <User className="h-3 w-3" />
                                <span>{subitem.assignee.fullName}</span>
                              </div>
                            )}
                            
                            {subitem._count && subitem._count.comments > 0 && (
                              <div className="flex items-center space-x-1">
                                <MessageSquare className="h-3 w-3" />
                                <span>{subitem._count.comments}</span>
                              </div>
                            )}
                          </div>
                          
                          {subitem._count && subitem._count.subitems > 0 && (
                            <span>{subitem._count.subitems} subitems</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500">
          <p className="text-sm">No subitems yet</p>
          <p className="text-xs mt-1">Break this item into smaller pieces</p>
        </div>
      )}

      {/* Add Subitem Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Subitem</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Mode Selection */}
            <div className="flex rounded-lg border p-1 space-x-1">
              <Button
                variant={addMode === 'new' ? 'secondary' : 'ghost'}
                size="sm"
                className="flex-1"
                onClick={() => setAddMode('new')}
              >
                Create New
              </Button>
              <Button
                variant={addMode === 'existing' ? 'secondary' : 'ghost'}
                size="sm"
                className="flex-1"
                onClick={() => setAddMode('existing')}
              >
                Add Existing
              </Button>
            </div>

            {addMode === 'new' ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Enter subitem title..."
                    value={newSubitem.title}
                    onChange={(e) => setNewSubitem(prev => ({ ...prev, title: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter description..."
                    rows={3}
                    value={newSubitem.description}
                    onChange={(e) => setNewSubitem(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="taskType">Type</Label>
                  <Select 
                    value={newSubitem.taskType} 
                    onValueChange={(value) => setNewSubitem(prev => ({ ...prev, taskType: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="task">Task</SelectItem>
                      <SelectItem value="story">Story</SelectItem>
                      <SelectItem value="bug">Bug</SelectItem>
                      <SelectItem value="improvement">Improvement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="assignee">Assignee</Label>
                  <Select 
                    value={newSubitem.assigneeId} 
                    onValueChange={(value) => setNewSubitem(prev => ({ ...prev, assigneeId: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select assignee..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="search">Search Items</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search for items to add..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto border rounded-lg">
                  {filteredAvailableTasks.length > 0 ? (
                    <div className="p-1">
                      {filteredAvailableTasks.map((task) => (
                        <div
                          key={task.id}
                          className={cn(
                            "flex items-center space-x-3 p-2 rounded cursor-pointer hover:bg-gray-50",
                            selectedExistingTask === task.id && "bg-blue-50 border border-blue-200"
                          )}
                          onClick={() => setSelectedExistingTask(task.id)}
                        >
                          <div className={cn(
                            "w-4 h-4 rounded-full flex items-center justify-center text-white text-xs",
                            getItemTypeColor(task.taskType).bgColor
                          )}>
                            {getTaskTypeIcon(task.taskType)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium truncate">{task.title}</span>
                              {task.itemCode && (
                                <Badge variant="outline" className="text-xs">
                                  {task.itemCode}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      <p className="text-sm">No items found</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddSubitem} 
                disabled={isLoading || (addMode === 'new' && !newSubitem.title.trim()) || (addMode === 'existing' && !selectedExistingTask)}
              >
                {isLoading ? 'Adding...' : 'Add Subitem'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}