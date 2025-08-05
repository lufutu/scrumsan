"use client"

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/animate-ui/radix/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/animate-ui/radix/tabs'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/animate-ui/radix/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import {
  Square,
  Calendar,
  Target,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertCircle,
  MoreHorizontal,
  BarChart3,
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  Users,
  Upload,
  FileText,
  FileSpreadsheet,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
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
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DragStart,
} from '@hello-pangea/dnd'
import { TaskCardModern } from './TaskCardModern'
import { ItemModal } from './ItemModal'
import BurndownChart from './BurndownChart'
import { Sprint, Task, TaskAssignee, TaskLabel, SprintColumn } from '@/types/shared'
import { useSprintColumns } from '@/hooks/useSprintColumns'
import { toast } from 'sonner'
import { ComprehensiveInlineForm } from './ComprehensiveInlineForm'
import { BacklogDropZone } from './BacklogDropZone'



interface SprintBacklogViewProps {
  sprint: Sprint
  boardId: string
  organizationId?: string
  onRefresh: () => void
  onBackToBacklog?: () => void // Optional since AppHeader handles this
  onFinishSprint?: (sprintId: string) => void
  isEditDialogOpen?: boolean
  onEditDialogChange?: (open: boolean) => void
}

interface User {
  id: string
  fullName: string | null
  email: string
  avatarUrl: string | null
}

interface Label {
  id: string
  name: string
  color: string | null
}



const DraggableTask = ({ task, index, onTaskClick, boardId, onTaskUpdate, mutateColumns, ...props }: any) => {
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => {
        const style = provided.draggableProps.style
        const isDragging = snapshot.isDragging

        return (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`cursor-grab active:cursor-grabbing ${isDragging ? 'z-50' : ''}`}
            style={{
              ...style,
              opacity: isDragging ? 0.9 : 1,
              transform: isDragging && style?.transform
                ? `${style.transform} rotate(3deg)`
                : style?.transform,
              transformOrigin: 'center center',
            }}
          >
            <div className={`transition-shadow ${isDragging ? 'shadow-2xl ring-2 ring-blue-400 ring-opacity-50' : ''}`}>
              <TaskCardModern
                id={task.id}
                itemCode={task.id}
                title={task.title}
                description={task.description || ''}
                taskType={task.taskType as any}
                storyPoints={task.storyPoints || 0}
                priority={task.priority as 'critical' | 'high' | 'medium' | 'low'}
                dueDate={task.dueDate}
                assignees={task.taskAssignees?.map((ta: TaskAssignee) => ({
                  id: ta.user.id,
                  name: ta.user.fullName || ta.user.email || 'Unknown User',
                  avatar: ta.user.avatarUrl || undefined,
                  initials: ta.user.fullName?.split(' ').map((n: string) => n[0]).join('') || 'U'
                })) || []}
                labels={task.taskLabels ? task.taskLabels.map((tl: TaskLabel) => ({
                  id: tl.label.id,
                  name: tl.label.name,
                  color: tl.label.color || '#6B7280'
                })) : []}
                commentsCount={task._count?.comments || 0}
                filesCount={task._count?.attachments || 0}
                organizationId={props.organizationId}
                boardId={boardId}
                onClick={!isDragging ? () => onTaskClick?.(task) : undefined}
                onAssigneesChange={() => {
                  // Note: onAssigneesChange is called for any task data changes (assignees, labels, comments, etc.)
                  onTaskUpdate?.() // Invalidate parent cache 
                  mutateColumns() // Invalidate sprint columns cache to update counts/labels display
                }}
              />
            </div>
          </div>
        )
      }}
    </Draggable>
  )
}

