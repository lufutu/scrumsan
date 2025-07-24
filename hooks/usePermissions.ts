'use client'

import { useMemo } from 'react'
import { useSupabase } from '@/providers/supabase-provider'
import { useOrganization } from '@/providers/organization-provider'
import { 
  hasPermission, 
  hasPermissionWithContext, 
  canPerformAction,
  type PermissionAction,
  type OrganizationMemberWithPermissions,
  type PermissionConfig
} from '@/lib/permission-utils'

interface UsePermissionsReturn {
  hasPermission: (permission: PermissionAction) => boolean
  canPerformAction: (
    action: 'view' | 'create' | 'update' | 'delete',
    resourceType: 'member' | 'project' | 'invoice' | 'client' | 'worklog',
    resourceContext?: { isAssigned?: boolean; isOwner?: boolean }
  ) => boolean
  isOwner: boolean
  isAdmin: boolean
  isMember: boolean
  isGuest: boolean
  currentMember: OrganizationMemberWithPermissions | null
  permissionSet: PermissionConfig | null
}

/**
 * Hook for checking user permissions in the current organization
 */
export function usePermissions(): UsePermissionsReturn {
  const { user } = useSupabase()
  const { activeOrg, currentMember } = useOrganization()

  const memberWithPermissions = useMemo((): OrganizationMemberWithPermissions | null => {
    if (!currentMember || !user || !activeOrg) return null

    return {
      id: currentMember.id,
      organizationId: activeOrg.id,
      userId: user.id,
      role: currentMember.role as 'owner' | 'admin' | 'member' | 'guest',
      permissionSetId: currentMember.permissionSetId || undefined,
      permissionSet: currentMember.permissionSet ? {
        id: currentMember.permissionSet.id,
        name: currentMember.permissionSet.name,
        permissions: currentMember.permissionSet.permissions as PermissionConfig,
      } : undefined,
    }
  }, [currentMember, user, activeOrg])

  const permissionChecker = useMemo(() => {
    if (!memberWithPermissions) {
      return {
        hasPermission: () => false,
        canPerformAction: () => false,
        isOwner: false,
        isAdmin: false,
        isMember: false,
        isGuest: false,
        currentMember: null,
        permissionSet: null,
      }
    }

    return {
      hasPermission: (permission: PermissionAction) => 
        hasPermissionWithContext(memberWithPermissions, permission),
      canPerformAction: (
        action: 'view' | 'create' | 'update' | 'delete',
        resourceType: 'member' | 'project' | 'invoice' | 'client' | 'worklog',
        resourceContext?: { isAssigned?: boolean; isOwner?: boolean }
      ) => canPerformAction(memberWithPermissions, action, resourceType, resourceContext),
      isOwner: memberWithPermissions.role === 'owner',
      isAdmin: memberWithPermissions.role === 'admin',
      isMember: memberWithPermissions.role === 'member',
      isGuest: memberWithPermissions.role === 'guest',
      currentMember: memberWithPermissions,
      permissionSet: memberWithPermissions.permissionSet?.permissions || null,
    }
  }, [memberWithPermissions])

  return permissionChecker
}

/**
 * Hook for checking permissions for a specific organization member
 */
export function usePermissionsForMember(member: OrganizationMemberWithPermissions | null): {
  hasPermission: (permission: PermissionAction) => boolean
  canPerformAction: (
    action: 'view' | 'create' | 'update' | 'delete',
    resourceType: 'member' | 'project' | 'invoice' | 'client' | 'worklog',
    resourceContext?: { isAssigned?: boolean; isOwner?: boolean }
  ) => boolean
  isOwner: boolean
  isAdmin: boolean
  isMember: boolean
  isGuest: boolean
} {
  return useMemo(() => {
    if (!member) {
      return {
        hasPermission: () => false,
        canPerformAction: () => false,
        isOwner: false,
        isAdmin: false,
        isMember: false,
        isGuest: false,
      }
    }

    return {
      hasPermission: (permission: PermissionAction) => 
        hasPermissionWithContext(member, permission),
      canPerformAction: (
        action: 'view' | 'create' | 'update' | 'delete',
        resourceType: 'member' | 'project' | 'invoice' | 'client' | 'worklog',
        resourceContext?: { isAssigned?: boolean; isOwner?: boolean }
      ) => canPerformAction(member, action, resourceType, resourceContext),
      isOwner: member.role === 'owner',
      isAdmin: member.role === 'admin',
      isMember: member.role === 'member',
      isGuest: member.role === 'guest',
    }
  }, [member])
}