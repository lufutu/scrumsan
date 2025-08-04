"use client"

import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { GripVertical, Plus, MoreHorizontal, Edit, Trash2, Settings } from 'lucide-react'
import { TaskCardModern } from '@/components/scrum/TaskCardModern'
import TaskCreationDialog from '@/components/common/TaskCreationDialog'
import { ComprehensiveInlineForm } from '@/components/scrum/ComprehensiveInlineForm'
import { ItemModal } from '@/components/scrum/ItemModal'
import { useUsers } from '@/hooks/useUsers'
import { useLabels } from '@/hooks/useLabels'
import { useBoardColumns } from '@/hooks/useBoardColumns'
import { useSupabase } from '@/providers/supabase-provider'
import { useOrganization } from '@/providers/organization-provider'
import BoardEditForm from '@/components/boards/board-edit-form'
import BoardDeleteDialog from '@/components/boards/board-delete-dialog'
import { Task } from '@/types/shared'
import { toast } from 'sonner'
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DragStart,
} from '@hello-pangea/dnd'

type Board = {
  id: string
  name: string
  boardType: string | null
  organizationId: string
  description: string | null
  color: string | null
  createdAt: string
  createdBy?: string | null
  organization?: {
    id: string
    name: string
  } | null
  projectLinks?: Array<{
    id: string
    project: {
      id: string
      name: string
    }
  }>
  columns?: BoardColumn[]
  _count?: {
    tasks: number
    sprints: number
  }
}

type BoardColumn = {
  id: string
  name: string
  position: number
  tasks: Array<Task>
}

interface StandaloneBoardViewProps {
  board: Board
  onUpdate: () => void
}

