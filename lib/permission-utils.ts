/**
 * @fileoverview Permission management utilities for team management system
 * 
 * This module provides comprehensive permission checking, validation, and management
 * utilities for the team management system. It handles role-based access control,
 * custom permission sets, audit logging, and security validation.
 * 
 * Key features:
 * - Role-based permission checking with custom permission sets
 * - Permission dependency validation
 * - Audit logging for sensitive operations
 * - Input sanitization and rate limiting
 * - Server-side permission validation middleware
 * 
 * @author Team Management System
 * @version 1.0.0
 */

import { z } from 'zod'
import { permissionConfigSchema } from './validation-schemas'

/** Type-safe permission configuration schema */
export type PermissionConfig = z.infer<typeof permissionConfigSchema>

/**
 * Enumeration of all possible permission actions in the system
 * Format: {category}.{action}{scope?}
 */
export type PermissionAction = 
  | 'teamMembers.viewAll'
  | 'teamMembers.manageAll'
  | 'projects.viewAll'
  | 'projects.manageAll'
  | 'projects.viewAssigned'
  | 'projects.manageAssigned'
  | 'invoicing.viewAll'
  | 'invoicing.manageAll'
  | 'invoicing.viewAssigned'
  | 'invoicing.manageAssigned'
  | 'clients.viewAll'
  | 'clients.manageAll'
  | 'clients.viewAssigned'
  | 'clients.manageAssigned'
  | 'worklogs.manageAll'

/**
 * Organization member with complete permission context
 * @interface OrganizationMemberWithPermissions
 */
export interface OrganizationMemberWithPermissions {
  /** Unique identifier for the organization membership */
  id: string
  /** ID of the organization */
  organizationId: string
  /** ID of the user */
  userId: string
  /** Base role in the organization */
  role: 'owner' | 'admin' | 'member' | 'guest'
  /** ID of assigned custom permission set (optional) */
  permissionSetId?: string
  /** Complete permission set data (optional) */
  permissionSet?: {
    id: string
    name: string
    permissions: PermissionConfig
  }
}

/**
 * Audit log entry for tracking sensitive operations
 * @interface AuditLogEntry
 */
export interface AuditLogEntry {
  /** Unique identifier for the audit log entry */
  id: string
  /** ID of the organization where the action occurred */
  organizationId: string
  /** ID of the user who performed the action */
  userId: string
  /** Description of the action performed */
  action: string
  /** Type of resource affected by the action */
  resourceType: string
  /** ID of the specific resource affected (optional) */
  resourceId?: string
  /** Additional details about the action (optional) */
  details?: Record<string, any>
  /** IP address of the user (optional) */
  ipAddress?: string
  /** User agent string (optional) */
  userAgent?: string
  /** Timestamp when the action occurred */
  timestamp: Date
}

/**
 * Validates permission dependencies and constraints
 * 
 * Ensures that permission configurations follow logical dependencies
 * (e.g., manage permissions require corresponding view permissions).
 * 
 * @param permissions - Permission configuration to validate
 * @returns Array of error messages if validation fails, empty array if valid
 * 
 * @example
 * ```typescript
 * const errors = validatePermissionDependencies({
 *   teamMembers: { viewAll: false, manageAll: true } // Invalid!
 * });
 * console.log(errors); // ["Team Members: 'Manage all members' requires 'View all members'"]
 * ```
 */
