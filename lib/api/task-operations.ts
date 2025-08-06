'use client'

import { Task } from '@/types/shared'

/**
 * Simple API client for task operations
 * Designed to work with optimistic UI updates
 */

export interface MoveTaskParams {
  taskId: string
  targetSprintId: string | null
  targetColumnId: string | null
  originalTask: Task
}

/**
 * Move task between sprints/columns via API
 * This is called AFTER the UI has been updated optimistically
 */
export async function moveTaskViaAPI(params: MoveTaskParams): Promise<void> {
  const { taskId, targetSprintId, targetColumnId, originalTask } = params

  // Determine the type of move operation
  const isMovingToBacklog = targetSprintId === null
  const isMovingToSprintColumn = targetSprintId !== null && targetColumnId !== null
  const isMovingToSprintOnly = targetSprintId !== null && targetColumnId === null

  try {
    if (isMovingToBacklog) {
      // Moving to backlog - use the move-to-backlog API
      await fetch(`/api/sprints/${originalTask.sprintId}/tasks/move-to-backlog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          position: 0 // TODO: Calculate proper position
        })
      })
    } else if (isMovingToSprintColumn) {
      // Moving to specific sprint column - use the move API
      await fetch(`/api/sprints/${targetSprintId}/tasks/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          targetColumnId,
          position: 0 // TODO: Calculate proper position
        })
      })
    } else if (isMovingToSprintOnly) {
      // Moving to sprint (no specific column) - use the tasks API
      await fetch(`/api/sprints/${targetSprintId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId
        })
      })
    } else {
      throw new Error('Invalid move operation parameters')
    }

  } catch (error) {
    console.error('API move failed:', error)
    throw error
  }
}

/**
 * Batch move multiple tasks (for future use)
 */
export async function moveTasksViaAPI(operations: MoveTaskParams[]): Promise<void> {
  // Execute moves in parallel
  await Promise.all(
    operations.map(params => moveTaskViaAPI(params))
  )
}

/**
 * Helper to determine if a task is in backlog
 */
export function isTaskInBacklog(task: Task): boolean {
  return !task.sprintId && !task.columnId && !task.sprintColumnId
}

/**
 * Helper to determine if a task is in a sprint column
 */
export function isTaskInSprintColumn(task: Task): boolean {
  return !!task.sprintId && !!task.sprintColumnId
}

/**
 * Helper to determine if a task is in a board column (Kanban)
 */
export function isTaskInBoardColumn(task: Task): boolean {
  return !!task.columnId && !task.sprintId
}