const DraggableSprintColumn = ({
  column,
  index,
  columnTasks,
  onTaskClick,
  onRefresh,
  organizationId,
  boardId,
  handleRenameColumn,
  handleMarkColumnAsDone,
  handleSetColumnLimit,
  handleExportColumn,
  handleDeleteColumn,
  handleAddTask,
  sprint,
  users,
  labels,
  mutateColumns
}: {
  column: SprintColumn
  index: number
  columnTasks: unknown[]
  onTaskClick: (task: unknown) => void
  onRefresh: () => void
  organizationId?: string
  boardId: string
  handleRenameColumn: (columnId: string, newName: string) => void
  handleMarkColumnAsDone: (columnId: string, isDone: boolean) => void
  handleSetColumnLimit: (columnId: string, limit: number) => void
  handleExportColumn: (columnId: string, format: 'csv' | 'json') => void
  handleDeleteColumn: (columnId: string) => void
  handleAddTask: (data: any, columnId: string) => Promise<void>
  sprint: Sprint
  users: User[]
  labels: Label[]
  mutateColumns: () => void
}) => {
  const [showInlineForm, setShowInlineForm] = useState(false)
  const isLimitExceeded = column.wipLimit && columnTasks.length > column.wipLimit

  return (
    <Draggable draggableId={`column-${column.id}`} index={index}>
      {(dragProvided, dragSnapshot) => {
        const style = dragProvided.draggableProps.style
        const isDragging = dragSnapshot.isDragging

        return (
          <div
            ref={dragProvided.innerRef}
            {...dragProvided.draggableProps}
            className={`bg-white rounded-lg shadow-sm border border-gray-200 w-80 flex-shrink-0 ${isDragging ? 'opacity-90 shadow-2xl ring-2 ring-blue-400 ring-opacity-50 z-50' : ''
              }`}
            style={{
              ...style,
              transform: isDragging && style?.transform
                ? `${style.transform} rotate(2deg)`
                : style?.transform,
              transformOrigin: 'center center',
            }}
          >
            <Droppable droppableId={column.id}>
              {(dropProvided, dropSnapshot) => (
                <div
                  ref={dropProvided.innerRef}
                  {...dropProvided.droppableProps}
                  className={`h-full ${dropSnapshot.isDraggingOver ? 'border-blue-500 border-2 bg-blue-50/30' : ''
                    }`}
                >
                  {/* Column Header */}
                  <div
                    {...dragProvided.dragHandleProps}
                    className="pb-4 border-b bg-gray-50/50 p-4 cursor-grab active:cursor-grabbing"
                  >
                    <div className="text-lg font-semibold flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full shadow-sm ${column.isDone ? 'bg-green-500' : 'bg-blue-500'
                          }`} />
                        <span className="text-gray-900">{column.name}</span>
                        {column.isDone && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                            Done
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={isLimitExceeded ? "destructive" : "secondary"}
                          className={isLimitExceeded ? "" : "bg-gray-100 text-gray-700"}
                        >
                          {columnTasks.length}{column.wipLimit ? `/${column.wipLimit}` : ''}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="hover:bg-gray-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              const newName = prompt('Enter new column name:', column.name)
                              if (newName) handleRenameColumn(column.id, newName)
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Rename Column
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() =>
                              handleMarkColumnAsDone(column.id, !column.isDone)
                            }>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              {column.isDone ? 'Unmark as Done' : 'Mark as Done'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={async () => {
                              try {
                                const response = await fetch(`/api/sprints/${sprint.id}/columns/${column.id}/predefined-items`, {
                                  method: 'POST'
                                })
                                if (!response.ok) throw new Error('Failed to add predefined items')
                                const result = await response.json()
                                toast.success(result.message)
                                onRefresh()
                              } catch (error: unknown) {
                                toast.error(error instanceof Error ? error.message : 'Failed to add predefined items')
                              }
                            }}>
                              <Upload className="h-4 w-4 mr-2" />
                              Insert Predefined Items
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              const limit = prompt('Enter column limit (0 for no limit):', String(column.wipLimit || 0))
                              if (limit !== null) handleSetColumnLimit(column.id, parseInt(limit))
                            }}>
                              <Users className="h-4 w-4 mr-2" />
                              Set Column Limit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleExportColumn(column.id, 'csv')}>
                              <FileSpreadsheet className="h-4 w-4 mr-2" />
                              Export as CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExportColumn(column.id, 'json')}>
                              <FileText className="h-4 w-4 mr-2" />
                              Export as JSON
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteColumn(column.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Column
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>

                  {/* Column Content */}
                  <div className="space-y-3 p-4 min-h-[600px]">
                    {/* Render Tasks */}
                    {columnTasks.map((task, taskIndex) => (
                      <DraggableTask
                        key={task.id}
                        task={task}
                        index={taskIndex}
                        onTaskClick={onTaskClick}
                        boardId={boardId}
                        onTaskUpdate={onRefresh}
                        mutateColumns={mutateColumns}
                        organizationId={organizationId}
                        className={`hover:shadow-lg transition-all border-l-4 bg-white ${column.isDone ? 'border-l-green-400 opacity-75' : 'border-l-blue-400'
                          }`}
                      />
                    ))}
                  
                    {columnTasks.length === 0 && !showInlineForm && (
                      <div className="text-center text-sm text-muted-foreground py-12 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/30">
                        <div className="flex flex-col items-center gap-2">
                          <Square className="h-8 w-8 text-gray-300" />
                          <p>No tasks in {column.name.toLowerCase()}</p>
                          <p className="text-xs">Drag items here or add new tasks</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Inline Form */}
                    {showInlineForm && (
                      <div className="pt-2">
                        <ComprehensiveInlineForm
                          onAdd={async (data) => {
                            await handleAddTask(data, column.id)
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
                    {dropProvided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          </div>
        )
      }}
    </Draggable>
  )
}

export default function SprintBacklogView({
  sprint,
  boardId,
  organizationId,
  onRefresh,
  onFinishSprint,
  isEditDialogOpen,
  onEditDialogChange
}: SprintBacklogViewProps) {
  const [activeTab, setActiveTab] = useState('board')
  const [searchTerm, setSearchTerm] = useState('')
  const [isEditSprintOpen, setIsEditSprintOpen] = useState(isEditDialogOpen || false)
  const [isFinishSprintOpen, setIsFinishSprintOpen] = useState(false)
  const [editedSprint, setEditedSprint] = useState({
    name: sprint.name,
    goal: sprint.goal || '',
    startDate: sprint.startDate || '',
    endDate: sprint.endDate || ''
  })
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<unknown | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [optimisticColumns, setOptimisticColumns] = useState<SprintColumn[]>([])
  
  // Users and labels data for inline form
  const [users, setUsers] = useState<User[]>([])
  const [labels, setLabels] = useState<Label[]>([])

  // Use sprint columns hook
  console.log('🔍 Sprint ID for useSprintColumns:', sprint.id)
  const {
    columns: originalColumns,
    isLoading: columnsLoading,
    createColumn,
    updateColumn,
    deleteColumn,
    finishSprint,
    initializeDefaultColumns,
    mutate: mutateColumns
  } = useSprintColumns(sprint.id)
  
  console.log('🔍 Sprint columns hook result:', { 
    columnsLength: originalColumns?.length, 
    isLoading: columnsLoading,
    columns: originalColumns 
  })
  
  // Debug: Log each column and its tasks
  originalColumns?.forEach((column, index) => {
    console.log(`🔍 Column ${index} (${column.name}):`, {
      id: column.id,
      tasksCount: column.tasks?.length || 0,
      tasks: column.tasks?.map(task => ({
        id: task.id,
        title: task.title,
        commentsCount: task._count?.comments || 0,
        labelsCount: task.taskLabels?.length || 0
      })) || []
    })
  })

  // Merge optimistic updates with original columns
  const mergedColumns = useMemo(() => {
    if (optimisticColumns.length === 0) return originalColumns
    
    // Create a map of optimistic columns by ID for quick lookup
    const optimisticMap = new Map(optimisticColumns.map(c => [c.id, c]))
    
    // Replace original columns with optimistic versions where they exist
    return originalColumns.map(col => optimisticMap.get(col.id) || col)
  }, [originalColumns, optimisticColumns])

  // Add virtual Backlog column at the beginning
  const columns = useMemo(() => {
    const backlogColumn: SprintColumn = {
      id: 'backlog',
      name: 'Backlog',
      position: -1,
      isDone: false,
      wipLimit: null,
      sprintId: sprint.id,
      tasks: [], // Backlog tasks will be handled separately
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    return [backlogColumn, ...mergedColumns]
  }, [mergedColumns, sprint.id])

  // Initialize default columns if none exist
  useEffect(() => {
    if (!columnsLoading && originalColumns.length === 0) {
      initializeDefaultColumns()
    }
  }, [columnsLoading, originalColumns.length, initializeDefaultColumns])

  // Fetch users and labels when component mounts
  useEffect(() => {
    const fetchData = async () => {
      if (!boardId) return
      
      try {
        // Fetch users and labels in parallel
        const [usersResponse, labelsResponse] = await Promise.all([
          fetch(`/api/boards/${boardId}/members`),
          fetch(`/api/boards/${boardId}/labels`)
        ])
        
        if (usersResponse.ok) {
          const usersData = await usersResponse.json()
          const users = usersData.map((member: any) => member.user)
          console.log('SprintBacklog - users loaded:', users.length, users)
          setUsers(users)
        }
        
        if (labelsResponse.ok) {
          const labelsData = await labelsResponse.json()
          console.log('SprintBacklog - labels loaded:', labelsData.length, labelsData)
          setLabels(labelsData)
        }
      } catch (error) {
        console.error('Error fetching board data:', error)
      }
    }
    
    fetchData()
  }, [boardId])

  // Sync external edit dialog state
  useEffect(() => {
    if (isEditDialogOpen !== undefined) {
      setIsEditSprintOpen(isEditDialogOpen)
    }
  }, [isEditDialogOpen])

  // Handle edit dialog state changes
  const handleEditDialogChange = (open: boolean) => {
    setIsEditSprintOpen(open)
    onEditDialogChange?.(open)
  }

  const handleAddTask = async (taskData: any, columnId: string) => {
    try {
      // Generate temporary ID for optimistic update
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Create optimistic task object
      const optimisticTask: any = {
        id: tempId,
        title: taskData.title,
        description: '',
        boardId,
        taskType: taskData.taskType,
        priority: taskData.priority || 'medium',
        storyPoints: taskData.storyPoints || 0,
        sprintId: sprint.id,
        sprintColumnId: columnId,
        position: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        done: false,
        taskAssignees: taskData.assignees?.map((a: any) => ({
          id: `temp-${a.id}`,
          taskId: tempId,
          userId: a.id,
          user: users.find(u => u.id === a.id) || { id: a.id, fullName: 'Unknown', email: '' }
        })) || [],
        taskLabels: taskData.labels?.map((labelId: string) => ({
          id: `temp-${labelId}`,
          taskId: tempId,
          labelId,
          label: labels.find(l => l.id === labelId) || { id: labelId, name: 'Unknown', color: '#gray' }
        })) || [],
        _count: { comments: 0, attachments: 0 },
        isOptimistic: true
      }

      // OPTIMISTIC UPDATE: Add task to UI immediately
      const updatedColumns = mergedColumns.map(col => {
        if (col.id === columnId) {
          return {
            ...col,
            tasks: [...col.tasks, optimisticTask]
          }
        }
        return col
      })
      
      setOptimisticColumns(updatedColumns)

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskData.title,
          taskType: taskData.taskType,
          assignees: taskData.assignees || [],
          labels: taskData.labels || [],
          storyPoints: taskData.storyPoints,
          priority: taskData.priority,
          boardId,
          sprintColumnId: columnId,
          sprintId: sprint.id
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create task')
      }

      // Success - refresh data in background
      mutateColumns()
      onRefresh()
      toast.success('Task created successfully')
      
      // Clear optimistic state after delay to ensure new data has loaded
      setTimeout(() => {
        setOptimisticColumns([])
      }, 1000)
    } catch (error) {
      console.error('Error creating task:', error)
      
      // Rollback on error - clear optimistic state
      setOptimisticColumns([])
      toast.error('Failed to create task')
    }
  }



  const sprintTasks: Task[] = sprint.tasks || []
  const totalTasks = sprintTasks.length
  const completedTasks = sprintTasks.filter(st => st.done)
  const todoTasks = sprintTasks.filter(st => !st.done).length
  const inProgressTasks = todoTasks || 0

  const totalStoryPoints = sprintTasks.reduce((sum, st) => sum + (st.storyPoints || 0), 0)
  const completedStoryPoints = completedTasks.reduce((sum, st) => sum + (st.storyPoints || 0), 0)

  const completionPercentage = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0
  const storyPointsPercentage = totalStoryPoints > 0 ? (completedStoryPoints / totalStoryPoints) * 100 : 0

  // Calculate days remaining
  const startDate = sprint.startDate ? new Date(sprint.startDate) : new Date()
  const endDate = sprint.endDate ? new Date(sprint.endDate) : new Date()
  const today = new Date()
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const daysElapsed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const daysRemaining = Math.max(0, totalDays - daysElapsed)

  // Filter and search tasks
  const filteredTasks = sprintTasks.filter(st => {
    const matchesSearch = st.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (st.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    const matchesFilter = true
    return matchesSearch && matchesFilter
  })

  // Get tasks by column - use the actual column's tasks from database
  const getTasksByColumn = (columnId: string) => {
    // Handle virtual Backlog column - it should be empty in Sprint Backlog view
    if (columnId === 'backlog') {
      return []
    }

    const column = mergedColumns.find(c => c.id === columnId)
    if (!column) return []

    // Filter column tasks based on search and filter criteria
    return column.tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      const matchesFilter = true
      return matchesSearch && matchesFilter
    })
  }

  const handleSaveSprintEdit = async () => {
    try {
      const response = await fetch(`/api/sprints/${sprint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedSprint),
      })

      if (!response.ok) throw new Error('Failed to update sprint')

      toast.success('Sprint updated successfully')
      handleEditDialogChange(false)
      onRefresh()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to update sprint')
    }
  }

  const handleFinishSprint = async () => {
    try {
      const result = await finishSprint()
      toast.success(result.message || 'Sprint finished successfully')
      setIsFinishSprintOpen(false)
      onFinishSprint?.(sprint.id)
      onRefresh()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to finish sprint')
    }
  }

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return

    try {
      await createColumn({
        name: newColumnName.trim(),
        position: columns.length,
        isDone: false
      })
      setNewColumnName('')
      setIsAddColumnOpen(false)
      toast.success('Column added successfully')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to add column')
    }
  }

  const handleDeleteColumn = async (columnId: string) => {
    try {
      await deleteColumn(columnId)
      toast.success('Column deleted successfully')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete column')
    }
  }

  const handleRenameColumn = async (columnId: string, newName: string) => {
    try {
      await updateColumn(columnId, { name: newName })
      toast.success('Column renamed successfully')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to rename column')
    }
  }

  const handleMarkColumnAsDone = async (columnId: string, isDone: boolean) => {
    try {
      await updateColumn(columnId, { isDone })
      toast.success(`Column marked as ${isDone ? 'done' : 'not done'}`)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to update column')
    }
  }

  const handleSetColumnLimit = async (columnId: string, limit: number) => {
    try {
      await updateColumn(columnId, { wipLimit: limit > 0 ? limit : null })
      toast.success('Column limit updated')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to update column limit')
    }
  }

  const handleExportColumn = (columnId: string, format: 'csv' | 'json') => {
    const column = columns.find(c => c.id === columnId)
    if (!column) return

    const tasks = getTasksByColumn(columnId)
    const data = tasks.map(task => ({
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

  const handleDragStart = (start: DragStart) => {
    setActiveId(start.draggableId)
    setIsDragging(true)
  }

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId, type } = result
    setActiveId(null)
    setIsDragging(false)

    if (!destination) {
      return
    }

    // If dropped in same position, do nothing
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return
    }

    // Handle column reordering (skip backlog column which is virtual)
    if (type === 'COLUMN') {
      const sourceIndex = source.index - 1 // Adjust for backlog column
      const destinationIndex = destination.index - 1 // Adjust for backlog column
      const columnId = draggableId.replace('column-', '')

      // Don't allow reordering the backlog column
      if (columnId === 'backlog' || sourceIndex < 0 || destinationIndex < 0) {
        return
      }

      // Store original state for rollback
      const originalColumnsState = [...originalColumns]

      try {
        // OPTIMISTIC UPDATE: Immediately reorder columns
        const updatedColumns = [...originalColumns]
        const [movedColumn] = updatedColumns.splice(sourceIndex, 1)
        updatedColumns.splice(destinationIndex, 0, movedColumn)

        // Update optimistic state
        setOptimisticColumns(updatedColumns)

        // Make API call in background
        const response = await fetch(`/api/sprints/${sprint.id}/columns/${columnId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: destinationIndex })
        })

        if (!response.ok) {
          throw new Error('Failed to reorder column')
        }

        // Success - refresh data in background
        mutateColumns() 
        toast.success('Column reordered successfully')
        
        // Clear optimistic state after delay to ensure new data has loaded
        setTimeout(() => {
          setOptimisticColumns([])
        }, 1000)
        
      } catch (error: unknown) {
        console.error('Error reordering column:', error)
        
        // Rollback on error - clear optimistic state
        setOptimisticColumns([])
        toast.error('Failed to reorder column')
      }
      return
    }

    // Handle task movement
    const taskId = draggableId
    const targetColumnId = destination.droppableId
    const sourceColumnId = source.droppableId

    // Find current task and column from merged columns
    const currentTask = mergedColumns.flatMap(col => col.tasks).find(task => task.id === taskId)
    const currentColumn = mergedColumns.find(col => col.tasks.some(task => task.id === taskId))

    if (!currentTask || !currentColumn) {
      return
    }

    try {
      // OPTIMISTIC UPDATE: Immediately move task
      const updatedColumns = mergedColumns.map(col => ({
        ...col,
        tasks: [...col.tasks]
      }))

      // Remove task from source column
      const sourceCol = updatedColumns.find(col => col.id === sourceColumnId)
      if (sourceCol) {
        const taskIndex = sourceCol.tasks.findIndex(t => t.id === taskId)
        if (taskIndex !== -1) {
          sourceCol.tasks.splice(taskIndex, 1)
        }
      }

      // Handle moving to backlog column
      if (targetColumnId === 'backlog') {
        // Task is moved to backlog - it will disappear from sprint view
        // Don't add it to any column in the sprint view
        setOptimisticColumns(updatedColumns)
        
        // Make API call to move task to backlog
        const response = await fetch(`/api/sprints/${sprint.id}/tasks/move-to-backlog`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId,
            position: destination.index
          }),
        })
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to move task to backlog')
        }

        // Success - refresh data in background
        mutateColumns()
        toast.success('Task moved to backlog successfully')
        
        // Clear optimistic state after delay to ensure new data has loaded
        setTimeout(() => {
          setOptimisticColumns([])
        }, 1000)
        return
      }

      // Add task to destination column at correct position
      const destCol = updatedColumns.find(col => col.id === targetColumnId)
      if (destCol) {
        const updatedTask = { ...currentTask, sprintColumnId: targetColumnId }
        destCol.tasks.splice(destination.index, 0, updatedTask)
      }

      // Update optimistic state
      setOptimisticColumns(updatedColumns)

      // Make API call in background
      let apiCall: Promise<Response>
      
      if (sourceColumnId === targetColumnId) {
        // Handle position change within the same column
        apiCall = fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: destination.index }),
        })
      } else {
        // Handle column change
        apiCall = fetch(`/api/sprints/${sprint.id}/tasks/move`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId,
            targetColumnId
          }),
        })
      }

      const response = await apiCall
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to move task')
      }

      // Success - refresh data in background
      mutateColumns()
      toast.success('Task moved successfully')
      
      // Clear optimistic state after delay to ensure new data has loaded  
      setTimeout(() => {
        setOptimisticColumns([])
      }, 1000)
      
    } catch (error: unknown) {
      console.error('Error moving task:', error)
      
      // Rollback on error - clear optimistic state
      setOptimisticColumns([])
      toast.error(error instanceof Error ? error.message : 'Failed to move task')
    }
  }


  const SprintBoard = useMemo(() => (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Search and Filter */}
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks in this sprint..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-gray-200">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>No filters available</DropdownMenuLabel>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={() => setIsAddColumnOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Column
          </Button>
          
        </div>
      </div>

      {/* Horizontal Scroll Wrapper */}
      <ScrollArea className='w-full'>
        <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <Droppable
            droppableId="sprint-board"
            type="COLUMN"
            direction="horizontal"
            ignoreContainerClipping={true}
          >
            {(boardProvided) => (
              <div
                ref={boardProvided.innerRef}
                {...boardProvided.droppableProps}
                className="flex gap-6 min-h-full"
                style={{
                  minWidth: `${columns.length * 320 + (columns.length - 1) * 24 + 48}px`,
                  width: 'max-content'
                }}
              >
                {columns.map((column, index) => {
                  const columnTasks = getTasksByColumn(column.id)

                  // Render special Backlog drop zone for the virtual backlog column
                  if (column.id === 'backlog') {
                    return (
                      <BacklogDropZone
                        key={column.id}
                        isDragOver={false}
                        draggedTask={null}
                      />
                    )
                  }

                  return (
                    <DraggableSprintColumn
                      key={column.id}
                      column={column}
                      index={index}
                      columnTasks={columnTasks}
                      onTaskClick={setSelectedTask}
                      onRefresh={onRefresh}
                      organizationId={organizationId}
                      boardId={boardId}
                      handleRenameColumn={handleRenameColumn}
                      handleMarkColumnAsDone={handleMarkColumnAsDone}
                      handleSetColumnLimit={handleSetColumnLimit}
                      handleExportColumn={handleExportColumn}
                      handleDeleteColumn={handleDeleteColumn}
                      handleAddTask={handleAddTask}
                      sprint={sprint}
                      users={users}
                      labels={labels}
                      mutateColumns={mutateColumns}
                    />
                  )
                }
                )}
                {boardProvided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

    </div>
  ), [columns, searchTerm, activeId, handleDragStart, handleDragEnd, getTasksByColumn, onRefresh, organizationId, boardId, handleRenameColumn, handleMarkColumnAsDone, handleSetColumnLimit, handleExportColumn, handleDeleteColumn, handleAddTask, sprint, users, labels, mutateColumns])

  return (
    <div className=""
      style={{
        '--transform-origin': 'center center',
        maxWidth: '100%'
      } as React.CSSProperties}
    >
      {/* Sprint Goal */}
      {sprint.goal && (
        <Card className="bg-blue-50 border-blue-200 mb-4 p-2">
          <CardContent className="p-0">
            <div className="flex items-start gap-2">
              <Target className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 flex items-center gap-2">Sprint Goal: <span className="text-blue-800">{sprint.goal}</span></h3>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sprint Progress */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className='p-2'>
          <CardContent className="py-0 px-2">
            <div className="flex items-center gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="text-sm text-muted-foreground">Tasks Completed</p>
                  <p className="text-lg font-bold">{completedTasks.length}/{totalTasks}</p>
                </div>
                <Progress value={completionPercentage} className="mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='p-2'>
          <CardContent className="py-0 px-2">
            <div className="flex items-center gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  <p className="text-sm text-muted-foreground">Story Points</p>
                  <p className="text-lg font-bold">{completedStoryPoints}/{totalStoryPoints}</p>
                </div>
                <Progress value={storyPointsPercentage} className="mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='p-2'>
          <CardContent className="py-0 px-2">
            <div className="flex items-center gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <p className="text-sm text-muted-foreground">WIP</p>
                  <p className="text-lg font-bold">{inProgressTasks}</p>
                </div>
                <p className="text-sm text-muted-foreground mt-2">tasks active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='p-2'>
          <CardContent className="py-0 px-2">
            <div className="flex items-center gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <p className="text-sm text-muted-foreground">Sprint Ends In</p>
                  <p className="text-lg font-bold">{daysRemaining} days</p>
                </div>
                <p className="text-sm text-muted-foreground mt-2">Time left to complete sprint goals</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
          {SprintBoard}
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
              <BurndownChart
                sprint={sprint}
                totalStoryPoints={totalStoryPoints}
                completedStoryPoints={completedStoryPoints}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Sprint Velocity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600">Planned Story Points:</span>
                    <span className="font-bold text-lg">{totalStoryPoints}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600">Completed Story Points:</span>
                    <span className="font-bold text-lg text-green-600">{completedStoryPoints}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600">Velocity (points/day):</span>
                    <span className="font-bold text-lg text-blue-600">
                      {daysElapsed > 0 ? (completedStoryPoints / daysElapsed).toFixed(1) : '0'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-600" />
                  Team Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600">Total Tasks:</span>
                    <span className="font-bold text-lg">{totalTasks}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600">Completion Rate:</span>
                    <span className="font-bold text-lg text-green-600">{completionPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600">Average Task Size:</span>
                    <span className="font-bold text-lg text-blue-600">
                      {totalTasks > 0 ? (totalStoryPoints / totalTasks).toFixed(1) : '0'} pts
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-yellow-50">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  Sprint Health
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600">Days Elapsed:</span>
                    <span className="font-bold text-lg">{daysElapsed}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600">Days Remaining:</span>
                    <span className="font-bold text-lg text-orange-600">{daysRemaining}</span>
                  </div>
                  <div className={`flex justify-between items-center p-3 rounded-lg ${storyPointsPercentage >= (daysElapsed / totalDays) * 100
                    ? 'bg-green-50'
                    : 'bg-red-50'
                    }`}>
                    <span className="text-sm font-medium text-gray-600">Progress Trend:</span>
                    <span className={`font-bold text-lg ${storyPointsPercentage >= (daysElapsed / totalDays) * 100
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
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  Sprint Summary Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    Sprint Overview
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sprint:</span>
                      <span className="font-medium">{sprint.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Goal:</span>
                      <span className="font-medium text-right max-w-[200px]">{sprint.goal || 'No goal specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium">{totalDays} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="font-medium text-green-600">Active ({daysElapsed}/{totalDays} days)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    Work Summary
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Items:</span>
                      <span className="font-medium">{totalTasks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completed:</span>
                      <span className="font-medium text-green-600">{completedTasks} ({completionPercentage.toFixed(1)}%)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">In Progress:</span>
                      <span className="font-medium text-yellow-600">{inProgressTasks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Remaining:</span>
                      <span className="font-medium">{todoTasks}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-600" />
                    Story Points
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Planned:</span>
                      <span className="font-medium">{totalStoryPoints} pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completed:</span>
                      <span className="font-medium text-green-600">{completedStoryPoints} pts ({storyPointsPercentage.toFixed(1)}%)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Remaining:</span>
                      <span className="font-medium">{totalStoryPoints - completedStoryPoints} pts</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-blue-50">
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-indigo-600" />
                  Export Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <Button variant="outline" className="w-full h-12 justify-start gap-3 hover:bg-gray-50">
                  <FileText className="h-4 w-4 text-red-600" />
                  <div className="text-left">
                    <div className="font-medium">Sprint Report</div>
                    <div className="text-xs text-muted-foreground">PDF format</div>
                  </div>
                </Button>
                <Button variant="outline" className="w-full h-12 justify-start gap-3 hover:bg-gray-50">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  <div className="text-left">
                    <div className="font-medium">Task List</div>
                    <div className="text-xs text-muted-foreground">CSV format</div>
                  </div>
                </Button>
                <Button variant="outline" className="w-full h-12 justify-start gap-3 hover:bg-gray-50">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  <div className="text-left">
                    <div className="font-medium">Burndown Data</div>
                    <div className="text-xs text-muted-foreground">Excel format</div>
                  </div>
                </Button>
                <Button variant="outline" className="w-full h-12 justify-start gap-3 hover:bg-gray-50">
                  <Upload className="h-4 w-4 text-purple-600" />
                  <div className="text-left">
                    <div className="font-medium">Share Dashboard</div>
                    <div className="text-xs text-muted-foreground">Generate link</div>
                  </div>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Sprint Dialog */}
      <Dialog open={isEditSprintOpen} onOpenChange={handleEditDialogChange}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Edit className="h-5 w-5 text-blue-600" />
              Edit Sprint
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">Sprint Name</Label>
              <Input
                id="name"
                value={editedSprint.name}
                onChange={(e) => setEditedSprint(prev => ({ ...prev, name: e.target.value }))}
                className="border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal" className="text-sm font-medium text-gray-700">Sprint Goal</Label>
              <Textarea
                id="goal"
                value={editedSprint.goal}
                onChange={(e) => setEditedSprint(prev => ({ ...prev, goal: e.target.value }))}
                placeholder="What do you want to achieve in this sprint?"
                className="border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[80px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-sm font-medium text-gray-700">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={editedSprint.startDate}
                  onChange={(e) => setEditedSprint(prev => ({ ...prev, startDate: e.target.value }))}
                  className="border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-sm font-medium text-gray-700">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={editedSprint.endDate}
                  onChange={(e) => setEditedSprint(prev => ({ ...prev, endDate: e.target.value }))}
                  className="border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => handleEditDialogChange(false)} className="px-4">
              Cancel
            </Button>
            <Button onClick={handleSaveSprintEdit} className="px-4 bg-blue-600 hover:bg-blue-700">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Column Dialog */}
      <Dialog open={isAddColumnOpen} onOpenChange={setIsAddColumnOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-5 w-5 text-blue-600" />
              Add New Column
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="columnName" className="text-sm font-medium text-gray-700">Column Name</Label>
              <Input
                id="columnName"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="Enter column name..."
                className="border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsAddColumnOpen(false)} className="px-4">
              Cancel
            </Button>
            <Button onClick={handleAddColumn} disabled={!newColumnName.trim()} className="px-4 bg-blue-600 hover:bg-blue-700">
              Add Column
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Finish Sprint Dialog */}
      <AlertDialog open={isFinishSprintOpen} onOpenChange={setIsFinishSprintOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finish Sprint</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to finish this sprint? All unfinished items will be moved to the Product Backlog.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinishSprint}>
              Finish Sprint
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Task Modal */}
      {selectedTask && (
        <ItemModal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          taskId={selectedTask.id}
          onUpdate={() => {
            onRefresh()
          }}
        />
      )}
    </div>
  )
}