"use client"

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Square, 
  Calendar, 
  Target, 
  TrendingDown,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Play,
  Pause,
  MoreHorizontal,
  Settings,
  BarChart3,
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  RotateCcw,
  Users,
  Upload,
  FileText,
  FileSpreadsheet,
  DragHandleDots2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem
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
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import TaskCard from '@/components/tasks/task-card'
import BurndownChart from './BurndownChart'
import { Sprint } from '@/hooks/useSprints'
import { useSprintColumns } from '@/hooks/useSprintColumns'
import { toast } from 'sonner'

interface SprintColumn {
  id: string
  sprintId: string
  name: string
  position: number
  isDone: boolean
  wipLimit?: number
  tasks: any[]
  createdAt: string
}

interface SprintBacklogViewProps {
  sprint: Sprint
  boardId: string
  organizationId?: string
  onRefresh: () => void
  onBackToBacklog?: () => void
  onFinishSprint?: (sprintId: string) => void
}

const SortableTask = ({ task, ...props }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} {...props} />
    </div>
  )
}

const DroppableColumn = ({ column, children }: { column: SprintColumn; children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  })

  return (
    <div 
      ref={setNodeRef} 
      className={`min-h-[500px] transition-colors ${isOver ? 'bg-blue-50 border-blue-300' : ''}`}
    >
      {children}
    </div>
  )
}

