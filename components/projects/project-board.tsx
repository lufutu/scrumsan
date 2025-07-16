"use client"

import { useEffect, useState } from 'react'
import { useSupabase } from '@/providers/supabase-provider'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Plus, MoreHorizontal, Trash2, Edit, Loader2, GripVertical } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import TaskCard from '@/components/tasks/task-card'
import TaskForm from '@/components/tasks/task-form'
import ProjectScrumBoard from '@/components/projects/project-scrum-board'
import BoardCreationWizard from '@/components/projects/board-creation-wizard-simple'
import { Tables } from '@/types/database'

type Board = Tables<'boards'> & {
  board_type?: string | null
  board_columns: Array<Tables<'board_columns'> & {
    tasks: Array<Tables<'tasks'> & {
      assignee?: {
        id: string
        full_name: string | null
        avatar_url: string | null
      } | null
    }>
  }>
}

type BoardColumn = Tables<'board_columns'> & {
  tasks: Array<Tables<'tasks'> & {
    assignee?: {
      id: string
      full_name: string | null
      avatar_url: string | null
    } | null
  }>
}

interface ProjectBoardProps {
  projectId: string
}

export default function ProjectBoard({ projectId }: ProjectBoardProps) {
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const [board, setBoard] = useState<Board | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [draggedTask, setDraggedTask] = useState<string | null>(null)
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [draggedOver, setDraggedOver] = useState<string | null>(null)
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null)
  const [showNewColumnDialog, setShowNewColumnDialog] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [isCreatingColumn, setIsCreatingColumn] = useState(false)

  useEffect(() => {
    fetchBoard()
  }, [projectId])

  const fetchBoard = async () => {
    try {
      setIsLoading(true)
      
      // First, try to get existing board
      let { data: boardData, error: boardError } = await supabase
        .from('boards')
        .select(`
          *,
          board_columns (
            *,
            tasks (
              *,
              assignee:users!assignee_id (
                id,
                full_name,
                avatar_url
              )
            )
          )
        `)
        .eq('project_id', projectId)
        .single()

      if (boardError && boardError.code === 'PGRST116') {
        // No board exists, show creation options
        setBoard(null)
      } else if (boardError) {
        throw boardError
      } else if (boardData) {
        // Sort columns by position and tasks by created_at
        boardData.board_columns.sort((a, b) => a.position - b.position)
        boardData.board_columns.forEach(column => {
          column.tasks.sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime())
        })
        setBoard(boardData)
      }
    } catch (err: any) {
      console.error('Error fetching board:', err)
      toast({
        title: "Error",
        description: "Failed to load board"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Task drag handlers (for Kanban board only)
  const handleTaskDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('type', 'task')
    e.stopPropagation()
  }

  const handleTaskDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    
    // Only handle if we're dragging a task
    if (draggedTask) {
      e.dataTransfer.dropEffect = 'move'
      setDraggedOver(columnId)
    }
  }

  const handleTaskDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDraggedOver(null)
  }

  const handleTaskDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDraggedOver(null)

    if (!draggedTask || !board) return

    try {
      // Find the task and its current column
      let sourceColumn: BoardColumn | null = null
      let task: any = null

      for (const column of board.board_columns) {
        const foundTask = column.tasks.find(t => t.id === draggedTask)
        if (foundTask) {
          sourceColumn = column
          task = foundTask
          break
        }
      }

      if (!task || !sourceColumn || sourceColumn.id === targetColumnId) {
        setDraggedTask(null)
        return
      }

      // Update task's column and status
      const targetColumn = board.board_columns.find(col => col.id === targetColumnId)
      if (!targetColumn) return

      // Map column names to status values
      const getStatusFromColumn = (columnName: string) => {
        const name = columnName.toLowerCase()
        if (name.includes('progress') || name.includes('doing')) return 'in_progress'
        if (name.includes('done') || name.includes('complete')) return 'done'
        return 'todo'
      }

      const newStatus = getStatusFromColumn(targetColumn.name)

      const { error } = await supabase
        .from('tasks')
        .update({ 
          column_id: targetColumnId,
          status: newStatus
        })
        .eq('id', draggedTask)

      if (error) throw error

      // Update local state
      setBoard(prev => {
        if (!prev) return prev
        
        const newBoard = { ...prev }
        newBoard.board_columns = newBoard.board_columns.map(column => {
          if (column.id === sourceColumn!.id) {
            return {
              ...column,
              tasks: column.tasks.filter(t => t.id !== draggedTask)
            }
          }
          if (column.id === targetColumnId) {
            return {
              ...column,
              tasks: [...column.tasks, { ...task, column_id: targetColumnId, status: newStatus }]
            }
          }
          return column
        })
        
        return newBoard
      })

      toast({
        title: "Success",
        description: "Task moved successfully"
      })
    } catch (err: any) {
      console.error('Error moving task:', err)
      toast({
        title: "Error",
        description: "Failed to move task"
      })
    }

    setDraggedTask(null)
  }

  // Column drag handlers (for Kanban board only)
  const handleColumnDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggedColumn(columnId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('type', 'column')
  }

  const handleColumnDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    
    // Only handle column drops if we're dragging a column
    if (draggedColumn) {
      e.dataTransfer.dropEffect = 'move'
      setDraggedOverColumn(columnId)
    }
  }

  const handleColumnDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const isLeavingColumn = (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    )
    
    if (isLeavingColumn) {
      setDraggedOverColumn(null)
    }
  }

  const handleColumnDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault()
    setDraggedOverColumn(null)

    if (!draggedColumn || !board || draggedColumn === targetColumnId) {
      setDraggedColumn(null)
      return
    }

    try {
      const sourceColumn = board.board_columns.find(col => col.id === draggedColumn)
      const targetColumn = board.board_columns.find(col => col.id === targetColumnId)
      
      if (!sourceColumn || !targetColumn) return

      const sourcePosition = sourceColumn.position
      const targetPosition = targetColumn.position

      // Create a new array with updated positions
      const updatedColumns = board.board_columns.map(column => {
        if (column.id === draggedColumn) {
          return { ...column, position: targetPosition }
        }
        
        if (sourcePosition < targetPosition) {
          // Moving right - shift columns left
          if (column.position > sourcePosition && column.position <= targetPosition) {
            return { ...column, position: column.position - 1 }
          }
        } else {
          // Moving left - shift columns right
          if (column.position >= targetPosition && column.position < sourcePosition) {
            return { ...column, position: column.position + 1 }
          }
        }
        
        return column
      })

      // Update positions in database
      const positionUpdates = updatedColumns.map(column => ({
        id: column.id,
        position: column.position
      }))

      for (const update of positionUpdates) {
        const { error } = await supabase
          .from('board_columns')
          .update({ position: update.position })
          .eq('id', update.id)

        if (error) throw error
      }

      // Update local state
      setBoard(prev => {
        if (!prev) return prev
        
        const newBoard = { ...prev }
        newBoard.board_columns = updatedColumns.sort((a, b) => a.position - b.position)
        
        return newBoard
      })

      toast({
        title: "Success",
        description: "Column reordered successfully"
      })
    } catch (err: any) {
      console.error('Error reordering column:', err)
      toast({
        title: "Error",
        description: "Failed to reorder column"
      })
    }

    setDraggedColumn(null)
  }

  const handleCreateColumn = async () => {
    if (!newColumnName.trim() || !board) return

    setIsCreatingColumn(true)

    try {
      const { error } = await supabase
        .from('board_columns')
        .insert({
          name: newColumnName.trim(),
          board_id: board.id,
          position: board.board_columns.length
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "Column created successfully"
      })

      setShowNewColumnDialog(false)
      setNewColumnName('')
      fetchBoard()
    } catch (err: any) {
      console.error('Error creating column:', err)
      toast({
        title: "Error",
        description: "Failed to create column"
      })
    } finally {
      setIsCreatingColumn(false)
    }
  }

  const handleDeleteColumn = async (columnId: string) => {
    if (!confirm('Are you sure you want to delete this column? All tasks will be moved to "To Do".')) {
      return
    }

    try {
      // Move all tasks in this column to the first column (To Do)
      const firstColumn = board?.board_columns[0]
      if (firstColumn && firstColumn.id !== columnId) {
        await supabase
          .from('tasks')
          .update({ 
            column_id: firstColumn.id,
            status: 'todo'
          })
          .eq('column_id', columnId)
      }

      // Delete the column
      const { error } = await supabase
        .from('board_columns')
        .delete()
        .eq('id', columnId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Column deleted successfully"
      })

      fetchBoard()
    } catch (err: any) {
      console.error('Error deleting column:', err)
      toast({
        title: "Error",
        description: "Failed to delete column"
      })
    }
  }

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading board...</p>
        </div>
      </div>
    )
  }

  if (!board) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="space-y-4">
            <div className="text-lg font-semibold">No Board Found</div>
            <p className="text-muted-foreground">
              Create your first board to start organizing your project
            </p>
            <BoardCreationWizard projectId={projectId} onSuccess={fetchBoard} />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show Scrum board if board type is scrum
  if (board.board_type === 'scrum') {
    return <ProjectScrumBoard projectId={projectId} board={board} onUpdate={fetchBoard} />
  }

  // Show Kanban board (default)
  return (
    <div className="h-full">
      {/* Board Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{board.name}</h2>
          <p className="text-muted-foreground">
            Drag and drop tasks between columns or drag columns to reorder them
          </p>
        </div>
        
        <div className="flex gap-2">
          <TaskForm projectId={projectId} onSuccess={fetchBoard} />
          
          <Dialog open={showNewColumnDialog} onOpenChange={setShowNewColumnDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Column
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Column</DialogTitle>
                <DialogDescription>
                  Create a new column for your board
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-2">
                <Label htmlFor="columnName">Column Name</Label>
                <Input
                  id="columnName"
                  placeholder="Enter column name"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  disabled={isCreatingColumn}
                />
              </div>

              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowNewColumnDialog(false)}
                  disabled={isCreatingColumn}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateColumn}
                  disabled={isCreatingColumn || !newColumnName.trim()}
                >
                  {isCreatingColumn && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Column
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 h-full min-h-96">
        {board.board_columns.map((column) => (
          <div 
            key={column.id} 
            className="flex flex-col"
            onDragOver={(e) => handleColumnDragOver(e, column.id)}
            onDragLeave={handleColumnDragLeave}
            onDrop={(e) => handleColumnDrop(e, column.id)}
          >
            <Card className={`flex-1 transition-all ${
              draggedOver === column.id ? 'ring-2 ring-blue-500' : ''
            } ${
              draggedOverColumn === column.id ? 'ring-2 ring-green-500' : ''
            } ${
              draggedColumn === column.id ? 'opacity-50' : ''
            }`}>
              <CardHeader 
                className="pb-3"
                draggable
                onDragStart={(e) => handleColumnDragStart(e, column.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <CardTitle className="text-lg font-semibold">
                      {column.name} ({column.tasks.length})
                    </CardTitle>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => handleDeleteColumn(column.id)}
                        className="text-destructive focus:text-destructive"
                        disabled={board.board_columns.length <= 1}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Column
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent 
                className="flex-1 space-y-3 min-h-64"
                onDragOver={(e) => handleTaskDragOver(e, column.id)}
                onDragLeave={handleTaskDragLeave}
                onDrop={(e) => handleTaskDrop(e, column.id)}
              >
                {column.tasks.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    No tasks in this column
                  </div>
                ) : (
                  column.tasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleTaskDragStart(e, task.id)}
                      className="cursor-move"
                    >
                      <TaskCard
                        task={task}
                        projectId={projectId}
                        onUpdate={fetchBoard}
                        className="hover:shadow-lg transition-all"
                      />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  )
} 