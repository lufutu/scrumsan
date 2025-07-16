"use client"

import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, MessageSquare, Paperclip, User, MoreHorizontal, Edit, Trash, Target, AlertCircle } from 'lucide-react'
import { Tables } from '@/types/database'
import TaskForm from './task-form'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from '@/lib/utils'

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

export default function TaskCard({ task, projectId, organizationId, onUpdate, onDelete, className = "", compact = false, showSprint = false }: TaskCardProps) {
  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this task?')) {
      onDelete?.(task.id)
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertCircle className="h-3 w-3 text-red-500" />
      case 'high': return <AlertCircle className="h-3 w-3 text-orange-500" />
      case 'medium': return <AlertCircle className="h-3 w-3 text-yellow-500" />
      case 'low': return <AlertCircle className="h-3 w-3 text-green-500" />
      default: return null
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-l-red-500'
      case 'high': return 'border-l-orange-500'
      case 'medium': return 'border-l-yellow-500'
      case 'low': return 'border-l-green-500'
      default: return 'border-l-gray-300'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'todo': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className={cn(
      "group bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all",
      "border-l-4",
      getPriorityColor((task as any)?.priority || 'medium'),
      className
    )}>
      {/* Header with title and actions */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-sm leading-snug flex-1">
          {task.title}
        </h4>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <TaskForm 
                task={task} 
                projectId={projectId} 
                organizationId={organizationId}
                onSuccess={onUpdate} 
              />
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <Trash className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Story Points and Priority Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* Story Points */}
          {(task as any)?.story_points > 0 && (
            <Badge variant="outline" className="text-xs px-2 py-0.5">
              <Target className="h-3 w-3 mr-1" />
              {(task as any).story_points} SP
            </Badge>
          )}
          
          {/* Priority */}
          {(task as any)?.priority && (task as any).priority !== 'medium' && (
            <div className="flex items-center gap-1">
              {getPriorityIcon((task as any).priority)}
              <span className="text-xs font-medium capitalize">
                {(task as any).priority}
              </span>
            </div>
          )}
        </div>

        {/* Status Badge */}
        <Badge 
          variant="outline" 
          className={cn("text-xs px-2 py-0.5", getStatusColor(task.status || 'todo'))}
        >
          {task.status === 'in_progress' ? 'In Progress' : 
           task.status === 'todo' ? 'To Do' : 
           task.status === 'done' ? 'Done' : task.status}
        </Badge>
      </div>

      {/* Bottom Row: Assignee and Due Date */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <User className="h-3 w-3" />
          <span className="truncate max-w-20">
            {task.assignee?.full_name || 'Unassigned'}
          </span>
        </div>
        
        {task.due_date && (
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{new Date(task.due_date).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  )
} 