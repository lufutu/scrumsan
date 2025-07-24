"use client"

import { useState } from 'react'
import { Draggable, Droppable } from '@hello-pangea/dnd'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, MoreVertical, Trash2, Edit, Calendar, Play, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'
import { ComprehensiveInlineForm } from './ComprehensiveInlineForm'
import { DraggableTask } from './DraggableTask'
import { Sprint, Task } from '@/types/shared'

interface DraggableSprintColumnProps {
  index: number
  sprint: Sprint
  tasks: Task[]
  onTaskClick?: (task: Task) => void
  onSprintAction: (action: string, sprintId: string) => void
  onAddTask?: (sprintId: string, data: {
    title: string;
    taskType: string;
    assignees?: Array<{ id: string }>;
    labels?: string[];
    storyPoints?: number;
    priority?: string;
  }) => Promise<void>
  labels: Array<{ id: string; name: string; color: string | null }>
  users: Array<{ id: string; fullName: string; email: string }>
  boardColor?: string | null
  isActiveSprint: boolean
  boardId: string
  onTaskUpdate?: () => void
  isDragOver?: boolean
  draggedTask?: Task | null
}

export function DraggableSprintColumn({
  index,
  sprint,
  tasks,
  onTaskClick,
  onSprintAction,
  onAddTask,
  labels,
  users,
  boardColor,
  isActiveSprint,
  boardId,
  onTaskUpdate,
  isDragOver,
  draggedTask
}: DraggableSprintColumnProps) {
  const [showAddForm, setShowAddForm] = useState(false)

  const totalPoints = tasks.reduce((sum, task) => sum + (task.storyPoints || 0), 0)

  const getSprintStatus = () => {
    if (sprint.isBacklog) return { label: 'Backlog', color: 'bg-gray-500' }
    if (sprint.status === 'active') return { label: 'Active', color: 'bg-green-500' }
    if (sprint.status === 'completed') return { label: 'Completed', color: 'bg-blue-500' }
    return { label: 'Planning', color: 'bg-yellow-500' }
  }

  const status = getSprintStatus()

  return (
    <Draggable draggableId={sprint.id} index={index}>
      {(dragProvided, dragSnapshot) => (
        <div
          ref={dragProvided.innerRef}
          {...dragProvided.draggableProps}
          className={cn(
            "bg-white rounded-lg shadow-sm border border-gray-200 w-80 flex-shrink-0",
            dragSnapshot.isDragging && "opacity-50"
          )}
        >
          <Droppable droppableId={sprint.id}>
            {(dropProvided, dropSnapshot) => (
              <div
                ref={dropProvided.innerRef}
                {...dropProvided.droppableProps}
                className={cn(
                  "h-full",
                  dropSnapshot.isDraggingOver && "border-blue-500 border-2 bg-blue-50/30"
                )}
              >
                {/* Sprint Header */}
                <div
                  {...dragProvided.dragHandleProps}
                  className="p-4 border-b border-gray-200 cursor-grab active:cursor-grabbing"
                  style={boardColor ? { backgroundColor: `${boardColor}20` } : undefined}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{sprint.name}</h3>
                      <Badge className={cn("text-xs", status.color)}>
                        {status.label}
                      </Badge>
                    </div>
                    {!sprint.isBacklog && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {sprint.status === 'planning' && (
                            <>
                              <DropdownMenuItem onClick={() => onSprintAction('start', sprint.id)}>
                                <Play className="h-4 w-4 mr-2" />
                                Start Sprint
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onSprintAction('edit', sprint.id)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Sprint
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {sprint.status === 'active' && (
                            <>
                              <DropdownMenuItem asChild>
                                <Link href={`/boards/${sprint.boardId}/sprint-backlog?sprintId=${sprint.id}`}>
                                  <Calendar className="h-4 w-4 mr-2" />
                                  View Sprint Backlog
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onSprintAction('finish', sprint.id)}>
                                <Check className="h-4 w-4 mr-2" />
                                Finish Sprint
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem
                            onClick={() => onSprintAction('delete', sprint.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Sprint
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{tasks.length} items</span>
                    <span>{totalPoints} points</span>
                  </div>
                  {sprint.goal && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{sprint.goal}</p>
                  )}
                </div>

                {/* Add Task Button */}
                {!showAddForm && (
                  <div className="px-4 py-3 border-b border-gray-200">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowAddForm(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add item
                    </Button>
                  </div>
                )}

                {/* Inline Form */}
                {showAddForm && (
                  <div className="px-4 py-3 border-b border-gray-200">
                    <ComprehensiveInlineForm
                      onAdd={async (data) => {
                        if (onAddTask) {
                          await onAddTask(sprint.id, data)
                          setShowAddForm(false)
                        }
                      }}
                      onCancel={() => setShowAddForm(false)}
                      placeholder="What needs to be done?"
                      users={users}
                      labels={labels}
                    />
                  </div>
                )}

                {/* Sprint Tasks */}
                <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                  {tasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <p className="text-sm">No items in this sprint</p>
                      <p className="text-xs mt-1">Drag items here to add them</p>
                    </div>
                  ) : (
                    <div>
                      {tasks.map((task, taskIndex) => (
                        <DraggableTask
                          key={task.id || taskIndex}
                          task={task}
                          index={taskIndex}
                          onTaskClick={onTaskClick}
                          labels={labels}
                          boardId={boardId}
                          onTaskUpdate={onTaskUpdate}
                        />
                      ))}
                    </div>
                  )}
                  {dropProvided.placeholder}
                </div>
              </div>
            )}
          </Droppable>
        </div>
      )}
    </Draggable>
  )
}