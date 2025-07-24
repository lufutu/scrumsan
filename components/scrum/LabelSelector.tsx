"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, X } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/animate-ui/radix/popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLabels } from '@/hooks/useLabels'
import { toast } from 'sonner'

interface LabelSelectorProps {
  boardId: string
  taskId?: string // Optional: if provided, will directly update task labels
  selectedLabels?: Array<{ id: string; name: string; color: string }>
  onLabelsChange?: (labels: Array<{ id: string; name: string; color: string }>) => void
  onTaskUpdate?: () => void // Called after task labels are updated
}

export default function LabelSelector({ 
  boardId, 
  taskId, 
  selectedLabels = [], 
  onLabelsChange,
  onTaskUpdate 
}: LabelSelectorProps) {
  const { labels, createLabel } = useLabels(boardId)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newLabelForm, setNewLabelForm] = useState({
    name: '',
    color: '#3B82F6'
  })

  const handleToggleLabel = async (label: { id: string; name: string; color: string | null }) => {
    const isSelected = selectedLabels.some(l => l.id === label.id)
    
    let newLabels: Array<{ id: string; name: string; color: string }>
    
    if (isSelected) {
      // Remove label
      newLabels = selectedLabels.filter(l => l.id !== label.id)
    } else {
      // Add label
      newLabels = [...selectedLabels, {
        id: label.id,
        name: label.name,
        color: label.color || '#3B82F6'
      }]
    }
    
    // If taskId is provided, update the task directly
    if (taskId) {
      try {
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            labels: newLabels.map(l => l.id)
          })
        })
        
        if (!response.ok) {
          throw new Error('Failed to update task labels')
        }
        
        toast.success(isSelected ? 'Label removed' : 'Label added')
        onTaskUpdate?.()
      } catch (error) {
        toast.error('Failed to update labels')
        return // Don't update local state if API call failed
      }
    }
    
    // Update local state
    onLabelsChange?.(newLabels)
  }

  const handleCreateLabel = async () => {
    if (!newLabelForm.name.trim()) {
      toast.error('Label name is required')
      return
    }

    setIsCreating(true)
    try {
      const label = await createLabel({
        name: newLabelForm.name,
        color: newLabelForm.color
      })

      // Add the new label to selection
      const newLabels = [...selectedLabels, {
        id: label.id,
        name: label.name,
        color: label.color || '#3B82F6'
      }]
      
      // If taskId is provided, update the task directly
      if (taskId) {
        try {
          const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              labels: newLabels.map(l => l.id)
            })
          })
          
          if (!response.ok) {
            throw new Error('Failed to assign label to task')
          }
          
          onTaskUpdate?.()
        } catch (error) {
          toast.error('Failed to assign label to task')
          return
        }
      }
      
      onLabelsChange?.(newLabels)
      setNewLabelForm({ name: '', color: '#3B82F6' })
      toast.success('Label created and assigned')
    } catch (error) {
      toast.error('Failed to create label')
    } finally {
      setIsCreating(false)
    }
  }

  const handleRemoveLabel = async (labelId: string) => {
    const newLabels = selectedLabels.filter(l => l.id !== labelId)
    
    // If taskId is provided, update the task directly
    if (taskId) {
      try {
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            labels: newLabels.map(l => l.id)
          })
        })
        
        if (!response.ok) {
          throw new Error('Failed to remove label from task')
        }
        
        toast.success('Label removed')
        onTaskUpdate?.()
      } catch (error) {
        toast.error('Failed to remove label')
        return
      }
    }
    
    onLabelsChange?.(newLabels)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {selectedLabels.map((label) => (
          <Badge
            key={label.id}
            variant="outline"
            className="flex items-center gap-1"
            style={{ borderColor: label.color, color: label.color }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: label.color }}
            />
            {label.name}
            <button
              onClick={() => handleRemoveLabel(label.id)}
              className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen} modal={true}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-6">
              <Plus className="w-3 h-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Select Labels</h4>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setShowCreateForm(!showCreateForm)
                    if (showCreateForm) {
                      // Reset form when closing
                      setNewLabelForm({ name: '', color: '#3B82F6' })
                    }
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {showCreateForm ? 'Cancel' : 'Create'}
                </Button>
              </div>
              
              {showCreateForm && (
                <div className="space-y-3 p-3 border rounded-md bg-gray-50" onClick={(e) => e.stopPropagation()}>
                  <div>
                    <Label htmlFor="new-label-name" className="text-xs">Name</Label>
                    <Input
                      id="new-label-name"
                      value={newLabelForm.name}
                      onChange={(e) => {
                        e.stopPropagation()
                        setNewLabelForm(prev => ({ ...prev, name: e.target.value }))
                      }}
                      placeholder="Label name"
                      className="h-8 text-sm"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      onFocus={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        e.stopPropagation()
                        if (e.key === 'Enter' && !isCreating) {
                          handleCreateLabel()
                        }
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-label-color" className="text-xs">Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        id="new-label-color"
                        type="color"
                        value={newLabelForm.color}
                        onChange={(e) => {
                          e.stopPropagation()
                          setNewLabelForm(prev => ({ ...prev, color: e.target.value }))
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-8 h-8 border rounded cursor-pointer"
                      />
                      <span className="text-xs text-gray-500">{newLabelForm.color}</span>
                    </div>
                  </div>
                  <Button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleCreateLabel()
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    disabled={!newLabelForm.name.trim() || isCreating}
                    size="sm"
                    className="w-full"
                  >
                    {isCreating ? 'Creating...' : 'Create Label'}
                  </Button>
                </div>
              )}
              
              {showCreateForm && <div className="border-t my-2" />}
              
              <div className="max-h-48 overflow-y-auto space-y-1">
                {labels.map((label) => {
                  const isSelected = selectedLabels.some(l => l.id === label.id)
                  return (
                    <button
                      key={label.id}
                      onClick={() => handleToggleLabel(label)}
                      className={`w-full flex items-center gap-2 p-2 rounded-md text-left hover:bg-gray-50 ${
                        isSelected ? 'bg-blue-50 border border-blue-200' : ''
                      }`}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: label.color || '#3B82F6' }}
                      />
                      <span className="flex-1">{label.name}</span>
                      {isSelected && (
                        <Badge variant="secondary" className="text-xs">
                          Selected
                        </Badge>
                      )}
                    </button>
                  )
                })}
                
                {labels.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No labels found. Create your first label.
                  </p>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

    </div>
  )
}