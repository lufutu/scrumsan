"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/animate-ui/radix/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/animate-ui/radix/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/animate-ui/radix/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  ArrowLeft,
  Plus, 
  MoreHorizontal, 
  Settings,
  Edit,
  Trash2,
  Target,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
  Users,
  Square,
  BarChart3,
  TrendingDown
} from 'lucide-react'
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DragStart,
} from '@hello-pangea/dnd'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from 'sonner'
import { ComprehensiveInlineForm } from './ComprehensiveInlineForm'
import { ItemModal } from './ItemModal'
import { getPriorityColor } from '@/lib/constants'

interface Task {
  id: string
  title: string
  description?: string
  status?: string
  taskType?: string
  priority?: string
  storyPoints?: number
  labels?: string[]
  assignee?: {
    id: string
    fullName?: string
    avatarUrl?: string
  }
  dueDate?: string
}

interface SprintColumn {
  id: string
  name: string
  position: number
  isDone: boolean
  wipLimit?: number
  tasks: Task[]
}

interface Sprint {
  id: string
  name: string
  goal?: string
  status: 'planning' | 'active' | 'completed'
  startDate?: string
  endDate?: string
}

interface SprintBacklogProps {
  sprint: Sprint
  onBackToBacklog?: () => void // Make optional since AppHeader handles this
}

// Draggable Task Component
function DraggableTask({ task, index, onTaskClick }: { task: Task; index: number; onTaskClick: (task: Task) => void }) {

  const getTaskTypeIcon = (type?: string) => {
    switch (type) {
      case 'story': return '📖'
      case 'bug': return '🐛'
      case 'task': return '✅'
      case 'epic': return '🎯'
      default: return '📋'
    }
  }

  const getPriorityBorderColor = (priority?: string) => {
    const colors = getPriorityColor(priority || '')
    switch (priority) {
      case 'critical': return 'border-l-red-500 bg-red-50'
      case 'high': return 'border-l-orange-500 bg-orange-50'
      case 'medium': return 'border-l-yellow-500 bg-yellow-50'
      case 'low': return 'border-l-green-500 bg-green-50'
      default: return 'border-l-gray-300 bg-white'
    }
  }

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div 
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`border-l-4 rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${getPriorityBorderColor(task.priority)}`}
          style={{
            ...provided.draggableProps.style,
            opacity: snapshot.isDragging ? 0.5 : 1,
          }}
          onDoubleClick={() => !snapshot.isDragging && onTaskClick(task)}
        >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-sm">
          {getTaskTypeIcon(task.taskType)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm truncate">{task.title}</h4>
            {task.storyPoints && (
              <Badge variant="outline" className="text-xs">
                {task.storyPoints}
              </Badge>
            )}
          </div>
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {task.description}
            </p>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {task.assignee && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center text-xs">
                    {task.assignee.fullName?.charAt(0)}
                  </div>
                  <span className="truncate max-w-20">{task.assignee.fullName}</span>
                </div>
              )}
            </div>
            {task.dueDate && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{new Date(task.dueDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
      )}
    </Draggable>
  )
}

