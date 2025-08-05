"use client"

import { useState } from 'react'
import { Droppable } from '@hello-pangea/dnd'
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

interface StaticSprintColumnProps {
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

export function StaticSprintColumn({
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
}: StaticSprintColumnProps) {
  const [showAddForm, setShowAddForm] = useState(false)

  const getSprintStatus = () => {
    if (sprint.status === 'active') {
      return { label: 'Active', color: 'bg-green-100 text-green-800' }
    } else if (sprint.status === 'completed') {
      return { label: 'Completed', color: 'bg-gray-100 text-gray-800' }
    }
    return { label: 'Planning', color: 'bg-blue-100 text-blue-800' }
  }

  const status = getSprintStatus()

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 w-80 flex-shrink-0">
      <Droppable droppableId={sprint.id}>
        {(dropProvided, dropSnapshot) => (
          <div
            ref={dropProvided.innerRef}
            {...dropProvided.droppableProps}
            className={cn(
              "h-full overflow-hidden flex flex-col",
              dropSnapshot.isDraggingOver && "bg-blue-50 border-blue-300",
              isActiveSprint && "ring-2 ring-blue-500"
            )}
          >
            <div
              className={cn(
                "p-4 border-b border-gray-200",
                boardColor ? "" : "bg-gray-50"
              )}
              style={boardColor ? { backgroundColor: `${boardColor}15` } : undefined}
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

              {/* Sprint Details */}
              {sprint.goal && (
                <p className="text-sm text-gray-600 mb-2">{sprint.goal}</p>
              )}
              {sprint.startDate && sprint.endDate && (
                <p className="text-xs text-gray-500">
                  {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
                </p>
              )}
              
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-medium text-gray-700">
                  {tasks.length} {tasks.length === 1 ? 'item' : 'items'}
                </span>
              </div>
            </div>

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
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isDragOver && tasks.length === 0 && (
                <div className="text-center py-8 text-gray-400 animate-pulse">
                  <p className="text-sm">Drop here</p>
                </div>
              )}
              
              {tasks.length === 0 && !isDragOver ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">No items in this {sprint.isBacklog ? 'backlog' : 'sprint'}</p>
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

            {/* Add Task Button */}
            {!showAddForm && sprint.status !== 'completed' && (
              <div className="p-3 border-t border-gray-200">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setShowAddForm(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add item
                </Button>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  )
}