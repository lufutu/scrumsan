// Item/Task Types Configuration
export interface ItemType {
  id: string
  name: string
  description: string
  icon: string
  color: string
  bgColor: string
}

export const ITEM_TYPES: ItemType[] = [
  {
    id: 'story',
    name: 'Story',
    description: 'New functionality that is being created',
    icon: '📖',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100'
  },
  {
    id: 'improvement',
    name: 'Improvement',
    description: 'Existing functionalities that require additional work',
    icon: '🔥',
    color: 'text-green-700',
    bgColor: 'bg-green-100'
  },
  {
    id: 'bug',
    name: 'Bug',
    description: 'Errors, flaws, failures etc.',
    icon: '🐛',
    color: 'text-red-700',
    bgColor: 'bg-red-100'
  },
  {
    id: 'task',
    name: 'Task',
    description: 'Technical work not covered by other types',
    icon: '📋',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100'
  },
  {
    id: 'note',
    name: 'Note',
    description: 'Valuable or relevant information',
    icon: '📝',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100'
  },
  {
    id: 'idea',
    name: 'Idea',
    description: 'Thoughts that could improve the product (needs additional work)',
    icon: '💡',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100'
  }
]

// Priority Levels Configuration
export interface Priority {
  id: string
  name: string
  color: string
  bgColor: string
  icon: string
}

export const PRIORITIES: Priority[] = [
  {
    id: 'critical',
    name: 'Critical',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: '🔴'
  },
  {
    id: 'high',
    name: 'High',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    icon: '🟠'
  },
  {
    id: 'medium',
    name: 'Medium',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    icon: '🟡'
  },
  {
    id: 'low',
    name: 'Low',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: '🟢'
  }
]

// Story Points Configuration (Fibonacci sequence)
export const STORY_POINTS: number[] = [0, 1, 2, 3, 5, 8, 13, 21]

// Extended Story Points for Estimation (includes larger values)
export const FIBONACCI_POINTS: number[] = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89]

// T-Shirt Size Options
export const SIZE_OPTIONS: string[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

// REMOVED: Task Status Configuration
// Tasks no longer have a status field - use column placement instead

// Sprint Status Configuration
export interface SprintStatus {
  id: string
  name: string
  color: string
  bgColor: string
}

export const SPRINT_STATUSES: SprintStatus[] = [
  {
    id: 'planning',
    name: 'Planning',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100'
  },
  {
    id: 'active',
    name: 'Active',
    color: 'text-green-700',
    bgColor: 'bg-green-100'
  },
  {
    id: 'completed',
    name: 'Completed',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100'
  }
]

// Board Types Configuration
export interface BoardType {
  id: string
  name: string
  description: string
}

export const BOARD_TYPES: BoardType[] = [
  {
    id: 'kanban',
    name: 'Kanban',
    description: 'Continuous flow board for ongoing work'
  },
  {
    id: 'scrum',
    name: 'Scrum',
    description: 'Sprint-based board with backlog and active sprint views'
  }
]

// Helper Functions
export const getItemTypeById = (id: string): ItemType | undefined => {
  return ITEM_TYPES.find(type => type.id === id)
}

export const getPriorityById = (id: string): Priority | undefined => {
  return PRIORITIES.find(priority => priority.id === id)
}

// REMOVED: getTaskStatusById - no longer needed

export const getSprintStatusById = (id: string): SprintStatus | undefined => {
  return SPRINT_STATUSES.find(status => status.id === id)
}

// Priority Order for Sorting (higher number = higher priority)
export const PRIORITY_ORDER: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
}

// Default Board Columns
export const DEFAULT_KANBAN_COLUMNS = [
  { name: 'To Do', position: 0 },
  { name: 'In Progress', position: 1 },
  { name: 'Done', position: 2 }
]

export const DEFAULT_SCRUM_COLUMNS = [
  { name: 'To Do', position: 0 },
  { name: 'In Progress', position: 1 },
  { name: 'Review', position: 2 },
  { name: 'Done', position: 3 }
]

// Color Utilities
export const getItemTypeColor = (typeId: string): { color: string; bgColor: string } => {
  const itemType = getItemTypeById(typeId)
  return {
    color: itemType?.color || 'text-gray-700',
    bgColor: itemType?.bgColor || 'bg-gray-100'
  }
}

export const getPriorityColor = (priorityId: string): { color: string; bgColor: string } => {
  const priority = getPriorityById(priorityId)
  return {
    color: priority?.color || 'text-gray-700',
    bgColor: priority?.bgColor || 'bg-gray-100'
  }
}

// REMOVED: getStatusColor - no longer needed

// Type Guards
export const isValidItemType = (type: string): type is string => {
  return ITEM_TYPES.some(itemType => itemType.id === type)
}

export const isValidPriority = (priority: string): priority is string => {
  return PRIORITIES.some(p => p.id === priority)
}

// REMOVED: isValidTaskStatus - no longer needed

// REMOVED: getTaskStatusFromColumn - no longer needed
// Use column placement instead of derived status