export default function SprintBacklogView({
  sprint,
  boardId,
  organizationId,
  onRefresh,
  onBackToBacklog,
  onFinishSprint
}: SprintBacklogViewProps) {
  const [activeTab, setActiveTab] = useState('board')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string[]>([])
  const [isEditSprintOpen, setIsEditSprintOpen] = useState(false)
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

  // Use sprint columns hook
  const {
    columns,
    isLoading: columnsLoading,
    createColumn,
    updateColumn,
    deleteColumn,
    finishSprint,
    initializeDefaultColumns
  } = useSprintColumns(sprint.id)

  // Initialize default columns if none exist
  useEffect(() => {
    if (!columnsLoading && columns.length === 0) {
      initializeDefaultColumns()
    }
  }, [columnsLoading, columns.length, initializeDefaultColumns])

  const sprintTasks = sprint.sprintTasks || []
  const totalTasks = sprintTasks.length
  const completedTasks = sprintTasks.filter(st => st.task.status === 'done').length
  const inProgressTasks = sprintTasks.filter(st => st.task.status === 'in_progress').length
  const todoTasks = sprintTasks.filter(st => st.task.status === 'todo').length

  const totalStoryPoints = sprintTasks.reduce((sum, st) => sum + (st.task.storyPoints || 0), 0)
  const completedStoryPoints = sprintTasks
    .filter(st => st.task.status === 'done')
    .reduce((sum, st) => sum + (st.task.storyPoints || 0), 0)

  const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
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
    const matchesSearch = st.task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (st.task.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus.length === 0 || filterStatus.includes(st.task.status || 'todo')
    return matchesSearch && matchesFilter
  })

  // Get tasks by column - use the actual column's tasks from database
  const getTasksByColumn = (columnId: string) => {
    const column = columns.find(c => c.id === columnId)
    if (!column) return []
    
    // Filter column tasks based on search and filter criteria
    return column.tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (task.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      const matchesFilter = filterStatus.length === 0 || filterStatus.includes(task.status || 'todo')
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
      setIsEditSprintOpen(false)
      onRefresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update sprint')
    }
  }

  const handleFinishSprint = async () => {
    try {
      const result = await finishSprint()
      toast.success(result.message || 'Sprint finished successfully')
      setIsFinishSprintOpen(false)
      onFinishSprint?.(sprint.id)
      onRefresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to finish sprint')
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
    } catch (error: any) {
      toast.error(error.message || 'Failed to add column')
    }
  }

  const handleDeleteColumn = async (columnId: string) => {
    try {
      await deleteColumn(columnId)
      toast.success('Column deleted successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete column')
    }
  }

  const handleRenameColumn = async (columnId: string, newName: string) => {
    try {
      await updateColumn(columnId, { name: newName })
      toast.success('Column renamed successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to rename column')
    }
  }

  const handleMarkColumnAsDone = async (columnId: string, isDone: boolean) => {
    try {
      await updateColumn(columnId, { isDone })
      toast.success(`Column marked as ${isDone ? 'done' : 'not done'}`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to update column')
    }
  }

  const handleSetColumnLimit = async (columnId: string, limit: number) => {
    try {
      await updateColumn(columnId, { wipLimit: limit > 0 ? limit : null })
      toast.success('Column limit updated')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update column limit')
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
      status: task.status,
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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const taskId = active.id as string
    const targetColumnId = over.id as string

    // Find current task and column
    const currentTask = columns.flatMap(col => col.tasks).find(task => task.id === taskId)
    const currentColumn = columns.find(col => col.tasks.some(task => task.id === taskId))
    
    if (!currentTask || !currentColumn) return

    try {
      if (currentColumn.id === targetColumnId) {
        // Handle position change within the same column
        const columnTasks = currentColumn.tasks
        const currentTaskIndex = columnTasks.findIndex(task => task.id === taskId)
        const targetTask = columnTasks.find(task => task.id === over.id)
        
        if (targetTask && targetTask.id !== taskId) {
          const targetTaskIndex = columnTasks.findIndex(task => task.id === targetTask.id)
          
          if (currentTaskIndex !== -1 && targetTaskIndex !== -1 && currentTaskIndex !== targetTaskIndex) {
            // Use the regular task API for position updates since sprint API doesn't handle position properly
            const response = await fetch(`/api/tasks/${taskId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ position: targetTaskIndex }),
            })

            if (!response.ok) {
              throw new Error('Failed to update task position')
            }

            toast.success('Task position updated')
            onRefresh()
          }
        }
      } else {
        // Handle column change
        const response = await fetch(`/api/sprints/${sprint.id}/tasks/move`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId,
            targetColumnId
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to move task')
        }

        toast.success('Task moved successfully')
        onRefresh()
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to move task')
    }
  }

  const SprintBoard = () => (
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
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={filterStatus.includes('todo')}
              onCheckedChange={(checked) => 
                setFilterStatus(prev => 
                  checked ? [...prev, 'todo'] : prev.filter(s => s !== 'todo')
                )
              }
            >
              To Do
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filterStatus.includes('in_progress')}
              onCheckedChange={(checked) => 
                setFilterStatus(prev => 
                  checked ? [...prev, 'in_progress'] : prev.filter(s => s !== 'in_progress')
                )
              }
            >
              In Progress
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filterStatus.includes('done')}
              onCheckedChange={(checked) => 
                setFilterStatus(prev => 
                  checked ? [...prev, 'done'] : prev.filter(s => s !== 'done')
                )
              }
            >
              Done
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button onClick={() => setIsAddColumnOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Column
        </Button>
      </div>

      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(300px, 1fr))` }}>
          {columns.map((column) => {
            const columnTasks = getTasksByColumn(column.id)
            const isLimitExceeded = column.wipLimit && columnTasks.length > column.wipLimit

            return (
              <DroppableColumn key={column.id} column={column}>
                <Card className={`min-h-[500px] ${isLimitExceeded ? 'border-red-300' : ''}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          column.isDone ? 'bg-green-500' : 'bg-blue-500'
                        }`} />
                        <span>{column.name}</span>
                        {column.isDone && <Badge variant="secondary">Done Column</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={isLimitExceeded ? "destructive" : "secondary"}>
                          {columnTasks.length}{column.wipLimit ? `/${column.wipLimit}` : ''}
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
                              } catch (error: any) {
                                toast.error(error.message || 'Failed to add predefined items')
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
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <SortableContext items={columnTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
                      {columnTasks.map((task) => (
                        <SortableTask
                          key={task.id}
                          task={task}
                          projectId={undefined}
                          organizationId={organizationId}
                          onUpdate={onRefresh}
                          className={`hover:shadow-lg transition-all border-l-4 ${
                            column.isDone ? 'border-l-green-400 opacity-75' : 'border-l-blue-400'
                          }`}
                        />
                      ))}
                    </SortableContext>
                    {columnTasks.length === 0 && (
                      <div className="text-center text-sm text-muted-foreground py-8 border-2 border-dashed border-gray-200 rounded-lg">
                        No tasks in {column.name.toLowerCase()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </DroppableColumn>
            )
          })}
        </div>
        
        <DragOverlay>
          {activeId ? (
            <div className="opacity-50">
              <TaskCard 
                task={columns.flatMap(col => col.tasks).find(task => task.id === activeId)} 
                projectId={undefined}
                organizationId={organizationId}
                onUpdate={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )

  return (
    <div className="h-full">
      {/* Sprint Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBackToBacklog}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Backlog
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{sprint.name}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {sprint.startDate && sprint.endDate && (
                    <span>
                      {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{daysRemaining} days remaining</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-green-500">
              Active Sprint
            </Badge>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <MoreHorizontal className="h-4 w-4 mr-2" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditSprintOpen(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Sprint
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Sprint Report
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsFinishSprintOpen(true)}>
                  <Square className="h-4 w-4 mr-2" />
                  Finish Sprint
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Sprint Goal */}
        {sprint.goal && (
          <Card className="bg-blue-50 border-blue-200">
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
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
          <SprintBoard />
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

      {/* Edit Sprint Dialog */}
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
            <Button onClick={handleSaveSprintEdit}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Column Dialog */}
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
    </div>
  )
}