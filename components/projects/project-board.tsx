"use client"

import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Plus, MoreHorizontal, Trash2, GripVertical, Loader2 } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { TaskCardModern } from '@/components/scrum/TaskCardModern'
import { ItemModal } from '@/components/scrum/ItemModal'
import { ComprehensiveInlineForm } from '@/components/scrum/ComprehensiveInlineForm'
import ProjectScrumBoard from '@/components/projects/project-scrum-board'
import EnhancedScrumBoard from '@/components/scrum/EnhancedScrumBoard'
import BoardCreationWizard from '@/components/projects/board-creation-wizard-simple'
import { useBoards, Board } from '@/hooks/useBoards'
import { useTasks } from '@/hooks/useTasks'
import { useUsers } from '@/hooks/useUsers'
import { useLabels } from '@/hooks/useLabels'

import { BoardColumn, ProjectBoardProps } from '@/types/shared';

export default function ProjectBoard({ projectId }: ProjectBoardProps) {
  const { toast } = useToast()
  const router = useRouter()
  const { boards, isLoading, mutate } = useBoards(undefined, projectId)
  const board = boards?.[0] || null
  const { users } = useUsers({ projectId })
  const { labels } = useLabels(board?.id || '')
  const [draggedTask, setDraggedTask] = useState<string | null>(null)
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [draggedOver, setDraggedOver] = useState<string | null>(null)
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null)
  const [showNewColumnDialog, setShowNewColumnDialog] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [isCreatingColumn, setIsCreatingColumn] = useState(false)
  const [showInlineForm, setShowInlineForm] = useState<{[key: string]: boolean}>({})
  const [selectedTask, setSelectedTask] = useState<any | null>(null)

  // Redirect handler for board creation
  const handleBoardCreatedWithRedirect = async (newBoard?: { id?: string }) => {
    // Refresh the data first
    await mutate()
    
    // Then redirect to the new board
    if (newBoard?.id) {
      router.push(`/boards/${newBoard.id}`)
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

      for (const column of (board as any).board_columns || []) {
        const foundTask = column.tasks.find((t: any) => t.id === draggedTask)
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
      const targetColumn = ((board as any).board_columns || []).find((col: any) => col.id === targetColumnId)
      if (!targetColumn) return


      // Update task via API
      const response = await fetch(`/api/tasks/${draggedTask}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          columnId: targetColumnId
        }),
      })

      if (!response.ok) throw new Error('Failed to update task')

      // Refresh board data
      mutate()

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
      const sourceColumn = ((board as any).board_columns || []).find((col: any) => col.id === draggedColumn)
      const targetColumn = ((board as any).board_columns || []).find((col: any) => col.id === targetColumnId)
      
      if (!sourceColumn || !targetColumn) return

      const sourcePosition = sourceColumn.position
      const targetPosition = targetColumn.position

      // Create a new array with updated positions
      const updatedColumns = ((board as any).board_columns || []).map((column: any) => {
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
      const positionUpdates = updatedColumns.map((column: any) => ({
        id: column.id,
        position: column.position
      }))

      for (const update of positionUpdates) {
        const response = await fetch(`/api/boards/${board.id}/columns/${update.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: update.position }),
        })

        if (!response.ok) throw new Error('Failed to update column position')
      }

      // Refresh board data
      mutate()

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
      const response = await fetch(`/api/boards/${board.id}/columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newColumnName.trim(),
          position: ((board as any).board_columns || []).length
        }),
      })

      if (!response.ok) throw new Error('Failed to create column')

      toast({
        title: "Success",
        description: "Column created successfully"
      })

      setShowNewColumnDialog(false)
      setNewColumnName('')
      mutate()
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
      const response = await fetch(`/api/boards/${board?.id}/columns/${columnId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete column')

      toast({
        title: "Success",
        description: "Column deleted successfully"
      })

      // Refresh board data
      mutate()
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
            <BoardCreationWizard projectId={projectId} onSuccess={handleBoardCreatedWithRedirect} />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show Scrum board if board type is scrum
  if ((board as any).board_type === 'scrum' || board.boardType === 'scrum') {
    return <EnhancedScrumBoard projectId={projectId} boardId={board.id} />
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
      <div className="flex gap-6 h-full min-h-96 overflow-x-auto">
        <div className="flex gap-6 min-w-max">
          {((board as any).board_columns || []).map((column: any) => (
            <div 
              key={column.id} 
              className="flex flex-col w-[350px] flex-shrink-0"
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
                        disabled={((board as any).board_columns || []).length <= 1}
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
                {column.tasks.map((task: any) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleTaskDragStart(e, task.id)}
                    className="cursor-move"
                  >
                    <TaskCardModern
                      id={task.id}
                      title={task.title}
                      description={task.description}
                      taskType={task.taskType as 'story' | 'bug' | 'task' | 'epic' | 'improvement' | 'idea' | 'note' || 'task'}
                      storyPoints={task.storyPoints || 0}
                      assignees={task.taskAssignees?.map((ta: any) => ({
                        id: ta.user.id,
                        name: ta.user.fullName || 'Unknown User',
                        avatar: ta.user.avatarUrl || undefined,
                        initials: ta.user.fullName?.split(' ').map((n: string) => n[0]).join('') || 'U'
                      })) || []}
                      organizationId={board.organizationId}
                      boardId={board.id}
                      status={'todo'}
                      onClick={() => setSelectedTask(task)}
                      onAssigneesChange={() => mutate()}
                    />
                  </div>
                ))}
                
                {!showInlineForm[column.id] && (
                  <button
                    onClick={() => setShowInlineForm(prev => ({ ...prev, [column.id]: true }))}
                    className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors text-left mt-3"
                  >
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      <span className="text-sm">Add item...</span>
                    </div>
                  </button>
                )}
                
                {showInlineForm[column.id] && (
                  <div className="mt-3">
                    <ComprehensiveInlineForm
                      onAdd={async (data) => {
                        try {
                          const response = await fetch('/api/tasks', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              title: data.title,
                              projectId: projectId,
                              boardId: board.id,
                              columnId: column.id,
                              taskType: data.taskType,
                              assigneeId: data.assigneeId,
                              labels: data.labels || [],
                              priority: data.priority,
                              storyPoints: data.storyPoints,
                            })
                          });
                          
                          if (!response.ok) {
                            const error = await response.json();
                            throw new Error(error.message || 'Failed to create task');
                          }
                          
                          mutate();
                          setShowInlineForm(prev => ({ ...prev, [column.id]: false }));
                          toast({
                            title: "Success",
                            description: "Task created successfully"
                          });
                        } catch (err: any) {
                          console.error('Error creating task:', err)
                          toast({
                            title: "Error",
                            description: "Failed to create task"
                          })
                        }
                      }}
                      onCancel={() => setShowInlineForm(prev => ({ ...prev, [column.id]: false }))}
                      placeholder="What needs to be done?"
                      users={users}
                      labels={labels.map(l => ({
                        id: l.id,
                        name: l.name,
                        color: l.color || '#6B7280'
                      }))}
                    />
                  </div>
                )}
                
                {column.tasks.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    No tasks in this column
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Task Modal */}
      {selectedTask && (
        <ItemModal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          taskId={selectedTask.id}
          onUpdate={() => {
            mutate();
          }}
        />
      )}
    </div>
  )
} 