export function validatePermissionDependencies(permissions: PermissionConfig): string[] {
  const errors: string[] = []

  // Team Members: manage requires view
  if (permissions.teamMembers.manageAll && !permissions.teamMembers.viewAll) {
    errors.push('Team Members: "Manage all members" requires "View all members"')
  }

  // Projects: manage requires view
  if (permissions.projects.manageAll && !permissions.projects.viewAll) {
    errors.push('Projects: "Manage all projects" requires "View all projects"')
  }
  if (permissions.projects.manageAssigned && !permissions.projects.viewAssigned) {
    errors.push('Projects: "Manage assigned projects" requires "View assigned projects"')
  }

  // Invoicing: manage requires view
  if (permissions.invoicing.manageAll && !permissions.invoicing.viewAll) {
    errors.push('Invoicing: "Manage all invoicing" requires "View all invoicing"')
  }
  if (permissions.invoicing.manageAssigned && !permissions.invoicing.viewAssigned) {
    errors.push('Invoicing: "Manage assigned invoicing" requires "View assigned invoicing"')
  }

  // Clients: manage requires view
  if (permissions.clients.manageAll && !permissions.clients.viewAll) {
    errors.push('Clients: "Manage all clients" requires "View all clients"')
  }
  if (permissions.clients.manageAssigned && !permissions.clients.viewAssigned) {
    errors.push('Clients: "Manage assigned clients" requires "View assigned clients"')
  }

  return errors
}

/**
 * Checks if a user has a specific permission based on their role and permission set
 * 
 * This is the core permission checking function that evaluates whether a user
 * has access to perform a specific action based on their role and custom permissions.
 * 
 * @param userRole - The user's role in the organization
 * @param permissionSet - Custom permission set (null for default permissions)
 * @param permission - The specific permission action to check
 * @returns True if the user has the specified permission
 * 
 * @example
 * ```typescript
 * const canManageMembers = hasPermission(
 *   'admin',
 *   customPermissionSet,
 *   'teamMembers.manageAll'
 * );
 * ```
 */
export function hasPermission(
  userRole: string,
  permissionSet: PermissionConfig | null,
  permission: PermissionAction
): boolean {
  // Owners have all permissions
  if (userRole === 'owner') {
    return true
  }

  // Guests have very limited permissions
  if (userRole === 'guest') {
    return permission === 'projects.viewAssigned'
  }

  // If no permission set, use default member permissions
  if (!permissionSet) {
    // Default member permissions are very limited
    switch (permission) {
      case 'projects.viewAssigned':
        return true
      default:
        return false
    }
  }

  // Check specific permissions
  const [category, action] = permission.split('.') as [string, string]
  
  switch (category) {
    case 'teamMembers':
      if (action === 'viewAll') return permissionSet.teamMembers.viewAll
      if (action === 'manageAll') return permissionSet.teamMembers.manageAll
      break
    case 'projects':
      if (action === 'viewAll') return permissionSet.projects.viewAll
      if (action === 'manageAll') return permissionSet.projects.manageAll
      if (action === 'viewAssigned') return permissionSet.projects.viewAssigned
      if (action === 'manageAssigned') return permissionSet.projects.manageAssigned
      break
    case 'invoicing':
      if (action === 'viewAll') return permissionSet.invoicing.viewAll
      if (action === 'manageAll') return permissionSet.invoicing.manageAll
      if (action === 'viewAssigned') return permissionSet.invoicing.viewAssigned
      if (action === 'manageAssigned') return permissionSet.invoicing.manageAssigned
      break
    case 'clients':
      if (action === 'viewAll') return permissionSet.clients.viewAll
      if (action === 'manageAll') return permissionSet.clients.manageAll
      if (action === 'viewAssigned') return permissionSet.clients.viewAssigned
      if (action === 'manageAssigned') return permissionSet.clients.manageAssigned
      break
    case 'worklogs':
      if (action === 'manageAll') return permissionSet.worklogs.manageAll
      break
  }

  return false
}

/**
 * Enhanced permission checker with member context
 */
export function hasPermissionWithContext(
  member: OrganizationMemberWithPermissions,
  permission: PermissionAction
): boolean {
  return hasPermission(
    member.role,
    member.permissionSet?.permissions || null,
    permission
  )
}

/**
 * Check if user can perform action on specific resource
 */
