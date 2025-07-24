'use client'

import React from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { type PermissionAction } from '@/lib/permission-utils'

interface PermissionGuardProps {
  permission?: PermissionAction
  action?: 'view' | 'create' | 'update' | 'delete'
  resourceType?: 'member' | 'project' | 'invoice' | 'client' | 'worklog'
  resourceContext?: { isAssigned?: boolean; isOwner?: boolean }
  role?: 'owner' | 'admin' | 'member' | 'guest' | Array<'owner' | 'admin' | 'member' | 'guest'>
  fallback?: React.ReactNode
  children: React.ReactNode
}

/**
 * Component that conditionally renders children based on user permissions
 */
export function PermissionGuard({
  permission,
  action,
  resourceType,
  resourceContext,
  role,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { hasPermission, canPerformAction, currentMember } = usePermissions()

  // Check role-based access
  if (role) {
    const allowedRoles = Array.isArray(role) ? role : [role]
    if (!currentMember || !allowedRoles.includes(currentMember.role)) {
      return <>{fallback}</>
    }
  }

  // Check permission-based access
  if (permission) {
    if (!hasPermission(permission)) {
      return <>{fallback}</>
    }
  }

  // Check action-based access
  if (action && resourceType) {
    if (!canPerformAction(action, resourceType, resourceContext)) {
      return <>{fallback}</>
    }
  }

  return <>{children}</>
}

/**
 * Higher-order component for permission-based rendering
 */
export function withPermissions<P extends object>(
  Component: React.ComponentType<P>,
  permissionConfig: {
    permission?: PermissionAction
    action?: 'view' | 'create' | 'update' | 'delete'
    resourceType?: 'member' | 'project' | 'invoice' | 'client' | 'worklog'
    resourceContext?: { isAssigned?: boolean; isOwner?: boolean }
    role?: 'owner' | 'admin' | 'member' | 'guest' | Array<'owner' | 'admin' | 'member' | 'guest'>
    fallback?: React.ReactNode
  }
) {
  return function PermissionWrappedComponent(props: P) {
    return (
      <PermissionGuard {...permissionConfig}>
        <Component {...props} />
      </PermissionGuard>
    )
  }
}

/**
 * Hook for conditional rendering based on permissions
 */
export function usePermissionGuard() {
  const permissions = usePermissions()

  return {
    ...permissions,
    renderIf: (
      condition: {
        permission?: PermissionAction
        action?: 'view' | 'create' | 'update' | 'delete'
        resourceType?: 'member' | 'project' | 'invoice' | 'client' | 'worklog'
        resourceContext?: { isAssigned?: boolean; isOwner?: boolean }
        role?: 'owner' | 'admin' | 'member' | 'guest' | Array<'owner' | 'admin' | 'member' | 'guest'>
      },
      component: React.ReactNode,
      fallback: React.ReactNode = null
    ) => {
      // Check role-based access
      if (condition.role) {
        const allowedRoles = Array.isArray(condition.role) ? condition.role : [condition.role]
        if (!permissions.currentMember || !allowedRoles.includes(permissions.currentMember.role)) {
          return fallback
        }
      }

      // Check permission-based access
      if (condition.permission) {
        if (!permissions.hasPermission(condition.permission)) {
          return fallback
        }
      }

      // Check action-based access
      if (condition.action && condition.resourceType) {
        if (!permissions.canPerformAction(condition.action, condition.resourceType, condition.resourceContext)) {
          return fallback
        }
      }

      return component
    }
  }
}