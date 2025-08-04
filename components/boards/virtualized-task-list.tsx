"use client"

import React from 'react'
import { VirtualList } from '@/components/ui/virtual-list'
import { TaskCardModern } from '@/components/scrum/TaskCardModern'
import { Task } from '@/types/shared'

interface VirtualizedTaskListProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onTaskUpdate?: () => void
  organizationId: string
  boardId: string
  containerHeight?: number
  taskHeight?: number
}

export function VirtualizedTaskList({
  tasks,
  onTaskClick,
  onTaskUpdate,
  organizationId,
  boardId,
  containerHeight = 400,
  taskHeight = 120 // Approximate height of TaskCardModern
}: VirtualizedTaskListProps) {
  const renderTask = (task: Task, index: number) => (
    <div className="px-2 py-1">
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
        organizationId={organizationId}
        boardId={boardId}
        onClick={() => onTaskClick(task)}
        onAssigneesChange={onTaskUpdate}
      />
    </div>
  )

  // Only use virtual scrolling if there are many tasks
  if (tasks.length < 20) {
    return (
      <div className="space-y-2">
        {tasks.map((task, index) => (
          <div key={task.id}>
            {renderTask(task, index)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <VirtualList
      items={tasks}
      itemHeight={taskHeight}
      containerHeight={containerHeight}
      renderItem={renderTask}
      overscan={3}
      className="border rounded-lg"
    />
  )
}

// Alternative version for column-based boards (like Kanban)
interface VirtualizedColumnTasksProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onTaskUpdate?: () => void
  organizationId: string
  boardId: string
  maxHeight?: number
}

export function VirtualizedColumnTasks({
  tasks,
  onTaskClick,
  onTaskUpdate,
  organizationId,
  boardId,
  maxHeight = 600
}: VirtualizedColumnTasksProps) {
  const taskHeight = 100 // Slightly smaller for column view

  const renderTask = (task: Task, index: number) => (
    <div className="mb-3">
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
        organizationId={organizationId}
        boardId={boardId}
        onClick={() => onTaskClick(task)}
        onAssigneesChange={onTaskUpdate}
      />
    </div>
  )

  // Use virtual scrolling for columns with many tasks
  if (tasks.length > 15) {
    return (
      <VirtualList
        items={tasks}
        itemHeight={taskHeight}
        containerHeight={Math.min(maxHeight, tasks.length * taskHeight)}
        renderItem={renderTask}
        overscan={2}
        className="space-y-3"
      />
    )
  }

  return (
    <div className="space-y-3">
      {tasks.map((task, index) => (
        <div key={task.id}>
          {renderTask(task, index)}
        </div>
      ))}
    </div>
  )
}