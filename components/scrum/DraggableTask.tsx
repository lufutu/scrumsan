"use client"

import { Draggable } from '@hello-pangea/dnd'
import { TaskCardModern } from './TaskCardModern'
import { Task } from '@/types/shared'

interface DraggableTaskProps {
  task: Task
  index: number
  onTaskClick?: (task: Task) => void
  labels: Array<{ id: string; name: string; color: string | null }>
  boardId: string
  onTaskUpdate?: () => void
}

export function DraggableTask({
  task,
  index,
  onTaskClick,
  labels,
  boardId,
  onTaskUpdate
}: DraggableTaskProps) {

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="cursor-grab active:cursor-grabbing mb-4"
          style={{
            ...provided.draggableProps.style,
            opacity: snapshot.isDragging ? 0.8 : 1,
          }}
        >
          <TaskCardModern
            id={task.id}
            itemCode={task.id}
            title={task.title}
            description={task.description || ''}
            taskType={task.taskType as 'story' | 'bug' | 'task' | 'epic' | 'improvement' | 'idea' | 'note'}
            storyPoints={task.storyPoints || 0}
            priority={task.priority as 'critical' | 'high' | 'medium' | 'low'}
            assignees={task.taskAssignees?.map((ta: unknown) => ({
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
            organizationId={task.board?.organizationId}
            boardId={boardId}
            onClick={!snapshot.isDragging ? () => onTaskClick?.(task) : undefined}
            onAssigneesChange={() => {
              onTaskUpdate?.() // Invalidate cache when labels or assignees are changed
            }}
          />
        </div>
      )}
    </Draggable>
  )
}