export function canPerformAction(
  member: OrganizationMemberWithPermissions,
  action: 'view' | 'create' | 'update' | 'delete',
  resourceType: 'member' | 'project' | 'invoice' | 'client' | 'worklog',
  resourceContext?: { isAssigned?: boolean; isOwner?: boolean }
): boolean {
  // Owners can do everything
  if (member.role === 'owner') {
    return true
  }

  // Resource owners can manage their own resources
  if (resourceContext?.isOwner && (action === 'view' || action === 'update')) {
    return true
  }

  // Map resource types to permission categories
  const permissionMap: Record<string, string> = {
    member: 'teamMembers',
    project: 'projects',
    invoice: 'invoicing',
    client: 'clients',
    worklog: 'worklogs'
  }

  const category = permissionMap[resourceType]
  if (!category) return false

  // Determine permission level needed
  const isManageAction = action === 'create' || action === 'update' || action === 'delete'
  const scope = resourceContext?.isAssigned ? 'Assigned' : 'All'
  const level = isManageAction ? 'manage' : 'view'
  
  const permission = `${category}.${level}${scope}` as PermissionAction

  return hasPermissionWithContext(member, permission)
}

/**
 * Checks if a user has permission to perform an action in an organization
 */
export async function checkOrganizationPermission(
  userId: string,
  organizationId: string,
  category: string,
  action: string
): Promise<boolean> {
  const { prisma } = await import('./prisma')
  
  try {
    // Get user's organization membership
    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId,
        organizationId,
      },
      include: {
        permissionSet: true,
      },
    })

    if (!membership) {
      return false
    }

    // Check permission using existing hasPermission function
    const permission = `${category}.${action}`
    return hasPermission(
      membership.role,
      membership.permissionSet?.permissions as PermissionConfig | null,
      permission
    )
  } catch (error) {
    console.error('Error checking organization permission:', error)
    return false
  }
}

/**
 * Gets default permission sets for an organization
 */
export function getDefaultPermissionSets(): Array<{
  name: string
  permissions: PermissionConfig
  isDefault: boolean
}> {
  return [
    {
      name: 'Admin',
      isDefault: true,
      permissions: {
        teamMembers: {
          viewAll: true,
          manageAll: true,
        },
        projects: {
          viewAll: true,
          manageAll: true,
          viewAssigned: true,
          manageAssigned: true,
        },
        invoicing: {
          viewAll: true,
          manageAll: true,
          viewAssigned: true,
          manageAssigned: true,
        },
        clients: {
          viewAll: true,
          manageAll: true,
          viewAssigned: true,
          manageAssigned: true,
        },
        worklogs: {
          manageAll: true,
        },
      },
    },
    {
      name: 'Member',
      isDefault: true,
      permissions: {
        teamMembers: {
          viewAll: false,
          manageAll: false,
        },
        projects: {
          viewAll: false,
          manageAll: false,
          viewAssigned: true,
          manageAssigned: false,
        },
        invoicing: {
          viewAll: false,
          manageAll: false,
          viewAssigned: false,
          manageAssigned: false,
        },
        clients: {
          viewAll: false,
          manageAll: false,
          viewAssigned: false,
          manageAssigned: false,
        },
        worklogs: {
          manageAll: false,
        },
      },
    },
  ]
}/**
 * 
Server-side permission validation middleware
 */
export async function validatePermission(
  userId: string,
  organizationId: string,
  permission: PermissionAction,
  resourceContext?: { resourceId?: string; isAssigned?: boolean }
): Promise<{ hasPermission: boolean; member?: OrganizationMemberWithPermissions; error?: string }> {
  const { prisma } = await import('./prisma')
  
  try {
    // Get user's organization membership with permission set
    const member = await prisma.organizationMember.findFirst({
      where: {
        userId,
        organizationId,
      },
      include: {
        permissionSet: true,
      },
    })

    if (!member) {
      return { 
        hasPermission: false, 
        error: 'User is not a member of this organization' 
      }
    }

    // Check if user is assigned to resource if context provided
    let isAssigned = resourceContext?.isAssigned || false
    if (resourceContext?.resourceId && !isAssigned) {
      // Check assignment based on permission type
      const [category] = permission.split('.')
      if (category === 'projects') {
        const projectMember = await prisma.projectMember.findFirst({
          where: {
            projectId: resourceContext.resourceId,
            userId,
          },
        })
        isAssigned = !!projectMember
      }
    }

    const memberWithPermissions: OrganizationMemberWithPermissions = {
      id: member.id,
      organizationId: member.organizationId,
      userId: member.userId,
      role: member.role as 'owner' | 'admin' | 'member' | 'guest',
      permissionSetId: member.permissionSetId || undefined,
      permissionSet: member.permissionSet ? {
        id: member.permissionSet.id,
        name: member.permissionSet.name,
        permissions: member.permissionSet.permissions as PermissionConfig,
      } : undefined,
    }

    const hasPermissionResult = hasPermissionWithContext(memberWithPermissions, permission)

    return {
      hasPermission: hasPermissionResult,
      member: memberWithPermissions,
    }
  } catch (error) {
    console.error('Error validating permission:', error)
    return { 
      hasPermission: false, 
      error: 'Failed to validate permission' 
    }
  }
}

