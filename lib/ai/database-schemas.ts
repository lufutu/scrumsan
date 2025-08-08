import { z } from 'zod'
import { ITEM_TYPES, PRIORITIES } from '@/lib/constants'

// Extract valid values from constants to match our database exactly
const validTaskTypes = ITEM_TYPES.map(type => type.id) as [string, ...string[]]
const validPriorities = PRIORITIES.map(priority => priority.id) as [string, ...string[]]

/**
 * Database-aligned Task schema that matches our Prisma Task model exactly
 * This ensures AI generates data that can be directly inserted into the database
 */
export const DatabaseTaskSchema = z.object({
  // Required fields
  title: z.string().min(1, 'Task title is required').max(255, 'Task title too long'),
  
  // Core fields that match Prisma Task model exactly
  description: z.string().nullable().optional(),
  taskType: z.enum(validTaskTypes).optional().default('story'),
  priority: z.enum(validPriorities).optional().default('medium'),
  storyPoints: z.number().min(0).max(100).nullable().optional(),
  estimatedHours: z.number().min(0).max(1000).nullable().optional().default(0),
  effortUnits: z.number().min(0).max(1000).nullable().optional(),
  estimationType: z.enum(['story_points', 'effort_units']).optional().default('story_points'),
  itemValue: z.string().nullable().optional(),
  position: z.number().optional(),
  dueDate: z.string().nullable().optional(), // ISO date string
  isPriority: z.boolean().optional().default(false),
  
  // Foreign key relationships - will be set by the API
  boardId: z.string().uuid(), // Required - set by API
  columnId: z.string().uuid().nullable().optional(),
  sprintId: z.string().uuid().nullable().optional(), 
  sprintColumnId: z.string().uuid().nullable().optional(),
  epicId: z.string().uuid().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  
  // Additional AI-specific metadata (not stored in Task model directly)
  aiMetadata: z.object({
    reasoning: z.string().optional(),
    sprintRecommendation: z.enum(['backlog', 'sprint-1', 'sprint-2', 'current']).optional(),
    suggestedAssigneeNames: z.array(z.string()).optional(), // Names, not UUIDs
    acceptanceCriteria: z.array(z.string()).optional(),
    dependencies: z.array(z.string()).optional(),
    labels: z.array(z.string()).optional() // Label names, not IDs
  }).optional()
})

/**
 * Database-aligned Task generation schema
 */
export const DatabaseTaskGenerationSchema = z.object({
  summary: z.string().min(1, 'Summary is required'),
  totalTasks: z.number().min(1).max(20),
  boardType: z.enum(['scrum', 'kanban']).optional(),
  tasks: z.array(DatabaseTaskSchema).min(1, 'At least one task must be generated').max(20, 'Too many tasks generated'),
  
  // Optional planning metadata
  sprintPlan: z.object({
    sprintCount: z.number().min(1).max(5).optional(),
    sprintsNeeded: z.array(z.object({
      name: z.string(),
      taskCount: z.number(),
      reasoning: z.string().optional()
    })).optional()
  }).optional(),
  
  projectInsights: z.object({
    estimatedDuration: z.string().optional(),
    complexity: z.enum(['simple', 'moderate', 'complex', 'very-complex']).optional(),
    teamSizeRecommendation: z.string().optional(),
    riskFactors: z.array(z.string()).optional().default([])
  }).optional()
})

// Type exports
export type DatabaseTask = z.infer<typeof DatabaseTaskSchema>
export type DatabaseTaskGeneration = z.infer<typeof DatabaseTaskGenerationSchema>

/**
 * Validation helpers
 */
export const validateDatabaseTask = (task: unknown): DatabaseTask => {
  return DatabaseTaskSchema.parse(task)
}

export const validateDatabaseTaskGeneration = (generation: unknown): DatabaseTaskGeneration => {
  return DatabaseTaskGenerationSchema.parse(generation)
}

/**
 * Convert AI task to database-ready task data
 */
export const prepareTaskForDatabase = (
  aiTask: DatabaseTask,
  context: {
    boardId: string
    columnId?: string | null
    sprintId?: string | null
    sprintColumnId?: string | null
    position?: number
    createdBy: string
  }
): {
  taskData: Record<string, any>
  metadata: Record<string, any>
} => {
  const { aiMetadata, ...taskData } = aiTask
  
  return {
    // Core task data that goes directly to Prisma Task.create()
    taskData: {
      ...taskData,
      boardId: context.boardId,
      columnId: context.columnId,
      sprintId: context.sprintId,
      sprintColumnId: context.sprintColumnId,
      position: context.position,
      createdBy: context.createdBy,
      // Convert date string to Date object
      dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null
    },
    
    // AI metadata for TaskActivity record
    metadata: {
      aiGenerated: true,
      ...aiMetadata
    }
  }
}