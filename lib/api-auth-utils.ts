import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { 
  validatePermission, 
  logAuditEvent, 
  sanitizeObject, 
  checkRateLimit,
  type PermissionAction 
} from '@/lib/permission-utils'

export interface AuthUser {
  id: string
  email?: string
  fullName?: string
}

export interface AuthContext {
  user: AuthUser
  organizationId: string
  member?: {
    id: string
    role: 'owner' | 'admin' | 'member' | 'guest'
    permissionSetId?: string
  }
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
export async function authenticateUser(organizationId?: string): Promise<{ 
  user: AuthUser; 
  member?: { id: string; role: string; permissionSetId?: string }; 
  error?: NextResponse 
}> {
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

      return { 
        user, 
        member: {
          id: orgMember.id,
          role: orgMember.role,
          permissionSetId: orgMember.permissionSetId || undefined,
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

/**
 * Middleware for permission validation
 */
export function withPermission(
  permission: PermissionAction,
  resourceContext?: { resourceIdParam?: string; checkAssignment?: boolean }
) {
  return function <TParams = any>(
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
        // Get client IP and user agent for audit logging
        const clientIp = req.headers.get('x-forwarded-for') || 
                        req.headers.get('x-real-ip') || 
                        'unknown'
        const userAgent = req.headers.get('user-agent') || 'unknown'

        // Rate limiting check
        const rateLimitKey = `${clientIp}:${req.method}:${req.nextUrl.pathname}`
        const rateLimit = checkRateLimit(rateLimitKey, 100, 60000) // 100 requests per minute
        
        if (!rateLimit.allowed) {
          return createErrorResponse('Rate limit exceeded', 429, {
            resetTime: rateLimit.resetTime,
            remaining: rateLimit.remaining
          })
        }

        // Extract organization ID from URL or params
        const params = await context.params
        const organizationId = (params as any).id || 
                              (params as any).organizationId ||
                              req.nextUrl.searchParams.get('organizationId')

        if (!organizationId) {
          return createErrorResponse('Organization ID required', 400)
        }

        // Authenticate user
        const { user, member, error } = await authenticateUser(organizationId)
        if (error) return error

        // Get resource ID if specified
        let resourceId: string | undefined
        if (resourceContext?.resourceIdParam) {
          resourceId = (params as any)[resourceContext.resourceIdParam]
        }

        // Validate permission
        const permissionResult = await validatePermission(
          user.id,
          organizationId,
          permission,
          { 
            resourceId,
            isAssigned: resourceContext?.checkAssignment 
          }
        )

        if (!permissionResult.hasPermission) {
          // Log unauthorized access attempt
          await logAuditEvent(
            organizationId,
            user.id,
            'unauthorized_access_attempt',
            'permission',
            undefined,
            { 
              permission, 
              resourceId,
              error: permissionResult.error 
            },
            { ip: clientIp, userAgent }
          )

          return createErrorResponse(
            permissionResult.error || 'Insufficient permissions',
            403
          )
        }

        const authContext: AuthContext = {
          user,
          organizationId,
          member: permissionResult.member ? {
            id: permissionResult.member.id,
            role: permissionResult.member.role,
            permissionSetId: permissionResult.member.permissionSetId,
          } : member,
        }

        return await handler(req, context, authContext)
      } catch (error) {
        return handleApiError(error, 'validate permission')
      }
    }
  }
}

/**
 * Middleware for audit logging
 */
export function withAuditLog(
  action: string,
  resourceType: string,
  options?: {
    resourceIdParam?: string
    logRequest?: boolean
    logResponse?: boolean
  }
) {
  return function <TParams = any>(
    handler: (
      req: NextRequest,
      context: { params: Promise<TParams> },
      authContext: AuthContext
    ) => Promise<NextResponse>
  ) {
    return async (
      req: NextRequest,
      context: { params: Promise<TParams> },
      authContext: AuthContext
    ): Promise<NextResponse> => {
      const startTime = Date.now()
      const clientIp = req.headers.get('x-forwarded-for') || 
                      req.headers.get('x-real-ip') || 
                      'unknown'
      const userAgent = req.headers.get('user-agent') || 'unknown'

      try {
        // Get resource ID if specified
        let resourceId: string | undefined
        if (options?.resourceIdParam) {
          const params = await context.params
          resourceId = (params as any)[options.resourceIdParam]
        }

        // Log request if enabled
        let requestDetails: any = {}
        if (options?.logRequest) {
          try {
            const body = await req.clone().json()
            requestDetails.request = sanitizeObject(body)
          } catch {
            // Request might not have JSON body
          }
        }

        // Execute handler
        const response = await handler(req, context, authContext)

        // Log response if enabled
        let responseDetails: any = {}
        if (options?.logResponse && response.status < 400) {
          try {
            const responseBody = await response.clone().json()
            responseDetails.response = sanitizeObject(responseBody)
          } catch {
            // Response might not have JSON body
          }
        }

        // Log successful operation
        await logAuditEvent(
          authContext.organizationId,
          authContext.user.id,
          action,
          resourceType,
          resourceId,
          {
            ...requestDetails,
            ...responseDetails,
            duration: Date.now() - startTime,
            status: response.status,
            method: req.method,
            path: req.nextUrl.pathname,
          },
          { ip: clientIp, userAgent }
        )

        return response
      } catch (error) {
        // Log failed operation
        await logAuditEvent(
          authContext.organizationId,
          authContext.user.id,
          `${action}_failed`,
          resourceType,
          undefined,
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: Date.now() - startTime,
            method: req.method,
            path: req.nextUrl.pathname,
          },
          { ip: clientIp, userAgent }
        )

        throw error
      }
    }
  }
}

/**
 * Combined middleware for authentication, permission validation, and audit logging
 */
export function withSecureAuth(
  permission: PermissionAction,
  auditConfig: {
    action: string
    resourceType: string
    resourceIdParam?: string
    logRequest?: boolean
    logResponse?: boolean
  }
) {
  return function <TParams = any>(
    handler: (
      req: NextRequest,
      context: { params: Promise<TParams> },
      authContext: AuthContext
    ) => Promise<NextResponse>
  ) {
    return withPermission(permission, { 
      resourceIdParam: auditConfig.resourceIdParam 
    })(
      withAuditLog(auditConfig.action, auditConfig.resourceType, {
        resourceIdParam: auditConfig.resourceIdParam,
        logRequest: auditConfig.logRequest,
        logResponse: auditConfig.logResponse,
      })(handler)
    )
  }
}

/**
 * Enhanced request body validation with sanitization
 */
export async function validateAndSanitizeRequestBody<T>(
  req: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ data?: T; error?: NextResponse }> {
  try {
    const body = await req.json()
    
    // Sanitize input
    const sanitizedBody = sanitizeObject(body)
    
    // Validate with schema
    const data = schema.parse(sanitizedBody)
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