// Sprint Column Component
function SprintColumnComponent({ 
  column, 
  onEditColumn,
  onDeleteColumn,
  onSetWipLimit,
  onMarkAsDone,
  onExport,
  onAddTask,
  users,
  labels
}: { 
  column: SprintColumn
  onAddColumn: () => void
  onEditColumn: (id: string, name: string) => void
  onDeleteColumn: (id: string) => void
  onSetWipLimit: (id: string, limit?: number) => void
  onMarkAsDone: (id: string, isDone: boolean) => void
  onExport: (id: string, format: 'csv' | 'json') => void
  onAddTask: (columnId: string, data: any) => void
  users: any[]
  labels: any[]
}) {
  const [showInlineForm, setShowInlineForm] = useState(false)

  const isLimitExceeded = column.wipLimit && column.tasks.length > column.wipLimit
  const columnColor = column.name === 'To Do' ? 'bg-gray-100' : 
                     column.name === 'In Progress' ? 'bg-yellow-100' : 
                     column.name === 'Done' ? 'bg-green-100' : 'bg-blue-100'

  return (
    <Droppable droppableId={column.id}>
      {(provided, snapshot) => (
        <Card 
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`min-h-[500px] transition-colors ${isLimitExceeded ? 'border-red-300' : ''} ${
            snapshot.isDraggingOver ? 'ring-2 ring-blue-400 bg-blue-50/50' : ''
          }`}
        >
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              column.name === 'To Do' ? 'bg-gray-500' :
              column.name === 'In Progress' ? 'bg-yellow-500' :
              column.name === 'Done' ? 'bg-green-500' : 'bg-blue-500'
            }`} />
            <span>{column.name}</span>
            {column.isDone && <Badge variant="secondary" className="text-xs">Done</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isLimitExceeded ? "destructive" : "secondary"} className="text-xs">
              {column.tasks.length}{column.wipLimit ? `/${column.wipLimit}` : ''}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  const newName = prompt('Enter new column name:', column.name)
                  if (newName) onEditColumn(column.id, newName)
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Rename Column
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onMarkAsDone(column.id, !column.isDone)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {column.isDone ? 'Unmark as Done' : 'Mark as Done'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  const limit = prompt('Enter WIP limit (0 for no limit):', String(column.wipLimit || 0))
                  if (limit !== null) onSetWipLimit(column.id, parseInt(limit) || undefined)
                }}>
                  <Users className="h-4 w-4 mr-2" />
                  Set WIP Limit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onExport(column.id, 'csv')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport(column.id, 'json')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export as JSON
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDeleteColumn(column.id)}
                  className="text-destructive"
                  disabled={['todo', 'in-progress', 'done'].includes(column.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Column
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {column.tasks.map((task, index) => (
          <DraggableTask key={task.id} task={task} index={index} onTaskClick={setSelectedTask} />
        ))}
        {column.tasks.length === 0 && !showInlineForm && (
          <div className="text-center text-sm text-muted-foreground py-8 border-2 border-dashed border-gray-200 rounded-lg">
            Drop tasks here
          </div>
        )}
        
        {/* Inline Form */}
        {showInlineForm && (
          <div className="pt-2">
            <ComprehensiveInlineForm
              onAdd={async (data) => {
                await onAddTask(column.id, data)
                setShowInlineForm(false)
              }}
              onCancel={() => setShowInlineForm(false)}
              placeholder="What needs to be done?"
              users={users}
              labels={labels}
            />
          </div>
        )}
        
        {/* Add Task Button */}
        {!showInlineForm && (
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-foreground mt-2"
            onClick={() => setShowInlineForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        )}
        {provided.placeholder}
      </CardContent>
    </Card>
      )}
    </Droppable>
  )
}

export default function SprintBacklog({ sprint, onBackToBacklog }: SprintBacklogProps) {
  
  const [activeTab, setActiveTab] = useState('board')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string[]>([])
  const [isEditSprintOpen, setIsEditSprintOpen] = useState(false)
  const [isFinishSprintOpen, setIsFinishSprintOpen] = useState(false)
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [editedSprint, setEditedSprint] = useState({
    name: sprint.name,
    goal: sprint.goal || '',
    startDate: sprint.startDate || '',
    endDate: sprint.endDate || ''
  })

  // Sprint columns data
  const [columns, setColumns] = useState<SprintColumn[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Users and labels data
  const [users, setUsers] = useState<Array<{ id: string; fullName: string; email: string }>>([])
  const [labels, setLabels] = useState<Array<{ id: string; name: string; color: string | null }>>([])
  const [dataLoading, setDataLoading] = useState(true)
  
  // Task modal state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  
  // Fetch columns from API
  const fetchColumns = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/sprints/${sprint.id}/columns`)
      if (!response.ok) {
        throw new Error('Failed to fetch sprint columns')
      }
      const data = await response.json()
      setColumns(data)
    } catch (error) {
      console.error('Error fetching sprint columns:', error)
      // Fallback to default columns if API fails
      setColumns([
        {
          id: 'todo',
          name: 'To Do',
          position: 1,
          isDone: false,
          tasks: []
        },
        {
          id: 'in-progress',
          name: 'In Progress',
          position: 2,
          isDone: false,
          tasks: []
        },
        {
          id: 'done',
          name: 'Done',
          position: 3,
          isDone: true,
          tasks: []
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }
  
  // Fetch users and labels data
  const fetchUsersAndLabels = async () => {
    try {
      setDataLoading(true)
      
      // Get the sprint to find boardId
      const sprintResponse = await fetch(`/api/sprints/${sprint.id}`)
      if (!sprintResponse.ok) throw new Error('Failed to fetch sprint')
      const sprintData = await sprintResponse.json()
      
      // Fetch users and labels for the board
      const [usersResponse, labelsResponse] = await Promise.all([
        fetch(`/api/boards/${sprintData.board.id}/users`),
        fetch(`/api/boards/${sprintData.board.id}/labels`)
      ])
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData)
      }
      
      if (labelsResponse.ok) {
        const labelsData = await labelsResponse.json()
        setLabels(labelsData)
      }
    } catch (error) {
      console.error('Error fetching users and labels:', error)
      // Set empty arrays as fallback
      setUsers([])
      setLabels([])
    } finally {
      setDataLoading(false)
    }
  }
  
  // Load data on component mount
  useEffect(() => {
    fetchColumns()
    fetchUsersAndLabels()
  }, [sprint.id])




  const allTasks = columns.flatMap(col => col.tasks)
  const totalTasks = allTasks.length
  const completedTasks = columns.find(col => col.isDone)?.tasks.length || 0
  const inProgressTasks = columns.find(col => col.name === 'In Progress')?.tasks.length || 0
  const todoTasks = columns.find(col => col.name === 'To Do')?.tasks.length || 0

  const totalStoryPoints = allTasks.reduce((sum, task) => sum + (task.storyPoints || 0), 0)
  const completedStoryPoints = columns.find(col => col.isDone)?.tasks.reduce((sum, task) => sum + (task.storyPoints || 0), 0) || 0

  const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
  const storyPointsPercentage = totalStoryPoints > 0 ? (completedStoryPoints / totalStoryPoints) * 100 : 0

  // Calculate days remaining
  const startDate = sprint.startDate ? new Date(sprint.startDate) : new Date()
  const endDate = sprint.endDate ? new Date(sprint.endDate) : new Date()
  const today = new Date()
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const daysElapsed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const daysRemaining = Math.max(0, totalDays - daysElapsed)

  const handleDragStart = (start: DragStart) => {
    const task = allTasks.find(t => t.id === start.draggableId)
    setActiveTask(task || null)
  }

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result
    setActiveTask(null)

    if (!destination) return

    const taskId = draggableId
    const sourceColumnId = source.droppableId
    const targetColumnId = destination.droppableId
    
    // If dropped in same position, do nothing
    if (sourceColumnId === targetColumnId && source.index === destination.index) {
      return
    }

    // Find the task being moved
    const taskToMove = allTasks.find(task => task.id === taskId)
    if (!taskToMove) return

    // Store original state for rollback
    const originalColumns = columns.map(col => ({ ...col, tasks: [...col.tasks] }))

    // Optimistically update UI immediately
    const newColumns = columns.map(col => ({ ...col, tasks: [...col.tasks] }))
    
    // Remove task from source column
    const sourceColumn = newColumns.find(col => col.id === sourceColumnId)
    if (sourceColumn) {
      sourceColumn.tasks.splice(source.index, 1)
    }

    // Add task to destination column at specific position
    const targetColumn = newColumns.find(col => col.id === targetColumnId)
    if (targetColumn) {
      const updatedTask = { ...taskToMove, sprintColumnId: targetColumnId }
      targetColumn.tasks.splice(destination.index, 0, updatedTask)
    }

    // Update UI immediately
    setColumns(newColumns)

    try {
      if (sourceColumnId === targetColumnId) {
        // Handle position change within the same column
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: destination.index })
        })

        if (!response.ok) {
          throw new Error('Failed to update task position')
        }

        toast.success('Task position updated')
      } else {
        // Handle column change
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            sprintColumnId: targetColumnId,
            position: destination.index 
          })
        })

        if (!response.ok) {
          throw new Error('Failed to move task')
        }

        toast.success('Task moved successfully')
      }
    } catch (error: any) {
      // Rollback to original state on error
      setColumns(originalColumns)
      toast.error(error.message || 'Failed to move task')
    }
  }

  const handleAddTask = async (columnId: string, data: {
    title: string;
    taskType: string;
    assigneeId?: string;
    labels?: string[];
    storyPoints?: number;
    priority?: string;
  }) => {
    try {
      const taskData = {
        title: data.title,
        description: '',
        taskType: data.taskType as 'story' | 'bug' | 'task' | 'epic' | 'improvement',
        storyPoints: data.storyPoints || 0,
        assigneeId: data.assigneeId,
        labels: data.labels || [],
        priority: data.priority,
        // Sprint Backlog context: assign task to specific sprint column
        sprintColumnId: columnId,
        sprintId: sprint.id
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create task')
      }

      // Refresh the columns data
      fetchColumns()
      toast.success('Task created successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to create task')
    }
  }

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return
    
    try {
      const response = await fetch(`/api/sprints/${sprint.id}/columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newColumnName.trim(),
          position: columns.length,
          isDone: false
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create column')
      }
      
      const newColumn = await response.json()
      setColumns(prev => [...prev, newColumn])
      setNewColumnName('')
      setIsAddColumnOpen(false)
      toast.success('Column added successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to add column')
    }
  }

  const handleEditColumn = async (id: string, name: string) => {
    try {
      const response = await fetch(`/api/sprints/${sprint.id}/columns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update column')
      }
      
      const updatedColumn = await response.json()
      setColumns(prev => prev.map(col => 
        col.id === id ? { ...col, ...updatedColumn } : col
      ))
      toast.success('Column renamed successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to rename column')
    }
  }

  const handleDeleteColumn = async (id: string) => {
    const column = columns.find(col => col.id === id)
    if (column && column.tasks.length > 0) {
      toast.error('Cannot delete column with tasks')
      return
    }
    
    try {
      const response = await fetch(`/api/sprints/${sprint.id}/columns/${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete column')
      }
      
      setColumns(prev => prev.filter(col => col.id !== id))
      toast.success('Column deleted successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete column')
    }
  }

  const handleSetWipLimit = async (id: string, limit?: number) => {
    try {
      const response = await fetch(`/api/sprints/${sprint.id}/columns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wipLimit: limit })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update WIP limit')
      }
      
      const updatedColumn = await response.json()
      setColumns(prev => prev.map(col => 
        col.id === id ? { ...col, ...updatedColumn } : col
      ))
      toast.success('WIP limit updated')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update WIP limit')
    }
  }

  const handleMarkAsDone = async (id: string, isDone: boolean) => {
    try {
      const response = await fetch(`/api/sprints/${sprint.id}/columns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDone })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update column')
      }
      
      const updatedColumn = await response.json()
      setColumns(prev => prev.map(col => 
        col.id === id ? { ...col, ...updatedColumn } : col
      ))
      toast.success(`Column marked as ${isDone ? 'done' : 'not done'}`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to update column')
    }
  }

  const handleReorderColumn = async (columnId: string, newPosition: number) => {
    try {
      const response = await fetch(`/api/sprints/${sprint.id}/columns/${columnId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position: newPosition })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to reorder column')
      }
      
      // Update local state - reorder columns based on new positions
      const reorderedColumns = [...columns]
      const movedColumn = reorderedColumns.find(col => col.id === columnId)
      if (movedColumn) {
        // Remove from current position
        const currentIndex = reorderedColumns.indexOf(movedColumn)
        reorderedColumns.splice(currentIndex, 1)
        // Insert at new position
        reorderedColumns.splice(newPosition, 0, { ...movedColumn, position: newPosition })
        // Update positions for all affected columns
        reorderedColumns.forEach((col, index) => {
          col.position = index
        })
        setColumns(reorderedColumns)
      }
      
      toast.success('Column reordered successfully')
    } catch (error: unknown) {
      toast.error(error.message || 'Failed to reorder column')
    }
  }

  const handleExport = (columnId: string, format: 'csv' | 'json') => {
    const column = columns.find(col => col.id === columnId)
    if (!column) return

    const data = column.tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      storyPoints: task.storyPoints,
      assignee: task.assignee?.fullName
    }))

    if (format === 'csv') {
      const csv = [
        Object.keys(data[0] || {}).join(','),
        ...data.map(row => Object.values(row).map(v => `"${v || ''}"`).join(','))
      ].join('\n')
      
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${column.name}_tasks.csv`
      a.click()
    } else {
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${column.name}_tasks.json`
      a.click()
    }
    
    toast.success(`${column.name} exported as ${format.toUpperCase()}`)
  }

  const filteredColumns = columns.map(col => ({
    ...col,
    tasks: col.tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (task.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      const matchesFilter = filterStatus.length === 0 || filterStatus.includes(col.name.toLowerCase().replace(' ', '-'))
      return matchesSearch && matchesFilter
    })
  }))

  // Show loading state while data is loading
  if (isLoading || dataLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sprint data...</p>
        </div>
      </div>
    )
  }

  return (
    <DragDropContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full">
        {/* Sprint Content */}
        <div className="space-y-6">

          {/* Sprint Goal */}
          {sprint.goal && (
            <Card className="bg-blue-50 border-blue-200 mb-4">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <Target className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900">Sprint Goal</h3>
                    <p className="text-blue-800">{sprint.goal}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sprint Progress */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Tasks Completed</p>
                    <p className="text-2xl font-bold">{completedTasks}/{totalTasks}</p>
                    <Progress value={completionPercentage} className="mt-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Story Points</p>
                    <p className="text-2xl font-bold">{completedStoryPoints}/{totalStoryPoints}</p>
                    <Progress value={storyPointsPercentage} className="mt-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">In Progress</p>
                    <p className="text-2xl font-bold">{inProgressTasks}</p>
                    <p className="text-sm text-muted-foreground mt-2">tasks active</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Time Remaining</p>
                    <p className="text-2xl font-bold">{daysRemaining}</p>
                    <p className="text-sm text-muted-foreground mt-2">days left</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sprint Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="board">Sprint Board</TabsTrigger>
            <TabsTrigger value="burndown">Burndown Chart</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="board" className="mt-6">
            <div className="space-y-6">
              {/* Search and Filter */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tasks..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter {filterStatus.length > 0 && `(${filterStatus.length})`}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Filter by Column</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {columns.map(col => (
                      <DropdownMenuCheckboxItem
                        key={col.id}
                        checked={filterStatus.includes(col.name.toLowerCase().replace(' ', '-'))}
                        onCheckedChange={(checked) => 
                          setFilterStatus(prev => 
                            checked 
                              ? [...prev, col.name.toLowerCase().replace(' ', '-')]
                              : prev.filter(s => s !== col.name.toLowerCase().replace(' ', '-'))
                          )
                        }
                      >
                        {col.name}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button onClick={() => setIsAddColumnOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Column
                </Button>
              </div>

              {/* Sprint Board */}
              <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${filteredColumns.length}, minmax(300px, 1fr))` }}>
                {filteredColumns.map((column) => (
                  <SprintColumnComponent
                    key={column.id}
                    column={column}
                    onAddColumn={() => setIsAddColumnOpen(true)}
                    onEditColumn={handleEditColumn}
                    onDeleteColumn={handleDeleteColumn}
                    onSetWipLimit={handleSetWipLimit}
                    onMarkAsDone={handleMarkAsDone}
                    onExport={handleExport}
                    onAddTask={handleAddTask}
                    users={users || []}
                    labels={labels || []}
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="burndown" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5" />
                  Burndown Chart
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Burndown chart implementation coming soon...
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sprint Velocity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Planned Story Points:</span>
                      <span className="font-bold">{totalStoryPoints}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completed Story Points:</span>
                      <span className="font-bold text-green-600">{completedStoryPoints}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Velocity (points/day):</span>
                      <span className="font-bold">
                        {daysElapsed > 0 ? (completedStoryPoints / daysElapsed).toFixed(1) : '0'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Team Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Tasks:</span>
                      <span className="font-bold">{totalTasks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completion Rate:</span>
                      <span className="font-bold text-green-600">{completionPercentage.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Task Size:</span>
                      <span className="font-bold">
                        {totalTasks > 0 ? (totalStoryPoints / totalTasks).toFixed(1) : '0'} pts
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Sprint Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Days Elapsed:</span>
                      <span className="font-bold">{daysElapsed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Days Remaining:</span>
                      <span className="font-bold text-orange-600">{daysRemaining}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Progress Trend:</span>
                      <span className={`font-bold ${
                        storyPointsPercentage >= (daysElapsed / totalDays) * 100 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {storyPointsPercentage >= (daysElapsed / totalDays) * 100 ? 'On Track' : 'Behind'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="reports" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sprint Summary Report</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm space-y-2">
                    <h4 className="font-semibold">Sprint Overview</h4>
                    <p>Sprint: {sprint.name}</p>
                    <p>Goal: {sprint.goal || 'No goal specified'}</p>
                    <p>Duration: {totalDays} days</p>
                    <p>Status: Active ({daysElapsed}/{totalDays} days completed)</p>
                  </div>
                  
                  <div className="text-sm space-y-2">
                    <h4 className="font-semibold">Work Summary</h4>
                    <p>Total Items: {totalTasks}</p>
                    <p>Completed: {completedTasks} ({completionPercentage.toFixed(1)}%)</p>
                    <p>In Progress: {inProgressTasks}</p>
                    <p>Remaining: {todoTasks}</p>
                  </div>
                  
                  <div className="text-sm space-y-2">
                    <h4 className="font-semibold">Story Points</h4>
                    <p>Planned: {totalStoryPoints} pts</p>
                    <p>Completed: {completedStoryPoints} pts ({storyPointsPercentage.toFixed(1)}%)</p>
                    <p>Remaining: {totalStoryPoints - completedStoryPoints} pts</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Export Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full">
                    Export Sprint Report (PDF)
                  </Button>
                  <Button variant="outline" className="w-full">
                    Export Task List (CSV)
                  </Button>
                  <Button variant="outline" className="w-full">
                    Export Burndown Data (Excel)
                  </Button>
                  <Button variant="outline" className="w-full">
                    Share Sprint Dashboard
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <Dialog open={isEditSprintOpen} onOpenChange={setIsEditSprintOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Sprint</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Sprint Name</Label>
                <Input
                  id="name"
                  value={editedSprint.name}
                  onChange={(e) => setEditedSprint(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="goal">Sprint Goal</Label>
                <Textarea
                  id="goal"
                  value={editedSprint.goal}
                  onChange={(e) => setEditedSprint(prev => ({ ...prev, goal: e.target.value }))}
                  placeholder="What do you want to achieve in this sprint?"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={editedSprint.startDate}
                    onChange={(e) => setEditedSprint(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={editedSprint.endDate}
                    onChange={(e) => setEditedSprint(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsEditSprintOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsEditSprintOpen(false)}>
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isAddColumnOpen} onOpenChange={setIsAddColumnOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Column</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="columnName">Column Name</Label>
                <Input
                  id="columnName"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Enter column name..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsAddColumnOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddColumn} disabled={!newColumnName.trim()}>
                Add Column
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isFinishSprintOpen} onOpenChange={setIsFinishSprintOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Complete Sprint</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to complete this sprint? All unfinished items will be moved back to the Product Backlog.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => setIsFinishSprintOpen(false)}>
                Complete Sprint
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      
      {/* Drag overlay can be implemented if needed */}

      {/* Task Modal */}
      {selectedTask && (
        <ItemModal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          taskId={selectedTask.id}
          onUpdate={() => {
            fetchColumns()
          }}
        />
      )}
    </DragDropContext>
  )
}