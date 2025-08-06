"use client"

import { useState, useRef, useEffect } from 'react'
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { cn } from '@/lib/utils'
import { DropZoneHighlight } from '@/components/drag-drop/DropIndicator'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, MoreVertical, Trash2, Edit, Calendar, Play, Check, Archive } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'
import { ComprehensiveInlineForm } from './ComprehensiveInlineForm'
import { TaskCardModern } from './TaskCardModern'
import { Sprint, Task } from '@/types/shared'
import { DragDataTypes } from '@/lib/optimistic-drag-drop'
import { useOptimisticDragDrop } from '@/components/drag-drop/OptimisticDragDropProvider'

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
  // New props for Pragmatic D&D
  onTaskDrop?: (taskId: string, targetSprintId: string) => void
  organizationId?: string
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
  onTaskDrop,
  organizationId
}: StaticSprintColumnProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [isDraggedOver, setIsDraggedOver] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)
  
  // Get global drag state for drop preview
  const { isDragging, draggedTaskId, tasks: allTasks } = useOptimisticDragDrop()
  const draggedTask = isDragging && draggedTaskId ? allTasks.find(t => t.id === draggedTaskId) : null

  const getSprintStatus = () => {
    if (sprint.isBacklog) {
      return { label: 'Backlog', color: 'bg-gray-100 text-gray-600' }
    }
    if (sprint.status === 'active') {
      return { label: 'Active', color: 'bg-green-100 text-green-800' }
    } else if (sprint.status === 'completed') {
      return { label: 'Completed', color: 'bg-gray-100 text-gray-800' }
    }
    return { label: 'Planning', color: 'bg-blue-100 text-blue-800' }
  }

  const status = getSprintStatus()

  // Setup drop target functionality
  useEffect(() => {
    const element = dropRef.current
    if (!element) return

    return dropTargetForElements({
      element,
      canDrop: ({ source }) => DragDataTypes.isTask(source.data),
      getData: () => ({
        type: sprint.isBacklog ? 'backlog' : 'sprint',
        sprintId: sprint.id
      }),
      onDragEnter: () => setIsDraggedOver(true),
      onDragLeave: () => setIsDraggedOver(false),
      onDrop: ({ source }) => {
        setIsDraggedOver(false)
        
        if (DragDataTypes.isTask(source.data) && onTaskDrop) {
          onTaskDrop(source.data.taskId, sprint.id)
        }
      }
    })
  }, [sprint.id, sprint.isBacklog, onTaskDrop])

  return (
    <div className={cn(
      "rounded-lg shadow-sm border w-80 flex-shrink-0",
      sprint.isBacklog 
        ? "bg-gray-50 border-gray-300 border-dashed" 
        : "bg-white border-gray-200"
    )}>
      <DropZoneHighlight 
        isActive={isDraggedOver} 
        className="h-full"
      >
        <div
          ref={dropRef}
          className={cn(
            "h-full overflow-hidden flex flex-col",
            isActiveSprint && "ring-2 ring-blue-500"
          )}
        >
            <div
              className={cn(
                "p-4 border-b border-gray-200",
                sprint.isBacklog 
                  ? "bg-gray-100" 
                  : boardColor ? "" : "bg-gray-50"
              )}
              style={!sprint.isBacklog && boardColor ? { backgroundColor: `${boardColor}15` } : undefined}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {sprint.isBacklog && <Archive className="h-5 w-5 text-gray-500" />}
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
              {/* Trello-style Drop Preview */}
              {isDraggedOver && draggedTask && (
                <div className="mb-3">
                  <div className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-3 opacity-75">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-blue-500 rounded flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-blue-800 truncate">
                          {draggedTask.title}
                        </div>
                        <div className="text-xs text-blue-600">
                          {draggedTask.itemCode}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Empty state when no tasks */}
              {tasks.length === 0 && !isDraggedOver && (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">No items in this {sprint.isBacklog ? 'backlog' : 'sprint'}</p>
                  <p className="text-xs mt-1">Drag items here to add them</p>
                </div>
              )}
              
              {/* Regular task list */}
              {tasks.length > 0 && (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <TaskCardModern
                      key={task.id}
                      id={task.id}
                      itemCode={task.itemCode}
                      title={task.title}
                      taskType={task.taskType}
                      storyPoints={task.storyPoints}
                      assignees={task.taskAssignees?.map(ta => ({
                        id: ta.user.id,
                        name: ta.user.fullName || ta.user.email || 'Unknown',
                        avatar: ta.user.avatarUrl,
                        initials: ta.user.fullName?.split(' ').map(n => n[0]).join('') || 'U'
                      })) || []}
                      labels={task.taskLabels?.map(tl => ({
                        id: tl.label.id,
                        name: tl.label.name,
                        color: tl.label.color || '#gray'
                      })) || []}
                      priority={task.priority}
                      dueDate={task.dueDate}
                      organizationId={organizationId}
                      boardId={boardId}
                      sprintId={sprint.id}
                      onClick={() => onTaskClick?.(task)}
                      onAssigneesChange={onTaskUpdate}
                    />
                  ))}
                </div>
              )}
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
      </DropZoneHighlight>
    </div>
  )
}