/**
 * Audit logging for sensitive operations
 */
export async function logAuditEvent(
  organizationId: string,
  userId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: Record<string, any>,
  request?: {
    ip?: string
    userAgent?: string
  }
): Promise<void> {
  const { prisma } = await import('./prisma')
  
  try {
    await prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action,
        resourceType,
        resourceId,
        details: details ? JSON.stringify(details) : null,
        ipAddress: request?.ip,
        userAgent: request?.userAgent,
        timestamp: new Date(),
      },
    })
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    console.error('Failed to log audit event:', error)
  }
}

/**
 * Get audit logs for an organization (admin only)
 */
export async function getAuditLogs(
  organizationId: string,
  userId: string,
  options?: {
    limit?: number
    offset?: number
    resourceType?: string
    action?: string
    startDate?: Date
    endDate?: Date
  }
): Promise<{ logs: AuditLogEntry[]; total: number; error?: string }> {
  const { prisma } = await import('./prisma')
  
  try {
    // Verify user has permission to view audit logs
    const { hasPermission } = await validatePermission(
      userId,
      organizationId,
      'teamMembers.manageAll'
    )

    if (!hasPermission) {
      return { 
        logs: [], 
        total: 0, 
        error: 'Insufficient permissions to view audit logs' 
      }
    }

    const where = {
      organizationId,
      ...(options?.resourceType && { resourceType: options.resourceType }),
      ...(options?.action && { action: options.action }),
      ...(options?.startDate && options?.endDate && {
        timestamp: {
          gte: options.startDate,
          lte: options.endDate,
        },
      }),
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ])

    const auditLogs: AuditLogEntry[] = logs.map(log => ({
      id: log.id,
      organizationId: log.organizationId,
      userId: log.userId,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId || undefined,
      details: log.details ? JSON.parse(log.details) : undefined,
      ipAddress: log.ipAddress || undefined,
      userAgent: log.userAgent || undefined,
      timestamp: log.timestamp,
    }))

    return { logs: auditLogs, total }
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return { 
      logs: [], 
      total: 0, 
      error: 'Failed to fetch audit logs' 
    }
  }
}

/**
 * Input sanitization utilities
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return ''
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 10000) // Limit length
}

export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = {} as T
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key as keyof T] = sanitizeInput(value) as T[keyof T]
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key as keyof T] = sanitizeObject(value) as T[keyof T]
    } else {
      sanitized[key as keyof T] = value
    }
  }
  
  return sanitized
}

/**
 * Rate limiting utilities
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const key = identifier
  
  const current = rateLimitMap.get(key)
  
  if (!current || now > current.resetTime) {
    // Reset or initialize
    const resetTime = now + windowMs
    rateLimitMap.set(key, { count: 1, resetTime })
    return { allowed: true, remaining: maxRequests - 1, resetTime }
  }
  
  if (current.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: current.resetTime }
  }
  
  current.count++
  rateLimitMap.set(key, current)
  
  return { 
    allowed: true, 
    remaining: maxRequests - current.count, 
    resetTime: current.resetTime 
  }
}