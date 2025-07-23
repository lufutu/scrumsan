import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export interface AuthUser {
  id: string
  email?: string
  fullName?: string
}

export interface AuthContext {
  user: AuthUser
  organizationId: string
}

/**
 * Standard error response for API routes
 */
export function createErrorResponse(message: string, status: number, details?: any) {
  const response: any = { error: message }
  if (details) response.details = details
  return NextResponse.json(response, { status })
}

/**
 * Handle common API errors with standardized responses
 */
export function handleApiError(error: unknown, operation: string) {
  console.error(`Error ${operation}:`, error)
  
  if (error instanceof z.ZodError) {
    return createErrorResponse('Validation error', 400, error.errors)
  }
  
  const message = error instanceof Error ? error.message : `Failed to ${operation}`
  return createErrorResponse(message, 500)
}

/**
 * Verify user authentication and organization membership
 */
export async function authenticateUser(organizationId?: string): Promise<{ user: AuthUser; error?: NextResponse }> {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    
    if (!user) {
      return { 
        user: null as any, 
        error: createErrorResponse('Unauthorized', 401) 
      }
    }

    // If organizationId is provided, verify membership
    if (organizationId) {
      const orgMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId,
          userId: user.id
        }
      })
      
      if (!orgMember) {
        return { 
          user, 
          error: createErrorResponse('Unauthorized - not a member of this organization', 403) 
        }
      }
    }

    return { user }
  } catch (error) {
    return { 
      user: null as any, 
      error: handleApiError(error, 'authenticate user') 
    }
  }
}

/**
 * Get organization ID from board, project, or sprint
 */
export async function getOrganizationIdFromResource(
  resourceType: 'board' | 'project' | 'sprint',
  resourceId: string
): Promise<{ organizationId?: string; error?: NextResponse }> {
  try {
    let resource: any = null
    
    switch (resourceType) {
      case 'board':
        resource = await prisma.board.findUnique({
          where: { id: resourceId },
          select: { organizationId: true }
        })
        break
      case 'project':
        resource = await prisma.project.findUnique({
          where: { id: resourceId },
          select: { organizationId: true }
        })
        break
      case 'sprint':
        resource = await prisma.sprint.findUnique({
          where: { id: resourceId },
          select: { 
            board: { 
              select: { organizationId: true } 
            } 
          }
        })
        if (resource) {
          return { organizationId: resource.board.organizationId }
        }
        break
    }
    
    if (!resource) {
      return { 
        error: createErrorResponse(`${resourceType} not found`, 404) 
      }
    }
    
    return { organizationId: resource.organizationId }
  } catch (error) {
    return { 
      error: handleApiError(error, `get ${resourceType} organization`) 
    }
  }
}

/**
 * Higher-order function to wrap API routes with authentication
 */
export function withAuth<TParams = any>(
  handler: (
    req: NextRequest,
    context: { params: Promise<TParams> },
    authContext: AuthContext
  ) => Promise<NextResponse>
) {
  return async (
    req: NextRequest,
    context: { params: Promise<TParams> }
  ): Promise<NextResponse> => {
    try {
      // For routes that need organization context, we'll determine it from the resource
      const { user, error } = await authenticateUser()
      
      if (error) {
        return error
      }

      // Extract organization context if possible from common route patterns
      let organizationId: string | undefined
      
      // Get resource ID from params to determine organization
      const params = await context.params
      const resourceId = (params as any).id || (params as any).boardId || (params as any).projectId
      
      if (resourceId) {
        // Try to determine resource type from URL path
        const url = new URL(req.url)
        if (url.pathname.includes('/boards/')) {
          const { organizationId: orgId, error: orgError } = await getOrganizationIdFromResource('board', resourceId)
          if (orgError) return orgError
          organizationId = orgId
        } else if (url.pathname.includes('/projects/')) {
          const { organizationId: orgId, error: orgError } = await getOrganizationIdFromResource('project', resourceId)
          if (orgError) return orgError
          organizationId = orgId
        } else if (url.pathname.includes('/sprints/')) {
          const { organizationId: orgId, error: orgError } = await getOrganizationIdFromResource('sprint', resourceId)
          if (orgError) return orgError
          organizationId = orgId
        }
      }

      // Verify organization membership if we have an organization context
      if (organizationId) {
        const { error: authError } = await authenticateUser(organizationId)
        if (authError) return authError
      }

      const authContext: AuthContext = {
        user,
        organizationId: organizationId || ''
      }

      return await handler(req, context, authContext)
    } catch (error) {
      return handleApiError(error, 'process request')
    }
  }
}

/**
 * Validate request body with Zod schema
 */
export async function validateRequestBody<T>(
  req: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ data?: T; error?: NextResponse }> {
  try {
    const body = await req.json()
    const data = schema.parse(body)
    return { data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        error: createErrorResponse('Validation error', 400, error.errors) 
      }
    }
    return { 
      error: createErrorResponse('Invalid request body', 400) 
    }
  }
}