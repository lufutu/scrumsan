// Centralized type definitions for the entire application
// This file contains all shared interfaces to ensure consistency across components

export interface User {
  id: string
  fullName: string | null
  email: string
  avatarUrl?: string | null
}

export interface TaskAssignee {
  user: User
}

export interface TaskReviewer {
  user: User
}

export interface TaskLabel {
  label: Label
}

export interface Task {
  id: string
  title: string
  description?: string | null
  taskType?: string | null
  priority?: string | null
  storyPoints?: number | null
  boardId?: string
  columnId?: string | null
  sprintColumnId?: string | null
  sprintId?: string | null
  position?: number | null
  taskAssignees?: TaskAssignee[]
  taskReviewers?: TaskReviewer[]
  taskLabels?: TaskLabel[]
  dueDate?: string | null
  createdAt?: string
  updatedAt?: string
  board?: Board | null
  itemCode?: string
  commentsCount?: number
  filesCount?: number
  checklistsCount?: number
  completedChecklists?: number
  subitemsCount?: number
  relationsAsSource?: Task[]
  relationsAsTarget?: Task[]
  done?: boolean // which belong to sprint column marked as done
}

export interface Sprint {
  id: string
  name: string
  goal?: string | null
  status?: string | null
  startDate?: string | null
  endDate?: string | null
  position: number
  isBacklog: boolean
  isDeleted: boolean
  isFinished: boolean
  maxColumns?: number | null
  boardId: string
  tasks?: Task[]
  _count?: {
    tasks: number
  }
}

export interface BoardColumn {
  id: string
  name: string
  position: number
  boardId: string
  tasks: Task[]
}

export interface Board {
  id: string
  name: string
  description?: string | null
  boardType?: string | null
  color?: string | null
  organizationId: string
  projectId?: string | null
  createdAt: string
  updatedAt: string
  columns?: BoardColumn[]
  board_columns?: BoardColumn[] // Legacy naming
  sprints?: Sprint[]
  tasks?: Task[]
  organization?: {
    id: string
    name: string
  } | null
  project?: {
    id: string
    name: string
  } | null
}

export interface Project {
  id: string
  name: string
  description?: string | null
  organizationId: string
  createdAt: string
  updatedAt: string
  boards?: Board[]
  sprints?: Sprint[]
  tasks?: Task[]
}

export interface Organization {
  id: string
  name: string
  description?: string | null
  createdAt: string
  updatedAt: string
  projects?: Project[]
  boards?: Board[]
  members?: User[]
}

export interface Label {
  id: string
  name: string
  color: string | null
}

// Component Props Interfaces
export interface TaskCardProps {
  id: string
  itemCode?: string
  title: string
  description?: string
  taskType: 'story' | 'bug' | 'task' | 'epic' | 'improvement' | 'idea' | 'note'
  storyPoints?: number
  assignees?: Array<{
    id: string
    name: string
    avatar?: string
    initials: string
  }>
  labels?: Array<{
    id: string
    name: string
    color: string
  }>
  priority?: 'critical' | 'high' | 'medium' | 'low'
  commentsCount?: number
  filesCount?: number
  checklistsCount?: number
  completedChecklists?: number
  subitemsCount?: number
  dueDate?: string
  url?: string
  status?: 'todo' | 'in_progress' | 'done'
  organizationId?: string
  boardId?: string
  onClick?: () => void
  onAssigneesChange?: () => void
}

export interface ProductBacklogProps {
  boardId: string
  organizationId?: string
  projectId?: string
  initialTaskId?: string | null
  boardColor?: string | null
  boardData?: any // Will be typed more specifically later
  onDataChange?: () => void
}

export interface SprintBacklogProps {
  sprintId: string
  boardId: string
  organizationId?: string
  onTaskClick?: (task: Task) => void
  onUpdate?: () => void
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T = any> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// Form Data Types
export interface TaskFormData {
  title: string
  description?: string
  taskType?: string
  priority?: string
  storyPoints?: number
  assigneeIds?: string[]
  reviewerIds?: string[]
  labels?: string[]
  dueDate?: string
  boardId?: string
  columnId?: string
  sprintId?: string
  sprintColumnId?: string
  parentId?: string
}

export interface SprintFormData {
  name: string
  goal?: string
  startDate?: string
  endDate?: string
  boardId: string
}

export interface BoardFormData {
  name: string
  description?: string
  boardType?: 'kanban' | 'scrum'
  color?: string
  organizationId: string
  projectId?: string
}

// Component-specific prop interfaces
export interface ProjectBoardProps {
  projectId: string
}

export interface StandaloneBoardViewProps {
  board: Board
  onUpdate: () => void
}

export interface EnhancedScrumBoardProps {
  projectId: string
  boardId: string
  organizationId?: string
}

export interface SprintBacklogViewProps {
  sprintId: string
  boardId: string
  organizationId?: string
  onTaskClick?: (task: Task) => void
  onUpdate?: () => void
}

export interface ItemModalProps {
  isOpen: boolean
  onClose: () => void
  taskId: string
  onUpdate?: () => void
}

export interface TaskAssigneeSelectorProps {
  taskId: string
  boardId?: string
  organizationId?: string
  currentAssignees: Array<{
    id: string
    name: string
    avatar?: string
    initials: string
  }>
  onAssigneesChange: (assignees: Array<{
    id: string
    name: string
    avatar?: string
    initials: string
  }>) => void
  children: React.ReactNode
}