export default function StandaloneBoardView({ board, onUpdate }: StandaloneBoardViewProps) {
  const { toast: uiToast } = useToast()
  const { user } = useSupabase()
  const { currentMember } = useOrganization()
  const [showInlineForm, setShowInlineForm] = useState<{[key: string]: boolean}>({})
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [columnToDelete, setColumnToDelete] = useState<string | null>(null)
  const { users } = useUsers({ organizationId: board.organizationId })
  const { labels } = useLabels(board.id)
  const { createColumn, updateColumn, deleteColumn, mutate: mutateColumns } = useBoardColumns(board.id)
  
  // Check if current user can edit/delete this board
  const canEditBoard = user?.id === board.createdBy || ['owner', 'admin'].includes(currentMember?.role || '')
  console.log("board", board, labels)

  // Drag and drop handlers for @hello-pangea/dnd
  const handleDragEnd = async (result: DropResult) => {
    const { destination, draggableId, source } = result

    if (!destination || !board?.columns) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const sourceColumnId = source.droppableId
    const targetColumnId = destination.droppableId

    // Store original state for rollback
    const originalColumns = board.columns.map(col => ({ ...col, tasks: [...col.tasks] }))

    try {
      // Find the task being moved
      const sourceColumn = board.columns.find(col => col.id === sourceColumnId)
      const task = sourceColumn?.tasks.find(t => t.id === draggableId)
      
      if (!task || !sourceColumn) return

      // OPTIMISTIC UPDATE: Immediately update UI
      const updatedColumns = board.columns.map(col => {
        if (col.id === sourceColumnId) {
          // Remove task from source column
          return {
            ...col,
            tasks: col.tasks.filter(t => t.id !== draggableId)
          }
        } else if (col.id === targetColumnId) {
          // Add task to target column at the correct position
          const newTasks = [...col.tasks]
          newTasks.splice(destination.index, 0, { ...task, columnId: targetColumnId })
          return {
            ...col,
            tasks: newTasks
          }
        }
        return col
      })

      // Update board state immediately for optimistic UI
      board.columns = updatedColumns

      // Trigger UI refresh
      onUpdate()

      // Make API call in background
      const response = await fetch(`/api/tasks/${draggableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          columnId: targetColumnId
        }),
      })

      if (!response.ok) throw new Error('Failed to update task')

      uiToast({
        title: "Success",
        description: "Task moved successfully"
      })
    } catch (err: unknown) {
      console.error('Error moving task:', err)
      
      // Rollback on error - restore original state
      board.columns = originalColumns
      onUpdate()
      
      uiToast({
        title: "Error",
        description: "Failed to move task"
      })
    }
  }

  // Column CRUD handlers
  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return

    try {
      await createColumn({
        name: newColumnName.trim(),
        position: board.columns?.length || 0,
      })
      setNewColumnName('')
      setIsAddColumnOpen(false)
      toast.success('Column added successfully')
      onUpdate() // Refresh board data
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to add column')
    }
  }

  const handleDeleteColumn = async (columnId: string) => {
    try {
      await deleteColumn(columnId)
      toast.success('Column deleted successfully')
      onUpdate() // Refresh board data
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete column')
    }
  }

  const handleRenameColumn = async (columnId: string, newName: string) => {
    try {
      await updateColumn(columnId, { name: newName })
      toast.success('Column renamed successfully')
      onUpdate() // Refresh board data
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to rename column')
    }
  }

  if (!board?.columns) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-destructive">Board has no columns</div>
        </CardContent>
      </Card>
    )
  }

  // For scrum boards, use the ProjectScrumBoard component
  if (board.boardType === 'scrum' && board.columns) {
    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="h-full">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">{board.name}</h2>
              <p className="text-muted-foreground">Standalone Scrum board</p>
            </div>
            {canEditBoard && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Board Settings
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <BoardEditForm
                    board={{
                      id: board.id,
                      name: board.name,
                      description: board.description,
                      boardType: board.boardType,
                      color: board.color
                    }}
                    onSuccess={onUpdate}
                  >
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Board
                    </DropdownMenuItem>
                  </BoardEditForm>
                  <DropdownMenuSeparator />
                  <BoardDeleteDialog
                    board={{
                      id: board.id,
                      name: board.name,
                      _count: {
                        tasks: board.columns?.reduce((total, col) => total + col.tasks.length, 0) || 0,
                        sprints: 0
                      }
                    }}
                    onSuccess={onUpdate}
                    redirectTo="/boards"
                  >
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Board
                    </DropdownMenuItem>
                  </BoardDeleteDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          <div className="flex gap-6 h-full min-h-96 overflow-x-auto">
            <div className="flex gap-6 min-w-max">
              {board.columns.map((column) => (
                <div key={column.id} className="flex flex-col w-[350px] flex-shrink-0">
                  <Card className="flex-1">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                          <CardTitle className="text-lg font-semibold">
                            {column.name} ({column.tasks.length})
                          </CardTitle>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="hover:bg-gray-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              const newName = prompt('Enter new column name:', column.name)
                              if (newName && newName.trim()) handleRenameColumn(column.id, newName.trim())
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Rename Column
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setColumnToDelete(column.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Column
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                  
                    <CardContent className="flex-1 space-y-3 min-h-64">
                      <Droppable droppableId={column.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`space-y-3 min-h-64 ${
                              snapshot.isDraggingOver ? 'bg-blue-50 border-blue-300 border-2 border-dashed rounded-lg p-2' : ''
                            }`}
                          >
                            {column.tasks.length === 0 ? (
                              <div className="text-center text-muted-foreground text-sm py-8">
                                No tasks in this column
                              </div>
                            ) : (
                              <>
                                {column.tasks.map((task: Task, index: number) => (
                                  <Draggable key={task.id} draggableId={task.id} index={index}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className="cursor-move"
                                        style={{
                                          ...provided.draggableProps.style,
                                          opacity: snapshot.isDragging ? 0.5 : 1,
                                        }}
                                      >
                                        <TaskCardModern
                                          id={task.id}
                                          title={task.title}
                                          description={task.description || ''}
                                          taskType={task.taskType as 'story' | 'bug' | 'task' | 'epic' | 'improvement' | 'idea' | 'note' || 'task'}
                                          storyPoints={task.storyPoints || 0}
                                          priority={task.priority as 'critical' | 'high' | 'medium' | 'low'}
                                          assignees={task.taskAssignees?.map((ta: any) => ({
                                            id: ta.user.id,
                                            name: ta.user.fullName || ta.user.email || 'Unknown User',
                                            avatar: ta.user.avatarUrl || undefined,
                                            initials: ta.user.fullName?.split(' ').map((n: string) => n[0]).join('') || 'U'
                                          })) || []}
                                          labels={task.taskLabels ? task.taskLabels.map(tl => ({
                                            id: tl.label.id,
                                            name: tl.label.name,
                                            color: tl.label.color || '#6B7280'
                                          })) : []}
                                          dueDate={task.dueDate}
                                          organizationId={board.organizationId}
                                          boardId={board.id}
                                          onClick={() => setSelectedTask(task)}
                                          onAssigneesChange={() => {
                                            onUpdate() // Trigger board refresh when assignees change
                                          }}
                                        />
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                              </>
                            )}
                            {provided.placeholder}
                            
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
                                          boardId: board.id,
                                          columnId: column.id,
                                          taskType: data.taskType,
                                          labels: data.labels || [],
                                          taskAssignees: data.assignees || [],
                                          priority: data.priority,
                                          storyPoints: data.storyPoints,
                                        })
                                      });
                                      
                                      if (!response.ok) {
                                        const error = await response.json();
                                        throw new Error(error.message || 'Failed to create task');
                                      }
                                      
                                      onUpdate();
                                      setShowInlineForm(prev => ({ ...prev, [column.id]: false }));
                                      uiToast({
                                        title: "Success",
                                        description: "Task created successfully"
                                      });
                                    } catch (err: any) {
                                      console.error('Error creating task:', err)
                                      uiToast({
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
                          </div>
                        )}
                      </Droppable>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
          
          {/* Footer removed - using inline add in columns */}
        </div>
      </DragDropContext>
    )
  }

  // Kanban board implementation
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="h-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">{board.name}</h2>
            <p className="text-muted-foreground">
              {board.boardType === 'scrum' ? 'Scrum' : 'Kanban'} board
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={() => setIsAddColumnOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Column
            </Button>
            {canEditBoard && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Board Settings
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <BoardEditForm
                    board={{
                      id: board.id,
                      name: board.name,
                      description: board.description,
                      boardType: board.boardType,
                      color: board.color
                    }}
                    onSuccess={onUpdate}
                  >
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Board
                    </DropdownMenuItem>
                  </BoardEditForm>
                  <DropdownMenuSeparator />
                  <BoardDeleteDialog
                    board={{
                      id: board.id,
                      name: board.name,
                      _count: {
                        tasks: board.columns?.reduce((total, col) => total + col.tasks.length, 0) || 0,
                        sprints: 0
                      }
                    }}
                    onSuccess={onUpdate}
                    redirectTo="/boards"
                  >
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Board
                    </DropdownMenuItem>
                  </BoardDeleteDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <div className="flex gap-6 h-full min-h-96 overflow-x-auto">
          <div className="flex gap-6 min-w-max">
            {board.columns?.map((column) => (
              <div key={column.id} className="flex flex-col w-[350px] flex-shrink-0">
                <Card className="flex-1">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        <CardTitle className="text-lg font-semibold">
                          {column.name} ({column.tasks.length})
                        </CardTitle>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="hover:bg-gray-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            const newName = prompt('Enter new column name:', column.name)
                            if (newName && newName.trim()) handleRenameColumn(column.id, newName.trim())
                          }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Rename Column
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setColumnToDelete(column.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Column
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="flex-1 space-y-3 min-h-64">
                    <Droppable droppableId={column.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`space-y-3 min-h-64 ${
                            snapshot.isDraggingOver ? 'bg-blue-50 border-blue-300 border-2 border-dashed rounded-lg p-2' : ''
                          }`}
                        >
                          {column.tasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className="cursor-move"
                                  style={{
                                    ...provided.draggableProps.style,
                                    opacity: snapshot.isDragging ? 0.5 : 1,
                                  }}
                                >
                                  <TaskCardModern
                                    id={task.id}
                                    title={task.title}
                                    description={task.description || ''}
                                    taskType={task.taskType as 'story' | 'bug' | 'task' | 'epic' | 'improvement' | 'idea' | 'note' || 'task'}
                                    storyPoints={task.storyPoints || 0}
                                    priority={task.priority as 'critical' | 'high' | 'medium' | 'low'}
                                    assignees={task.taskAssignees?.map((ta: any) => ({
                                      id: ta.user.id,
                                      name: ta.user.fullName || ta.user.email || 'Unknown User',
                                      avatar: ta.user.avatarUrl || undefined,
                                      initials: ta.user.fullName?.split(' ').map((n: string) => n[0]).join('') || 'U'
                                    })) || []}
                                    labels={task.taskLabels ? task.taskLabels.map(tl => ({
                                      id: tl.label.id,
                                      name: tl.label.name,
                                      color: tl.label.color || '#6B7280'
                                    })) : []}
                                    dueDate={task.dueDate}
                                    organizationId={board.organizationId}
                                    boardId={board.id}
                                    onClick={() => setSelectedTask(task)}
                                    onAssigneesChange={() => {
                                      onUpdate() // Trigger board refresh when assignees change
                                    }}
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          
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
                                        boardId: board.id,
                                        columnId: column.id,
                                        taskType: data.taskType,
                                        assignees: data.assignees || [],
                                        labels: data.labels || [],
                                        priority: data.priority,
                                        storyPoints: data.storyPoints,
                                      })
                                    });
                                    
                                    if (!response.ok) {
                                      const error = await response.json();
                                      throw new Error(error.message || 'Failed to create task');
                                    }
                                    
                                    onUpdate();
                                    setShowInlineForm(prev => ({ ...prev, [column.id]: false }));
                                    uiToast({
                                      title: "Success",
                                      description: "Task created successfully"
                                    });
                                  } catch (err: unknown) {
                                    console.error('Error creating task:', err)
                                    uiToast({
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
                        </div>
                      )}
                    </Droppable>
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
              onUpdate();
            }}
          />
        )}

        {/* Add Column Dialog */}
        <Dialog open={isAddColumnOpen} onOpenChange={setIsAddColumnOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Column</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="column-name">Column Name</Label>
                <Input
                  id="column-name"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Enter column name..."
                  className="border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsAddColumnOpen(false)} className="px-4">
                Cancel
              </Button>
              <Button onClick={handleAddColumn} disabled={!newColumnName.trim()} className="px-4 bg-blue-600 hover:bg-blue-700">
                Add Column
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Column Confirmation Dialog */}
        <AlertDialog open={!!columnToDelete} onOpenChange={() => setColumnToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Column</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this column? This action cannot be undone.
                All tasks in this column will need to be moved to another column first.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (columnToDelete) {
                    handleDeleteColumn(columnToDelete)
                    setColumnToDelete(null)
                  }
                }}
                className="bg-destructive hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DragDropContext>
  )
} 