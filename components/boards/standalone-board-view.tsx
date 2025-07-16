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

interface StandaloneBoardViewProps {
  boardId: string
  board: any
  onUpdate: () => void
}

export default function StandaloneBoardView({ boardId, board: initialBoard, onUpdate }: StandaloneBoardViewProps) {
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
    fetchBoardData()
  }, [boardId])

  const fetchBoardData = async () => {
    try {
      setIsLoading(true)
      
      const { data: boardData, error: boardError } = await supabase
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
        .eq('id', boardId)
        .single()

      if (boardError) throw boardError

      if (boardData) {
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
        description: "Failed to load board data"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // If it's a scrum board, but this is standalone, show a message explaining that scrum features need a project
  if (board?.board_type === 'scrum') {
    return (
      <div className="h-full">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">{board.name}</h2>
          <p className="text-muted-foreground">Standalone Scrum board</p>
        </div>
        
        <Card className="p-8 text-center">
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-semibold mb-2">Scrum Features Not Available</h3>
            <p className="text-muted-foreground mb-4">
              Sprint management and scrum features are only available for boards within projects. 
              This is a standalone board that works as a Kanban board.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              To use scrum features like sprints, create this board within a project instead.
            </p>
            <Button onClick={() => window.location.reload()}>
              Continue as Kanban Board
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Kanban board implementation (similar to project board but for standalone)
  const handleTaskDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('type', 'task')
    e.stopPropagation()
  }

  const handleTaskDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    
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

      const targetColumn = board.board_columns.find(col => col.id === targetColumnId)
      if (!targetColumn) return

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
          <div className="text-destructive">Failed to load board</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{board.name}</h2>
          <p className="text-muted-foreground">
            Standalone {board.board_type === 'scrum' ? 'Scrum' : 'Kanban'} board
          </p>
        </div>
        
        <div className="flex gap-2">
          <TaskForm 
            projectId={undefined} 
            organizationId={board.organization_id || undefined} 
            onSuccess={() => { fetchBoardData(); onUpdate(); }} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 h-full min-h-96">
        {board.board_columns.map((column) => (
          <div key={column.id} className="flex flex-col">
            <Card className={`flex-1 transition-all ${
              draggedOver === column.id ? 'ring-2 ring-blue-500' : ''
            }`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <CardTitle className="text-lg font-semibold">
                      {column.name} ({column.tasks.length})
                    </CardTitle>
                  </div>
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
                        projectId={undefined}
                        organizationId={board.organization_id || undefined}
                        onUpdate={() => { fetchBoardData(); onUpdate(); }}
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