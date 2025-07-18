'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, X, AlertTriangle, Ban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { getItemTypeColor } from '@/lib/constants'

interface BlockingItemsManagerProps {
  taskId: string
  boardId?: string
  availableTasks?: Array<{
    id: string
    title: string
    taskType: string
    status: string
    itemCode?: string
  }>
  onBlockingRelationAdded?: () => void
  onBlockingRelationRemoved?: () => void
}

interface BlockingRelation {
  id: string
  title: string
  taskType: string
  status: string
  itemCode?: string
}

interface TaskRelations {
  blocking: BlockingRelation[]
  blockedBy: BlockingRelation[]
}

export function BlockingItemsManager({
  taskId,
  boardId,
  availableTasks = [],
  onBlockingRelationAdded,
  onBlockingRelationRemoved
}: BlockingItemsManagerProps) {
  const [relations, setRelations] = useState<TaskRelations>({ blocking: [], blockedBy: [] })
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addMode, setAddMode] = useState<'blocking' | 'blocked-by'>('blocking')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTask, setSelectedTask] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadRelations()
  }, [taskId])

  const loadRelations = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/relations`)
      if (response.ok) {
        const data = await response.json()
        setRelations({
          blocking: data.blocking || [],
          blockedBy: data.blockedBy || []
        })
      }
    } catch (error) {
      console.error('Error loading blocking relations:', error)
    }
  }

  const handleAddRelation = async () => {
    if (!selectedTask) return

    setIsLoading(true)
    try {
      const sourceTaskId = addMode === 'blocking' ? taskId : selectedTask
      const targetTaskId = addMode === 'blocking' ? selectedTask : taskId

      const response = await fetch(`/api/tasks/${sourceTaskId}/relations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetTaskId: targetTaskId,
          relationType: 'blocks'
        })
      })

      if (response.ok) {
        await loadRelations()
        setShowAddDialog(false)
        setSelectedTask('')
        onBlockingRelationAdded?.()
      }
    } catch (error) {
      console.error('Error adding blocking relation:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveRelation = async (relatedTaskId: string, direction: 'blocking' | 'blocked-by') => {
    try {
      const sourceTaskId = direction === 'blocking' ? taskId : relatedTaskId
      const targetTaskId = direction === 'blocking' ? relatedTaskId : taskId

      const response = await fetch(`/api/tasks/${sourceTaskId}/relations?targetTaskId=${targetTaskId}&relationType=blocks`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadRelations()
        onBlockingRelationRemoved?.()
      }
    } catch (error) {
      console.error('Error removing blocking relation:', error)
    }
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'todo': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const filteredAvailableTasks = availableTasks.filter(task =>
    task.id !== taskId && // Don't include self
    (task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
     task.itemCode?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const isBlocked = relations.blockedBy.some(item => item.status !== 'done')

  return (
    <div className="space-y-4">
      {/* Blocking Items Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium flex items-center space-x-2">
            <Ban className="w-4 h-4 text-red-500" />
            <span>Blocking Items ({relations.blocking.length})</span>
          </Label>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setAddMode('blocking')
              setShowAddDialog(true)
            }}
            className="h-8"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add
          </Button>
        </div>

        {relations.blocking.length > 0 ? (
          <div className="space-y-2">
            {relations.blocking.map((item) => (
              <Card key={item.id} className="border border-gray-200">
                <CardContent className="p-3">
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-white text-xs",
                      getItemTypeColor(item.taskType).bgColor
                    )}>
                      {getTaskTypeIcon(item.taskType)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium truncate">{item.title}</h4>
                          {item.itemCode && (
                            <Badge variant="outline" className="text-xs">
                              {item.itemCode}
                            </Badge>
                          )}
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", getStatusColor(item.status))}
                          >
                            {item.status}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                          onClick={() => handleRemoveRelation(item.id, 'blocking')}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">This item is not blocking any other items</p>
          </div>
        )}
      </div>

      {/* Blocked By Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium flex items-center space-x-2">
            <AlertTriangle className={cn("w-4 h-4", isBlocked ? "text-red-500" : "text-gray-400")} />
            <span>Blocked By ({relations.blockedBy.length})</span>
            {isBlocked && (
              <Badge variant="destructive" className="text-xs">
                BLOCKED
              </Badge>
            )}
          </Label>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setAddMode('blocked-by')
              setShowAddDialog(true)
            }}
            className="h-8"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add
          </Button>
        </div>

        {relations.blockedBy.length > 0 ? (
          <div className="space-y-2">
            {relations.blockedBy.map((item) => (
              <Card key={item.id} className={cn(
                "border",
                item.status !== 'done' ? "border-red-200 bg-red-50" : "border-gray-200"
              )}>
                <CardContent className="p-3">
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-white text-xs",
                      getItemTypeColor(item.taskType).bgColor
                    )}>
                      {getTaskTypeIcon(item.taskType)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium truncate">{item.title}</h4>
                          {item.itemCode && (
                            <Badge variant="outline" className="text-xs">
                              {item.itemCode}
                            </Badge>
                          )}
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", getStatusColor(item.status))}
                          >
                            {item.status}
                          </Badge>
                          {item.status !== 'done' && (
                            <AlertTriangle className="w-3 h-3 text-red-500" />
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                          onClick={() => handleRemoveRelation(item.id, 'blocked-by')}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">This item is not blocked by any other items</p>
          </div>
        )}
      </div>

      {/* Add Blocking Relation Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {addMode === 'blocking' 
                ? 'Add Blocking Item' 
                : 'Add Item That Blocks This'
              }
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              {addMode === 'blocking' 
                ? 'This item will block the selected item until it is completed.'
                : 'The selected item must be completed before this item can proceed.'
              }
            </div>

            <div>
              <Label htmlFor="search">Search Items</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search for items..."
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
                        selectedTask === task.id && "bg-blue-50 border border-blue-200"
                      )}
                      onClick={() => setSelectedTask(task.id)}
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
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", getStatusColor(task.status))}
                          >
                            {task.status}
                          </Badge>
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

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddRelation} 
                disabled={isLoading || !selectedTask}
              >
                {isLoading ? 'Adding...' : 'Add Relation'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}