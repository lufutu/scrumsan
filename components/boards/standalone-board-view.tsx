"use client"

import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { GripVertical, Plus } from 'lucide-react'
import { TaskCardModern } from '@/components/scrum/TaskCardModern'
import TaskCreationDialog from '@/components/common/TaskCreationDialog'
import { ComprehensiveInlineForm } from '@/components/scrum/ComprehensiveInlineForm'
import { ItemModal } from '@/components/scrum/ItemModal'
import { useUsers } from '@/hooks/useUsers'
import { useLabels } from '@/hooks/useLabels'
import { Task } from '@/types/shared'
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
  const { toast } = useToast()
  const [showInlineForm, setShowInlineForm] = useState<{[key: string]: boolean}>({})
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const { users } = useUsers({ organizationId: board.organizationId })
  const { labels } = useLabels(board.id)
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

      toast({
        title: "Success",
        description: "Task moved successfully"
      })
    } catch (err: unknown) {
      console.error('Error moving task:', err)
      
      // Rollback on error - restore original state
      board.columns = originalColumns
      onUpdate()
      
      toast({
        title: "Error",
        description: "Failed to move task"
      })
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
          <div className="mb-6">
            <h2 className="text-2xl font-bold">{board.name}</h2>
            <p className="text-muted-foreground">Standalone Scrum board</p>
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
              Standalone {board.boardType === 'scrum' ? 'Scrum' : 'Kanban'} board
            </p>
          </div>
          
          <div className="flex gap-2">
            {/* Add buttons removed - using inline add in columns */}
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
                                    toast({
                                      title: "Success",
                                      description: "Task created successfully"
                                    });
                                  } catch (err: unknown) {
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
      </div>
    </DragDropContext>
  )
} 