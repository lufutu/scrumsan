"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, Edit, Trash, AlertCircle, ArrowUp, Ban, AlertTriangle } from 'lucide-react'
import { useTaskRelations } from '@/hooks/useTaskRelations'
import { Tables } from '@/types/database'
import { ItemModal } from '@/components/scrum/ItemModal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from '@/lib/utils'
import { getItemTypeColor } from '@/lib/constants'

type Task = Tables<'tasks'> & {
  assignee?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
  created_by_user?: {
    id: string
    full_name: string | null
  } | null
  _count?: {
    comments: number
    attachments: number
  }
}

interface TaskCardProps {
  task: Task
  projectId?: string
  organizationId?: string
  onUpdate?: () => void
  onDelete?: (taskId: string) => void
  className?: string
  compact?: boolean
  showSprint?: boolean
}

export default function TaskCard({ task, onUpdate, onDelete, className = "" }: TaskCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const { relations, hasParent, hasSubitems, isBlocked, isBlocking } = useTaskRelations(task.id)

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this task?')) {
      onDelete?.(task.id)
    }
  }



  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'story': return '📖'
      case 'bug': return '🐛'
      case 'task': return '✓'
      case 'epic': return '⚡'
      case 'improvement': return '⬆️'
      default: return '•'
    }
  }

  return (
    <>
    <div 
      className={cn(
        "group bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer",
        "relative",
        className
      )}
      onClick={() => setIsEditModalOpen(true)}
    >
      {/* Task Type Label */}
      <div className="px-3 py-2 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-4 h-4 rounded-full flex items-center justify-center text-xs",
              getItemTypeColor(task.task_type || 'task').color,
              getItemTypeColor(task.task_type || 'task').bgColor
            )}>
              {getTaskTypeIcon(task.task_type || 'task')}
            </div>
            <span className="text-xs text-gray-500 uppercase font-medium">
              {task.task_type || 'Task'}
            </span>
          </div>
          
          {/* Status indicator */}
          {task.status === 'done' && (
            <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-3">
        {/* Task ID and Title */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-400 font-mono">#{task.id.slice(0, 8)}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation()
                  setIsEditModalOpen(true)
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Task
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation()
                  handleDelete()
                }} className="text-destructive">
                  <Trash className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <h4 className="font-medium text-sm leading-snug text-gray-900">
            {task.title}
          </h4>
        </div>

        {/* Labels */}
        <div className="flex flex-wrap gap-1 mb-3">
          {/* Priority label */}
          {(task as { priority?: string }).priority && (task as { priority?: string }).priority !== 'medium' && (
            <div className={cn(
              "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
              (task as { priority?: string }).priority === 'critical' && "bg-red-100 text-red-800",
              (task as { priority?: string }).priority === 'high' && "bg-orange-100 text-orange-800",
              (task as { priority?: string }).priority === 'low' && "bg-green-100 text-green-800"
            )}>
              {(task as { priority?: string }).priority}
            </div>
          )}
          
          {/* Story Points */}
          {(task as { story_points?: number }).story_points && (task as { story_points?: number }).story_points > 0 && (
            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {(task as { story_points?: number }).story_points} SP
            </div>
          )}
        </div>

        {/* Assignee and Activity */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Assignee */}
            {task.assignee && (
              <div className="flex items-center gap-1">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-medium">
                    {task.assignee.full_name?.charAt(0) || 'U'}
                  </span>
                </div>
                <span className="text-xs text-gray-600 truncate max-w-20">
                  {task.assignee.full_name || 'Unassigned'}
                </span>
              </div>
            )}
          </div>
          
          {/* Activity indicators */}
          <div className="flex items-center gap-2">
            {/* Relationship indicators */}
            {(hasParent || hasSubitems || isBlocked || isBlocking) && (
              <div className="flex items-center gap-1">
                {hasParent && (
                  <div className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center" title="Has parent item">
                    <ArrowUp className="w-2 h-2 text-blue-600" />
                  </div>
                )}
                {hasSubitems && (
                  <div className="w-4 h-4 bg-green-100 rounded flex items-center justify-center" title={`${relations.subitems.length} subitems`}>
                    <span className="text-xs font-medium text-green-600">{relations.subitems.length}</span>
                  </div>
                )}
                {isBlocked && (
                  <div className="w-4 h-4 bg-red-100 rounded flex items-center justify-center" title="Blocked by other items">
                    <AlertTriangle className="w-2 h-2 text-red-600" />
                  </div>
                )}
                {isBlocking && (
                  <div className="w-4 h-4 bg-orange-100 rounded flex items-center justify-center" title={`Blocking ${relations.blocking.length} items`}>
                    <Ban className="w-2 h-2 text-orange-600" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    <ItemModal
      isOpen={isEditModalOpen}
      onClose={() => setIsEditModalOpen(false)}
      taskId={task.id}
      onUpdate={onUpdate}
    />
    </>
  )
} 