"use client"

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EnhancedAvatar } from '@/components/ui/enhanced-avatar'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Copy, 
  ArrowUp, 
  Plus,
  Paperclip,
  Share,
  ExternalLink
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { Task } from '@/hooks/useTasks'
import { Sprint } from '@/hooks/useSprints'
import { ITEM_TYPES, PRIORITIES, getItemTypeById, getPriorityById } from '@/lib/constants'

interface BacklogTableProps {
  boardId: string
  organizationId?: string
  backlogTasks: Task[]
  sprints: Sprint[]
  onRefresh: () => void
  onAddItem?: () => void
}


export default function BacklogTable({
  boardId,
  organizationId,
  backlogTasks,
  sprints,
  onRefresh,
  onAddItem
}: BacklogTableProps) {
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<string>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Combine backlog tasks with sprint tasks for full view
  const allTasks = [
    ...backlogTasks.map(task => ({ ...task, location: 'Backlog' })),
    ...sprints.flatMap(sprint => 
      sprint.sprintTasks?.map(st => ({
        ...st.task,
        location: sprint.name
      })) || []
    )
  ]

  const handleSelectTask = (taskId: string, checked: boolean) => {
    const newSelected = new Set(selectedTasks)
    if (checked) {
      newSelected.add(taskId)
    } else {
      newSelected.delete(taskId)
    }
    setSelectedTasks(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTasks(new Set(allTasks.map(task => task.id)))
    } else {
      setSelectedTasks(new Set())
    }
  }

  const getTaskType = (type: string | null) => {
    return getItemTypeById(type || 'task') || ITEM_TYPES[3] // Default to task
  }

  const getPriorityColor = (priority: string | null) => {
    return getPriorityById(priority || 'medium') || PRIORITIES[2] // Default to medium
  }

  return (
    <div className="h-full">
      {/* Table Actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedTasks.size === allTasks.length && allTasks.length > 0}
            onCheckedChange={handleSelectAll}
          />
          <span className="text-sm text-muted-foreground">
            {selectedTasks.size > 0 ? `${selectedTasks.size} selected` : `${allTasks.length} items`}
          </span>
          
          {selectedTasks.size > 0 && (
            <div className="flex items-center gap-2 ml-4">
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Bulk Edit
              </Button>
              <Button variant="outline" size="sm">
                <ArrowUp className="h-4 w-4 mr-2" />
                Move to Top
              </Button>
              <Button variant="outline" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          )}
        </div>

        <Button onClick={onAddItem}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedTasks.size === allTasks.length && allTasks.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Performers</TableHead>
              <TableHead>Labels</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Estimation</TableHead>
              <TableHead>Work Log</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Files</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allTasks.map((task) => {
              const taskType = getTaskType(task.taskType)
              const isSelected = selectedTasks.has(task.id)
              
              return (
                <TableRow 
                  key={task.id} 
                  className={isSelected ? 'bg-blue-50' : ''}
                >
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSelectTask(task.id, checked as boolean)}
                    />
                  </TableCell>
                  
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="text-lg">{taskType.icon}</div>
                      <div>
                        <div className="font-medium">{task.title}</div>
                        {task.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {task.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant="secondary" className={`${taskType.color} text-white`}>
                      {taskType.label}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    {task.assignee ? (
                      <div className="flex items-center gap-2">
                        <EnhancedAvatar
                          src={task.assignee.avatarUrl}
                          fallbackSeed={task.assignee.fullName || 'user'}
                          size="sm"
                          className="h-6 w-6"
                          alt={task.assignee.fullName || 'User'}
                        />
                        <span className="text-sm">{task.assignee.fullName}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex gap-1">
                      {/* Add labels here when available */}
                      <Badge variant="outline" className="text-xs">
                        No labels
                      </Badge>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Select defaultValue={task.location}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Backlog">Backlog</SelectItem>
                        {sprints.map(sprint => (
                          <SelectItem key={sprint.id} value={sprint.name}>
                            {sprint.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant="outline">
                      {task.storyPoints || 0} pts
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <span className="text-sm text-muted-foreground">0h</span>
                  </TableCell>
                  
                  <TableCell>
                    {task.priority && (
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)?.bgColor}`} />
                        <span className="text-sm capitalize">{task.priority}</span>
                      </div>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {new Date((task as any).createdAt || Date.now()).toLocaleDateString()}
                    </span>
                  </TableCell>
                  
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Share className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="h-4 w-4 mr-2" />
                            Clone
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <ArrowUp className="h-4 w-4 mr-2" />
                            Move to Top
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {allTasks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No items found</p>
          </div>
        )}
      </div>

      {/* Load More */}
      {allTasks.length > 0 && (
        <div className="flex justify-center mt-4">
          <Button variant="outline">
            Load More
          </Button>
        </div>
      )}
    </div>
  )
}