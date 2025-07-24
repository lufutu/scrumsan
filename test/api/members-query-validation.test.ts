import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Test the validation schema directly
const memberFilterSchema = z.object({
  roles: z.array(z.string()).optional(),
  projects: z.array(z.string()).optional(),
  minHours: z.coerce.number().int().min(0).max(168).optional(),
  maxHours: z.coerce.number().int().min(0).max(168).optional(),
  minAvailability: z.coerce.number().int().min(0).max(168).optional(),
  maxAvailability: z.coerce.number().int().min(0).max(168).optional(),
  permissions: z.array(z.string()).optional(),
  search: z.string().optional().or(z.literal('')),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z.enum(['name', 'role', 'joinDate', 'totalHours', 'availableHours']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  lightweight: z.coerce.boolean().default(false),
})

// Helper function to simulate query parameter parsing
function parseQueryParams(searchParams: URLSearchParams) {
  const rolesArray = searchParams.getAll('roles')
  const projectsArray = searchParams.getAll('projects')
  const permissionsArray = searchParams.getAll('permissions')
  
  const getParam = (key: string) => {
    const value = searchParams.get(key)
    return value === null || value === '' ? undefined : value
  }

  return {
    roles: rolesArray.length > 0 ? rolesArray : undefined,
    projects: projectsArray.length > 0 ? projectsArray : undefined,
    permissions: permissionsArray.length > 0 ? permissionsArray : undefined,
    minHours: getParam('minHours'),
    maxHours: getParam('maxHours'),
    minAvailability: getParam('minAvailability'),
    maxAvailability: getParam('maxAvailability'),
    search: getParam('search'),
    page: getParam('page'),
    limit: getParam('limit'),
    sortBy: getParam('sortBy'),
    sortOrder: getParam('sortOrder'),
    lightweight: getParam('lightweight'),
  }
}

describe('Members API Query Validation', () => {
  it('should handle empty query parameters', () => {
    const searchParams = new URLSearchParams()
    const queryObject = parseQueryParams(searchParams)
    
    const result = memberFilterSchema.safeParse(queryObject)
    
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(1)
      expect(result.data.limit).toBe(25)
      expect(result.data.sortBy).toBe('name')
      expect(result.data.sortOrder).toBe('asc')
      expect(result.data.lightweight).toBe(false)
    }
  })

  it('should handle null values from URLSearchParams.get()', () => {
    // Simulate what happens when URLSearchParams.get() returns null
    const queryObject = {
      roles: undefined,
      projects: undefined,
      permissions: undefined,
      minHours: undefined,
      maxHours: undefined,
      minAvailability: undefined,
      maxAvailability: undefined,
      search: undefined,
      page: undefined,
      limit: undefined,
      sortBy: undefined,
      sortOrder: undefined,
      lightweight: undefined,
    }
    
    const result = memberFilterSchema.safeParse(queryObject)
    
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(1)
      expect(result.data.limit).toBe(25)
      expect(result.data.sortBy).toBe('name')
      expect(result.data.sortOrder).toBe('asc')
    }
  })

  it('should handle valid query parameters', () => {
    const searchParams = new URLSearchParams({
      search: 'john',
      page: '2',
      limit: '10',
      sortBy: 'role',
      sortOrder: 'desc',
      minHours: '20',
      maxHours: '40',
    })
    
    const queryObject = parseQueryParams(searchParams)
    const result = memberFilterSchema.safeParse(queryObject)
    
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.search).toBe('john')
      expect(result.data.page).toBe(2)
      expect(result.data.limit).toBe(10)
      expect(result.data.sortBy).toBe('role')
      expect(result.data.sortOrder).toBe('desc')
      expect(result.data.minHours).toBe(20)
      expect(result.data.maxHours).toBe(40)
    }
  })

  it('should handle empty string search parameter', () => {
    const searchParams = new URLSearchParams({
      search: '',
    })
    
    const queryObject = parseQueryParams(searchParams)
    const result = memberFilterSchema.safeParse(queryObject)
    
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.search).toBeUndefined()
    }
  })

  it('should handle array parameters', () => {
    const searchParams = new URLSearchParams()
    searchParams.append('roles', 'admin')
    searchParams.append('roles', 'member')
    searchParams.append('projects', 'project-1')
    searchParams.append('projects', 'project-2')
    
    const queryObject = parseQueryParams(searchParams)
    const result = memberFilterSchema.safeParse(queryObject)
    
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.roles).toEqual(['admin', 'member'])
      expect(result.data.projects).toEqual(['project-1', 'project-2'])
    }
  })

  it('should validate numeric constraints', () => {
    const searchParams = new URLSearchParams({
      page: '0', // Invalid: less than 1
      limit: '200', // Invalid: greater than 100
      minHours: '-5', // Invalid: less than 0
      maxHours: '200', // Invalid: greater than 168
    })
    
    const queryObject = parseQueryParams(searchParams)
    const result = memberFilterSchema.safeParse(queryObject)
    
    expect(result.success).toBe(false)
    if (!result.success) {
      const errors = result.error.errors
      expect(errors.some(e => e.path.includes('page'))).toBe(true)
      expect(errors.some(e => e.path.includes('limit'))).toBe(true)
      expect(errors.some(e => e.path.includes('minHours'))).toBe(true)
      expect(errors.some(e => e.path.includes('maxHours'))).toBe(true)
    }
  })

  it('should validate enum constraints', () => {
    const searchParams = new URLSearchParams({
      sortBy: 'invalid-sort',
      sortOrder: 'invalid-order',
    })
    
    const queryObject = parseQueryParams(searchParams)
    const result = memberFilterSchema.safeParse(queryObject)
    
    expect(result.success).toBe(false)
    if (!result.success) {
      const errors = result.error.errors
      expect(errors.some(e => e.path.includes('sortBy'))).toBe(true)
      expect(errors.some(e => e.path.includes('sortOrder'))).toBe(true)
    }
  })
})