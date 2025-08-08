"use client"

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sparkles,
  Wand2,
  Upload,
  X,
  Check,
  Edit3,
  Loader2,
  AlertCircle,
  Clock,
  User,
  Target,
  CheckCircle2,
  Lightbulb
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ITEM_TYPES, PRIORITIES, getItemTypeById, getPriorityById } from '@/lib/constants'
import { useOptimisticUpdates } from '@/lib/optimistic-updates'
import { logger } from '@/lib/logger'
import type { AITask, AITaskGeneration } from '@/lib/ai/schemas'

// Utility function to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const result = reader.result as string
      // Remove the data:image/jpeg;base64, prefix to get just the base64 string
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = error => reject(error)
  })
}

interface MagicTaskGeneratorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  boardId?: string
  boardType?: 'scrum' | 'kanban'
  columnId?: string
  sprintId?: string
  organizationId: string
  onTasksGenerated?: (tasks: AITask[]) => void
  onTasksCreated?: (tasks: any[]) => void
  placeholder?: string
  title?: string
  description?: string
  maxTasks?: number
  initialPrompt?: string
  initialImages?: File[]
}

interface TaskPreview extends AITask {
  selected: boolean
  editing: boolean
  editTitle: string
}

export function MagicTaskGenerator({
  open,
  onOpenChange,
  boardId,
  boardType = 'scrum',
  columnId,
  sprintId,
  organizationId,
  onTasksGenerated,
  onTasksCreated,
  placeholder = "Describe what you want to build, and I'll break it down into actionable tasks...",
  title = "AI Magic Task Generator",
  description = "Transform your ideas into structured tasks",
  maxTasks = 10,
  initialPrompt = '',
  initialImages = []
}: MagicTaskGeneratorProps) {
  const [input, setInput] = useState(initialPrompt)
  const [images, setImages] = useState<File[]>(initialImages)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [generation, setGeneration] = useState<AITaskGeneration | null>(null)
  const [taskPreviews, setTaskPreviews] = useState<TaskPreview[]>([])
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set())
  const [showPreview, setShowPreview] = useState(false)
  const [options, setOptions] = useState({
    maxTasks,
    detailLevel: 'detailed' as 'basic' | 'detailed' | 'comprehensive',
    generateSprintPlan: boardType === 'scrum',
    suggestAssignees: true
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAddImages = (files: File[]) => {
    setImages(prev => [...prev, ...files])
  }

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleGenerate = async () => {
    if (!input.trim()) {
      toast.error('Please describe what you want to build')
      return
    }

    if (!organizationId) {
      toast.error('Organization context is required')
      return
    }

    setIsGenerating(true)
    setGeneration(null)
    setTaskPreviews([])

    try {
      logger.log('Magic Task Generator: Starting generation', {
        inputLength: input.length,
        boardType,
        maxTasks: options.maxTasks,
        imageCount: images.length
      })

      // Convert images to base64
      const imageData = await Promise.all(
        images.map(async (file) => ({
          data: await fileToBase64(file),
          mimeType: file.type,
          name: file.name
        }))
      )

      const response = await fetch('/api/ai/generate-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: input.trim(),
          boardType,
          boardId,
          columnId,
          sprintId,
          images: imageData,
          options
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate tasks')
      }

      const result = await response.json()
      const generatedData = result.data as AITaskGeneration

      setGeneration(generatedData)
      
      // Create task previews with edit capabilities
      const previews: TaskPreview[] = generatedData.tasks.map(task => ({
        ...task,
        selected: true,
        editing: false,
        editTitle: task.title
      }))
      
      setTaskPreviews(previews)
      setSelectedTasks(new Set(previews.map((_, index) => index)))
      setShowPreview(true)

      onTasksGenerated?.(generatedData.tasks)

      toast.success(`Generated ${generatedData.tasks.length} tasks successfully!`)
      
      logger.log('Magic Task Generator: Generation completed', {
        taskCount: generatedData.tasks.length
      })

    } catch (error) {
      logger.error('Magic Task Generator: Generation failed', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate tasks')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCreateTasks = async () => {
    if (taskPreviews.length === 0) return

    const tasksToCreate = taskPreviews
      .filter((_, index) => selectedTasks.has(index))
      .map(preview => ({
        title: preview.editTitle || preview.title,
        description: preview.description,
        taskType: preview.taskType,
        priority: preview.priority,
        storyPoints: preview.storyPoints,
        estimatedHours: preview.estimatedHours,
        labels: preview.labels,
        assigneeId: preview.suggestedAssignee,
        acceptanceCriteria: preview.acceptanceCriteria,
        sprintRecommendation: preview.sprintRecommendation,
        reasoning: preview.reasoning
      }))

    if (tasksToCreate.length === 0) {
      toast.error('Please select at least one task to create')
      return
    }

    setIsCreating(true)

    try {
      logger.log('Magic Task Generator: Creating tasks', {
        taskCount: tasksToCreate.length,
        boardId
      })

      const response = await fetch('/api/ai/create-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tasks: tasksToCreate,
          boardId,
          columnId,
          sprintId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create tasks')
      }

      const result = await response.json()
      const createdTasks = result.data.tasks

      onTasksCreated?.(createdTasks)
      
      toast.success(`Created ${createdTasks.length} tasks successfully!`)
      
      // Reset form
      setInput('')
      setGeneration(null)
      setTaskPreviews([])
      setSelectedTasks(new Set())
      setShowPreview(false)
      onOpenChange(false)

    } catch (error) {
      logger.error('Magic Task Generator: Task creation failed', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create tasks')
    } finally {
      setIsCreating(false)
    }
  }

  const toggleTaskSelection = (index: number) => {
    const newSelected = new Set(selectedTasks)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedTasks(newSelected)
  }

  const toggleTaskEdit = (index: number) => {
    const newPreviews = [...taskPreviews]
    newPreviews[index].editing = !newPreviews[index].editing
    if (newPreviews[index].editing) {
      newPreviews[index].editTitle = newPreviews[index].title
    }
    setTaskPreviews(newPreviews)
  }

  const updateTaskTitle = (index: number, newTitle: string) => {
    const newPreviews = [...taskPreviews]
    newPreviews[index].editTitle = newTitle
    setTaskPreviews(newPreviews)
  }

  const saveTaskEdit = (index: number) => {
    const newPreviews = [...taskPreviews]
    newPreviews[index].title = newPreviews[index].editTitle
    newPreviews[index].editing = false
    setTaskPreviews(newPreviews)
  }

  const renderTaskPreview = (task: TaskPreview, index: number) => {
    const itemType = getItemTypeById(task.taskType)
    const priority = getPriorityById(task.priority)
    const isSelected = selectedTasks.has(index)

    return (
      <Card
        key={index}
        className={cn(
          "border transition-all duration-200",
          isSelected 
            ? "border-blue-300 bg-blue-50 shadow-sm" 
            : "border-gray-200 opacity-75 hover:opacity-100"
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggleTaskSelection(index)}
              className="mt-1"
            />
            
            <div className="flex-1 space-y-2">
              {/* Task Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  {task.editing ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={task.editTitle}
                        onChange={(e) => updateTaskTitle(index, e.target.value)}
                        className="text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            saveTaskEdit(index)
                          } else if (e.key === 'Escape') {
                            toggleTaskEdit(index)
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => saveTaskEdit(index)}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm text-gray-900">
                        {task.title}
                      </h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleTaskEdit(index)}
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Task Details */}
              {task.description && (
                <p className="text-xs text-gray-600 line-clamp-2">
                  {task.description}
                </p>
              )}

              {/* Task Badges */}
              <div className="flex flex-wrap items-center gap-1">
                <Badge variant="outline" className={cn("text-xs", itemType?.color, itemType?.bgColor)}>
                  {itemType?.icon} {itemType?.name}
                </Badge>
                
                <Badge variant="outline" className={cn("text-xs", priority?.color, priority?.bgColor)}>
                  {priority?.icon} {priority?.name}
                </Badge>

                {task.storyPoints && (
                  <Badge variant="outline" className="text-xs">
                    <Target className="h-3 w-3 mr-1" />
                    {task.storyPoints} SP
                  </Badge>
                )}

                {task.estimatedHours && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {task.estimatedHours}h
                  </Badge>
                )}

                {task.sprintRecommendation && boardType === 'scrum' && (
                  <Badge variant="outline" className="text-xs">
                    {task.sprintRecommendation}
                  </Badge>
                )}
              </div>

              {/* Acceptance Criteria */}
              {task.acceptanceCriteria && task.acceptanceCriteria.length > 0 && (
                <div className="text-xs">
                  <span className="font-medium text-gray-700">Acceptance Criteria:</span>
                  <ul className="mt-1 space-y-1">
                    {task.acceptanceCriteria.slice(0, 2).map((criteria, idx) => (
                      <li key={idx} className="flex items-start gap-1 text-gray-600">
                        <CheckCircle2 className="h-3 w-3 mt-0.5 text-green-500" />
                        <span>{criteria}</span>
                      </li>
                    ))}
                    {task.acceptanceCriteria.length > 2 && (
                      <li className="text-gray-500">
                        +{task.acceptanceCriteria.length - 2} more criteria
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* AI Reasoning */}
              {task.reasoning && (
                <div className="text-xs">
                  <span className="font-medium text-gray-700 flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" />
                    AI Reasoning:
                  </span>
                  <p className="text-gray-600 mt-1 italic">{task.reasoning}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            {title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Input Section */}
          {!showPreview && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>What do you want to build?</Label>
                <Textarea
                  placeholder={placeholder}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={6}
                  className="resize-none min-h-[150px] max-h-[300px] overflow-y-auto"
                />
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>{input.length} characters</span>
                  <span>Minimum 10 characters required</span>
                </div>
              </div>

              {/* Options */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <Label className="text-xs">Max Tasks</Label>
                  <Select
                    value={options.maxTasks.toString()}
                    onValueChange={(value) => setOptions(prev => ({
                      ...prev,
                      maxTasks: parseInt(value)
                    }))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 tasks</SelectItem>
                      <SelectItem value="10">10 tasks</SelectItem>
                      <SelectItem value="15">15 tasks</SelectItem>
                      <SelectItem value="20">20 tasks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Detail Level</Label>
                  <Select
                    value={options.detailLevel}
                    onValueChange={(value: 'basic' | 'detailed' | 'comprehensive') => setOptions(prev => ({
                      ...prev,
                      detailLevel: value
                    }))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="detailed">Detailed</SelectItem>
                      <SelectItem value="comprehensive">Comprehensive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Generate Button */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={!input.trim() || isGenerating}
                  className="min-w-[120px]"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate Tasks
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Preview Section */}
          {showPreview && (
            <div className="space-y-4">
              {/* Summary */}
              {generation && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-medium text-blue-900 mb-2">Generation Summary</h3>
                  <p className="text-sm text-blue-800 mb-3">{generation.summary}</p>
                  <div className="flex items-center gap-4 text-sm text-blue-700">
                    <span>📋 {generation.totalTasks} tasks generated</span>
                    {generation.sprintPlan && (
                      <span>🚀 {generation.sprintPlan.sprintsNeeded?.length || 0} sprints planned</span>
                    )}
                  </div>
                </div>
              )}

              {/* Task Selection */}
              <div className="flex items-center justify-between">
                <h3 className="font-medium">
                  Review & Select Tasks ({selectedTasks.size} of {taskPreviews.length} selected)
                </h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTasks(new Set(taskPreviews.map((_, i) => i)))}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTasks(new Set())}
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              {/* Task List */}
              <ScrollArea className="h-64">
                <div className="space-y-3 pr-4">
                  {taskPreviews.map((task, index) => renderTaskPreview(task, index))}
                </div>
              </ScrollArea>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(false)}
                  disabled={isCreating}
                >
                  ← Back to Edit
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateTasks}
                    disabled={selectedTasks.size === 0 || isCreating}
                    className="min-w-[120px]"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Create {selectedTasks.size} Task{selectedTasks.size !== 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}