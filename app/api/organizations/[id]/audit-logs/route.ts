import { NextRequest } from 'next/server'
import { withSecureAuth, createErrorResponse } from '@/lib/api-auth-utils'
import { getAuditLogs } from '@/lib/permission-utils'
import { z } from 'zod'

// Query parameters schema
const auditLogsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  resourceType: z.string().optional(),
  action: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

/**
 * GET /api/organizations/[id]/audit-logs
 * Retrieve audit logs for an organization (admin only)
 */
export const GET = withSecureAuth(
  'teamMembers.manageAll',
  {
    action: 'view_audit_logs',
    resourceType: 'audit_log',
    logRequest: false,
    logResponse: false, // Don't log audit log responses to avoid recursion
  }
)(async (req: NextRequest, { params }, authContext) => {
  try {
    const { id: organizationId } = await params
    const searchParams = req.nextUrl.searchParams
    
    // Validate query parameters
    const queryResult = auditLogsQuerySchema.safeParse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      resourceType: searchParams.get('resourceType'),
      action: searchParams.get('action'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    })

    if (!queryResult.success) {
      return createErrorResponse('Invalid query parameters', 400, queryResult.error.errors)
    }

    const { limit, offset, resourceType, action, startDate, endDate } = queryResult.data

    // Get audit logs
    const { logs, total, error } = await getAuditLogs(
      organizationId,
      authContext.user.id,
      {
        limit,
        offset,
        resourceType,
        action,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      }
    )

    if (error) {
      return createErrorResponse(error, 403)
    }

    return Response.json({
      logs,
      total,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return createErrorResponse('Failed to fetch audit logs', 500)
  }
})