import { z } from 'zod'

/**
 * Common validation patterns for reuse across API routes
 */

// Common field validations
export const commonFields = {
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  uuid: z.string().uuid('Invalid ID format'),
  email: z.string().email('Invalid email format'),
  url: z.string().url('Invalid URL format').optional(),
  status: z.enum(['active', 'completed', 'on_hold', 'cancelled', 'planning']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
} as const

// Task-specific validations
export const taskFields = {
  taskType: z.enum(['story', 'bug', 'task', 'epic', 'improvement', 'note', 'idea']),
  storyPoints: z.number().int().min(0).max(100).optional(),
  effortUnits: z.number().int().min(0).max(1000).optional(),
  estimationType: z.enum(['story_points', 'effort_units']),
  itemValue: z.enum(['xs', 's', 'm', 'l', 'xl', 'xxl']).optional(),
  estimatedHours: z.number().int().min(0).max(1000).optional(),
  loggedHours: z.number().int().min(0).max(1000).optional(),
  position: z.number().int().min(0).optional(),
} as const

// Junction table patterns
export const junctionFields = {
  assignees: z.array(z.object({ 
    id: commonFields.uuid 
  })).optional(),
  reviewers: z.array(z.object({ 
    id: commonFields.uuid 
  })).optional(),
  labels: z.array(commonFields.uuid).optional(),
  customFieldValues: z.array(z.object({
    customFieldId: commonFields.uuid,
    value: z.string()
  })).optional(),
} as const

// Date validations
export const dateFields = {
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  dateLogged: z.string().datetime(),
} as const

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

/**
 * Helper to create update schemas where all fields are optional
 */
export function createUpdateSchema<T extends z.ZodRawShape>(fields: T) {
  const optionalFields = Object.fromEntries(
    Object.entries(fields).map(([key, schema]) => [
      key, 
      schema instanceof z.ZodOptional ? schema : schema.optional()
    ])
  )
  return z.object(optionalFields)
}

/**
 * Common task creation schema
 */
export const taskCreateSchema = z.object({
  ...taskFields,
  title: commonFields.title,
  description: commonFields.description,
  priority: taskFields.priority.optional(),
  boardId: commonFields.uuid,
  columnId: commonFields.uuid.optional().nullable(),
  sprintId: commonFields.uuid.optional(),
  sprintColumnId: commonFields.uuid.optional(),
  epicId: commonFields.uuid.optional(),
  parentId: commonFields.uuid.optional(),
  dueDate: dateFields.dueDate,
  ...junctionFields,
})

/**
 * Task update schema
 */
export const taskUpdateSchema = createUpdateSchema(taskCreateSchema.shape)

/**
 * Board creation schema
 */
export const boardCreateSchema = z.object({
  name: commonFields.name,
  description: commonFields.description,
  organizationId: commonFields.uuid,
  projectId: commonFields.uuid.optional(),
  color: commonFields.color,
  isPrivate: z.boolean().default(false),
})

/**
 * Board update schema
 */
export const boardUpdateSchema = createUpdateSchema({
  ...boardCreateSchema.shape,
  boardType: z.enum(['kanban', 'scrum']).optional(),
})

/**
 * Project creation schema
 */
export const projectCreateSchema = z.object({
  name: commonFields.name,
  description: commonFields.description,
  organizationId: commonFields.uuid,
  status: commonFields.status.default('active'),
  startDate: dateFields.startDate,
  endDate: dateFields.endDate,
})

/**
 * Project update schema
 */
export const projectUpdateSchema = createUpdateSchema(projectCreateSchema.shape)

/**
 * Sprint creation schema
 */
export const sprintCreateSchema = z.object({
  name: commonFields.name,
  goal: commonFields.description,
  boardId: commonFields.uuid,
  status: z.enum(['planning', 'active', 'completed']).default('planning'),
  startDate: dateFields.startDate,
  endDate: dateFields.endDate,
  position: taskFields.position,
})

/**
 * Sprint update schema
 */
export const sprintUpdateSchema = createUpdateSchema(sprintCreateSchema.shape)

/**
 * Label creation schema
 */
export const labelCreateSchema = z.object({
  name: commonFields.name,
  description: commonFields.description,
  color: commonFields.color.default('#3B82F6'),
  boardId: commonFields.uuid,
})

/**
 * Label update schema
 */
export const labelUpdateSchema = createUpdateSchema(labelCreateSchema.shape)

/**
 * Comment creation schema
 */
export const commentCreateSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(2000, 'Comment too long'),
  taskId: commonFields.uuid,
})

/**
 * Comment update schema
 */
export const commentUpdateSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(2000, 'Comment too long'),
})

/**
 * Task relation creation schema
 */
export const taskRelationCreateSchema = z.object({
  sourceTaskId: commonFields.uuid,
  targetTaskId: commonFields.uuid,
  relationType: z.enum(['blocks', 'duplicates', 'relates_to']),
})

/**
 * Worklog entry creation schema
 */
export const worklogCreateSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  hoursLogged: z.number().min(0.1).max(24, 'Hours must be between 0.1 and 24'),
  dateLogged: dateFields.dateLogged,
  startDate: dateFields.dateLogged,
  taskId: commonFields.uuid,
})

/**
 * Organization creation schema
 */
export const organizationCreateSchema = z.object({
  name: commonFields.name,
  description: commonFields.description,
  website: commonFields.url,
})

/**
 * Organization update schema
 */
export const organizationUpdateSchema = createUpdateSchema(organizationCreateSchema.shape)

/**
 * Helper to validate UUID parameters
 */
export function validateUUID(id: string, fieldName = 'ID'): { valid: boolean; error?: string } {
  try {
    commonFields.uuid.parse(id)
    return { valid: true }
  } catch {
    return { valid: false, error: `Invalid ${fieldName} format` }
  }
}

/**
 * Helper to validate and parse query parameters
 */
export function parseQueryParams<T extends z.ZodRawShape>(
  searchParams: URLSearchParams, 
  schema: z.ZodObject<T>
) {
  const params = Object.fromEntries(searchParams.entries())
  return schema.safeParse(params)
}