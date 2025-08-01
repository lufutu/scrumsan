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
  const [draggedTask, setDraggedTask] = useState<string | null>(null)
  const [draggedOver, setDraggedOver] = useState<string | null>(null)
  const [showInlineForm, setShowInlineForm] = useState<{[key: string]: boolean}>({})
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const { users } = useUsers({ organizationId: board.organizationId })
  const { labels } = useLabels(board.id)
  console.log("board", board, labels)

  // Scrum boards are now supported as standalone boards

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

    if (!draggedTask || !board?.columns) return

    try {
      let sourceColumn: BoardColumn | null = null
      let task: Task | null = null

      for (const column of board.columns) {
        const foundTask = column.tasks.find((t: Task) => t.id === draggedTask)
        if (foundTask) {
          sourceColumn = column
          task = foundTask as Task
          break
        }
      }

      if (!task || !sourceColumn || sourceColumn.id === targetColumnId) {
        setDraggedTask(null)
        return
      }

      const targetColumn = board.columns.find(col => col.id === targetColumnId)
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
      onUpdate()

      toast({
        title: "Success",
        description: "Task moved successfully"
      })
    } catch (err: unknown) {
      console.error('Error moving task:', err)
      toast({
        title: "Error",
        description: "Failed to move task"
      })
    }

    setDraggedTask(null)
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
      <div className="h-full">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">{board.name}</h2>
          <p className="text-muted-foreground">Standalone Scrum board</p>
        </div>
        
        {/* Import and use ProjectScrumBoard but pass organizationId instead of projectId */}
        <div className="flex gap-6 h-full min-h-96 overflow-x-auto">
          <div className="flex gap-6 min-w-max">
            {board.columns.map((column) => (
              <div key={column.id} className="flex flex-col w-[350px] flex-shrink-0">
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
                    <>
                      {column.tasks.map((task: Task) => (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleTaskDragStart(e, task.id)}
                          className="cursor-move"
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
                      
                      {column.tasks.length === 0 && (
                        <div className="text-center text-muted-foreground text-sm py-8">
                          No tasks in this column
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
              </div>
            ))}
          </div>
        </div>
        
        {/* Footer removed - using inline add in columns */}
      </div>
    )
  }

  // Kanban board implementation
  return (
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
                {column.tasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleTaskDragStart(e, task.id)}
                    className="cursor-move"
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
                              boardId: board.id,
                              columnId: column.id,
                              taskType: data.taskType,
                              assignees: data.assignees || [],
                              labels: data.labels || [],
                              priority: data.priority,
                              storyPoints: data.storyPoints,
                              status: 'todo'
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
  )
} 