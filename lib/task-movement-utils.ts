interface TaskRelations {
  blockedBy: Array<{
    id: string
  }>
}

/**
 * Checks if a task can be moved to a new status/column based on blocking relationships
 */
export function canMoveTask(
  task: { id: string },
  targetColumnName: string,
  taskRelations?: TaskRelations
): { canMove: boolean; reason?: string } {
  // If no relations data, allow movement (will be checked server-side)
  if (!taskRelations) {
    return { canMove: true }
  }

  // Check if task is blocked by incomplete items
  const incompleteBlockers = taskRelations.blockedBy

  // If trying to move to a "done" column while blocked by incomplete items
  if (
    incompleteBlockers.length > 0 && 
    (targetColumnName.toLowerCase().includes('done') || 
     targetColumnName.toLowerCase().includes('complete'))
  ) {
    return {
      canMove: false,
      reason: `This item is blocked by ${incompleteBlockers.length} incomplete item${incompleteBlockers.length > 1 ? 's' : ''}. Complete the blocking items first.`
    }
  }

  // If trying to move to "in progress" while blocked, show warning but allow
  if (
    incompleteBlockers.length > 0 && 
    targetColumnName.toLowerCase().includes('progress')
  ) {
    return {
      canMove: true,
      reason: `Warning: This item is blocked by ${incompleteBlockers.length} incomplete item${incompleteBlockers.length > 1 ? 's' : ''}. Consider completing blocking items first.`
    }
  }

  return { canMove: true }
}

/**
 * Gets a warning message for moving a blocked task
 */
export function getBlockingWarning(taskRelations?: TaskRelations): string | null {
  if (!taskRelations) return null

  const incompleteBlockers = taskRelations.blockedBy

  if (incompleteBlockers.length > 0) {
    return `This item is blocked by ${incompleteBlockers.length} incomplete item${incompleteBlockers.length > 1 ? 's' : ''}`
  }

  return null
}

/**
 * Checks if a column represents a "done" state
 */
export function isDoneColumn(columnName: string): boolean {
  const doneKeywords = ['done', 'complete', 'finished', 'resolved', 'closed']
  return doneKeywords.some(keyword => 
    columnName.toLowerCase().includes(keyword)
  )
}

/**
 * Checks if a column represents an "in progress" state
 */
export function isProgressColumn(columnName: string): boolean {
  const progressKeywords = ['progress', 'doing', 'active', 'working', 'development', 'review']
  return progressKeywords.some(keyword => 
    columnName.toLowerCase().includes(keyword)
  )
}