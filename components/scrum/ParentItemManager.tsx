'use client'

import { useState, useEffect } from 'react'
import { Search, X, ArrowUp, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { getItemTypeColor } from '@/lib/constants'

interface ParentItemManagerProps {
  taskId: string
  boardId?: string
  availableTasks?: Array<{
    id: string
    title: string
    taskType: string
      itemCode?: string
  }>
  onParentChanged?: () => void
}

interface ParentItem {
  id: string
  title: string
  taskType: string
  itemCode?: string
}

export function ParentItemManager({
  taskId,
  boardId,
  availableTasks = [],
  onParentChanged
}: ParentItemManagerProps) {
  const [parentItem, setParentItem] = useState<ParentItem | null>(null)
  const [showChangeDialog, setShowChangeDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTask, setSelectedTask] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadParentItem()
  }, [taskId])

  const loadParentItem = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/relations`)
      if (response.ok) {
        const data = await response.json()
        setParentItem(data.parent)
      }
    } catch (error) {
      console.error('Error loading parent item:', error)
    }
  }

  const handleChangeParent = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/tasks/${taskId}/relations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentId: selectedTask || null
        })
      })

      if (response.ok) {
        await loadParentItem()
        setShowChangeDialog(false)
        setSelectedTask('')
        onParentChanged?.()
      }
    } catch (error) {
      console.error('Error changing parent:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveParent = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/tasks/${taskId}/relations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentId: null
        })
      })

      if (response.ok) {
        setParentItem(null)
        onParentChanged?.()
      }
    } catch (error) {
      console.error('Error removing parent:', error)
    } finally {
      setIsLoading(false)
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


  const filteredAvailableTasks = availableTasks.filter(task =>
    task.id !== taskId && // Don't include self
    task.id !== parentItem?.id && // Don't include current parent
    (task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
     task.itemCode?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center space-x-2">
          <ArrowUp className="w-4 h-4 text-blue-500" />
          <span>Parent Item</span>
        </Label>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowChangeDialog(true)}
          className="h-8"
        >
          {parentItem ? (
            <>
              <X className="w-3 h-3 mr-1" />
              Change
            </>
          ) : (
            <>
              <Plus className="w-3 h-3 mr-1" />
              Add Parent
            </>
          )}
        </Button>
      </div>

      {parentItem ? (
        <Card className="border border-blue-200 bg-blue-50">
          <CardContent className="p-3">
            <div className="flex items-center space-x-3">
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-xs",
                getItemTypeColor(parentItem.taskType).color,
                getItemTypeColor(parentItem.taskType).bgColor
              )}>
                {getTaskTypeIcon(parentItem.taskType)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-medium truncate">{parentItem.title}</h4>
                    {parentItem.itemCode && (
                      <Badge variant="outline" className="text-xs">
                        {parentItem.itemCode}
                      </Badge>
                    )}
                    <Badge 
                      variant="outline" 
                      className="text-xs bg-gray-100 text-gray-800 border-gray-200"
                    >
                      item
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                    onClick={handleRemoveParent}
                    disabled={isLoading}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
          <ArrowUp className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No parent item</p>
          <p className="text-xs mt-1">Make this item part of a larger item</p>
        </div>
      )}

      {/* Change Parent Dialog */}
      <Dialog open={showChangeDialog} onOpenChange={setShowChangeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {parentItem ? 'Change Parent Item' : 'Add Parent Item'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Choose an item that this item belongs to. This item will become a subitem of the selected parent.
            </div>

            {/* Remove Parent Option */}
            {parentItem && (
              <div className="p-3 border rounded-lg bg-gray-50">
                <div
                  className={cn(
                    "flex items-center space-x-3 p-2 rounded cursor-pointer hover:bg-white",
                    selectedTask === '' && "bg-blue-50 border border-blue-200"
                  )}
                  onClick={() => setSelectedTask('')}
                >
                  <div className="w-4 h-4 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs">
                    <X className="w-3 h-3" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium">No parent (remove parent)</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="search">Search Items</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search for parent items..."
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
                        "w-4 h-4 rounded-full flex items-center justify-center text-xs",
                        getItemTypeColor(task.taskType).color,
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
                            className="text-xs bg-gray-100 text-gray-800 border-gray-200"
                          >
                            item
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
              <Button variant="outline" onClick={() => setShowChangeDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleChangeParent} 
                disabled={isLoading || (parentItem ? false : !selectedTask)}
              >
                {isLoading ? 'Updating...' : parentItem ? 'Change Parent' : 'Add Parent'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}