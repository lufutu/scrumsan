import { z } from 'zod'
import { ITEM_TYPES, PRIORITIES } from '@/lib/constants'

// Extract valid values from constants
const validTaskTypes = ITEM_TYPES.map(type => type.id) as [string, ...string[]]
const validPriorities = PRIORITIES.map(priority => priority.id) as [string, ...string[]]

// Single task schema
export const AITaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(200, 'Task title too long'),
  description: z.string().optional().default(''),
  taskType: z.enum(validTaskTypes).default('story'),
  priority: z.enum(validPriorities).default('medium'),
  storyPoints: z.number().min(0).max(100).nullable().optional(),
  estimatedHours: z.number().min(0).max(1000).nullable().optional(),
  labels: z.array(z.string()).optional().default([]),
  suggestedAssignee: z.string().nullable().optional(),
  sprintRecommendation: z.enum(['backlog', 'sprint-1', 'sprint-2', 'current']).optional().default('backlog'),
  columnRecommendation: z.string().optional(), // For Kanban boards
  reasoning: z.string().optional(), // Why AI chose these values
  dependencies: z.array(z.string()).optional().default([]), // References to other generated tasks
  acceptanceCriteria: z.array(z.string()).optional().default([]),
})

// Multiple tasks generation schema
export const AITaskGenerationSchema = z.object({
  summary: z.string().min(1, 'Summary is required'),
  totalTasks: z.number().min(1).max(50),
  boardType: z.enum(['scrum', 'kanban']).optional(),
  tasks: z.array(AITaskSchema).min(1, 'At least one task must be generated').max(50, 'Too many tasks generated'),
  sprintPlan: z.object({
    sprintCount: z.number().min(1).max(10).optional(),
    sprintsNeeded: z.array(z.object({
      name: z.string(),
      taskCount: z.number(),
      reasoning: z.string()
    })).optional()
  }).optional(),
  projectInsights: z.object({
    estimatedDuration: z.string().optional(),
    complexity: z.enum(['simple', 'moderate', 'complex', 'very-complex']).optional(),
    teamSizeRecommendation: z.string().optional(),
    riskFactors: z.array(z.string()).optional().default([])
  }).optional()
})

// Input schema for validation
export const AITaskInputSchema = z.object({
  input: z.string().min(10, 'Please provide more detailed requirements').max(10000, 'Input too long'),
  images: z.array(z.object({
    data: z.string(), // base64 encoded image data
    mimeType: z.string(),
    name: z.string()
  })).optional().default([]),
  context: z.object({
    boardType: z.enum(['scrum', 'kanban']).optional(),
    boardId: z.string().uuid().optional(),
    columnId: z.string().uuid().optional(),
    sprintId: z.string().uuid().optional(),
    organizationId: z.string().uuid(),
    existingTasks: z.array(z.object({
      id: z.string(),
      title: z.string(),
      taskType: z.string()
    })).optional().default([]),
    teamMembers: z.array(z.object({
      id: z.string(),
      name: z.string(),
      skills: z.array(z.string()).optional().default([])
    })).optional().default([]),
    projectGoals: z.string().optional(),
    constraints: z.string().optional()
  }),
  options: z.object({
    maxTasks: z.number().min(1).max(50).default(10),
    includeSubtasks: z.boolean().default(false),
    detailLevel: z.enum(['basic', 'detailed', 'comprehensive']).default('detailed'),
    generateSprintPlan: z.boolean().default(false),
    suggestAssignees: z.boolean().default(true)
  }).optional().default({})
})

// Type exports for use in components
export type AITask = z.infer<typeof AITaskSchema>
export type AITaskGeneration = z.infer<typeof AITaskGenerationSchema>
export type AITaskInput = z.infer<typeof AITaskInputSchema>

// Validation helpers
export const validateTaskInput = (input: unknown): AITaskInput => {
  return AITaskInputSchema.parse(input)
}

export const validateTaskGeneration = (generation: unknown): AITaskGeneration => {
  return AITaskGenerationSchema.parse(generation)
}

// Default values for different use cases
export const createDefaultInput = (
  input: string,
  boardType: 'scrum' | 'kanban' = 'scrum',
  organizationId: string,
  context: Partial<AITaskInput['context']> = {}
): AITaskInput => ({
  input,
  context: {
    boardType,
    organizationId,
    existingTasks: [],
    teamMembers: [],
    ...context
  },
  options: {
    maxTasks: 10,
    includeSubtasks: false,
    detailLevel: 'detailed',
    generateSprintPlan: boardType === 'scrum',
    suggestAssignees: true
  }
})