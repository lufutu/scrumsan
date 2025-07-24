"use client"

import { useState, useCallback, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/animate-ui/radix/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/animate-ui/radix/tabs'
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
  GripVertical
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
import { Sprint, Task } from '@/types/shared'
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
  onBackToBacklog?: () => void // Optional since AppHeader handles this
  onFinishSprint?: (sprintId: string) => void
}

const SortableTask = ({ task, ...props }: unknown) => {
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

  // Separate drag handle and task content to prevent event conflicts
  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 z-10 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded p-1 shadow-sm"
      >
        <GripVertical className="h-4 w-4 text-gray-400 hover:text-gray-600" />
      </div>
      {/* Task content - clickable for editing */}
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
    const column = columns.find(c => c.id === columnId)
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
      setIsEditSprintOpen(false)
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
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to move task')
    }
  }

  const SprintBoard = useMemo(() => (
    <div className="space-y-6">
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

      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(320px, 1fr))` }}>
          {columns.map((column) => {
            const columnTasks = getTasksByColumn(column.id)
            const isLimitExceeded = column.wipLimit && columnTasks.length > column.wipLimit

            return (
              <DroppableColumn key={column.id} column={column}>
                <Card className={`min-h-[600px] shadow-sm hover:shadow-md transition-shadow ${isLimitExceeded ? 'border-red-300 bg-red-50/30' : 'bg-white'}`}>
                  <CardHeader className="pb-4 border-b bg-gray-50/50">
                    <CardTitle className="text-lg font-semibold flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full shadow-sm ${column.isDone ? 'bg-green-500' : 'bg-blue-500'
                          }`} />
                        <span className="text-gray-900">{column.name}</span>
                        {column.isDone && <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">Done</Badge>}
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
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-4">
                    <SortableContext items={columnTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
                      {columnTasks.map((task) => (
                        <SortableTask
                          key={task.id}
                          task={task}
                          projectId={undefined}
                          organizationId={organizationId}
                          onUpdate={onRefresh}
                          className={`hover:shadow-lg transition-all border-l-4 bg-white ${column.isDone ? 'border-l-green-400 opacity-75' : 'border-l-blue-400'
                            }`}
                        />
                      ))}
                    </SortableContext>
                    {columnTasks.length === 0 && (
                      <div className="text-center text-sm text-muted-foreground py-12 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/30">
                        <div className="flex flex-col items-center gap-2">
                          <Square className="h-8 w-8 text-gray-300" />
                          <p>No tasks in {column.name.toLowerCase()}</p>
                          <p className="text-xs">Drag items here or add new tasks</p>
                        </div>
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
              <SortableTask
                task={sprintTasks.find(task => task.id === activeId)}
                projectId={undefined}
                organizationId={organizationId}
                onUpdate={onRefresh}
                className={`hover:shadow-lg transition-all border-l-4 bg-white`}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  ), [columns, searchTerm, activeId, handleDragStart, handleDragEnd, getTasksByColumn, onRefresh, organizationId])

  return (
    <div className="h-full">
      {/* Sprint Goal */}
      {sprint.goal && (
        <Card className="bg-blue-50 border-blue-200 my-4 p-2">
          <CardContent className="p-0">
            <div className="flex items-start gap-2">
              <Target className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 flex items-center gap-2">Sprint Goal: <p className="text-blue-800">{sprint.goal}</p></h3>
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
      <Dialog open={isEditSprintOpen} onOpenChange={setIsEditSprintOpen}>
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
            <Button variant="outline" onClick={() => setIsEditSprintOpen(false)} className="px-4">
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
    </div>
  )
}