/**
 * @fileoverview React hooks for permission set management
 * 
 * This module provides React hooks for managing custom permission sets within
 * organizations, including CRUD operations, validation, and default configurations.
 * 
 * Key features:
 * - Permission set CRUD operations with validation
 * - Permission dependency checking
 * - Default permission configurations
 * - Comprehensive error handling and loading states
 * 
 * @author Team Management System
 * @version 1.0.0
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { toast } from 'sonner'
import { cacheKeys } from '@/lib/query-optimization'

/**
 * Generic fetcher function for API requests
 * @param url - API endpoint URL
 * @returns Promise resolving to JSON response
 * @throws Error if request fails
 */
const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
})

/**
 * Permission configuration structure for granular access control
 * @interface PermissionConfig
 */
export interface PermissionConfig {
  /** Team member management permissions */
  teamMembers: {
    /** Can view all team members */
    viewAll: boolean
    /** Can manage all team members */
    manageAll: boolean
  }
  /** Project management permissions */
  projects: {
    /** Can view all projects */
    viewAll: boolean
    /** Can manage all projects */
    manageAll: boolean
    /** Can view assigned projects */
    viewAssigned: boolean
    /** Can manage assigned projects */
    manageAssigned: boolean
  }
  /** Invoicing permissions */
  invoicing: {
    /** Can view all invoicing data */
    viewAll: boolean
    /** Can manage all invoicing data */
    manageAll: boolean
    /** Can view assigned invoicing data */
    viewAssigned: boolean
    /** Can manage assigned invoicing data */
    manageAssigned: boolean
  }
  /** Client management permissions */
  clients: {
    /** Can view all clients */
    viewAll: boolean
    /** Can manage all clients */
    manageAll: boolean
    /** Can view assigned clients */
    viewAssigned: boolean
    /** Can manage assigned clients */
    manageAssigned: boolean
  }
  /** Worklog management permissions */
  worklogs: {
    /** Can manage all worklogs */
    manageAll: boolean
  }
}

/**
 * Complete permission set data structure
 * @interface PermissionSet
 */
export interface PermissionSet {
  /** Unique identifier for the permission set */
  id: string
  /** ID of the organization this permission set belongs to */
  organizationId: string
  /** Display name of the permission set */
  name: string
  /** Detailed permission configuration */
  permissions: PermissionConfig
  /** Whether this is a default system permission set */
  isDefault: boolean
  /** Timestamp when the permission set was created */
  createdAt: string
  /** Timestamp when the permission set was last updated */
  updatedAt: string
  /** Count of members assigned to this permission set */
  _count?: {
    members: number
  }
}

/**
 * Hook for managing organization permission sets
 * 
 * Provides comprehensive permission set management including CRUD operations,
 * validation, and default configurations for granular access control.
 * 
 * @param organizationId - ID of the organization to manage permission sets for
 * @returns Object containing permission sets, operations, and loading states
 * 
 * @example
 * ```typescript
 * const {
 *   permissionSets,
 *   createPermissionSet,
 *   updatePermissionSet,
 *   deletePermissionSet,
 *   validatePermissions
 * } = usePermissionSets('org-123');
 * ```
 */
export function usePermissionSets(organizationId: string) {
  const queryClient = useQueryClient()

  const { data, error, isLoading, refetch } = useQuery<PermissionSet[]>({
    queryKey: cacheKeys.permissionSets(organizationId),
    queryFn: () => {
      if (!organizationId) throw new Error('Organization ID is required')
      return fetcher(`/api/organizations/${organizationId}/permission-sets`)
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes for permission sets
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
  })

  const createPermissionSetMutation = useMutation({
    mutationFn: async (permissionSetData: {
      name: string
      permissions: PermissionConfig
    }) => {
      if (!organizationId) throw new Error('Organization ID is required')

      const response = await fetch(`/api/organizations/${organizationId}/permission-sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(permissionSetData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create permission set')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cacheKeys.permissionSets(organizationId) })
      queryClient.invalidateQueries({ queryKey: cacheKeys.teamMembers(organizationId) })
      toast.success('Permission set created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const createPermissionSet = useCallback((permissionSetData: {
    name: string
    permissions: PermissionConfig
  }) => {
    return createPermissionSetMutation.mutateAsync(permissionSetData)
  }, [createPermissionSetMutation])

  const updatePermissionSetMutation = useMutation({
    mutationFn: async ({ setId, permissionSetData }: {
      setId: string
      permissionSetData: {
        name?: string
        permissions?: PermissionConfig
      }
    }) => {
      if (!organizationId) throw new Error('Organization ID is required')

      const response = await fetch(`/api/organizations/${organizationId}/permission-sets/${setId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(permissionSetData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update permission set')
      }

      return response.json()
    },
    onSuccess: (updatedSet, { setId }) => {
      queryClient.invalidateQueries({ queryKey: cacheKeys.permissionSets(organizationId) })
      queryClient.invalidateQueries({ queryKey: cacheKeys.teamMembers(organizationId) })
      
      // Update cache directly
      queryClient.setQueryData(cacheKeys.permissionSets(organizationId), (oldData: PermissionSet[] | undefined) => {
        return oldData?.map(set => set.id === setId ? { ...set, ...updatedSet } : set)
      })
      
      toast.success('Permission set updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const updatePermissionSet = useCallback((setId: string, permissionSetData: {
    name?: string
    permissions?: PermissionConfig
  }) => {
    return updatePermissionSetMutation.mutateAsync({ setId, permissionSetData })
  }, [updatePermissionSetMutation])

  const deletePermissionSetMutation = useMutation({
    mutationFn: async ({ setId, reassignToSetId }: {
      setId: string
      reassignToSetId?: string
    }) => {
      if (!organizationId) throw new Error('Organization ID is required')

      const response = await fetch(`/api/organizations/${organizationId}/permission-sets/${setId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reassignToSetId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete permission set')
      }

      return response.json()
    },
    onSuccess: (_, { setId }) => {
      queryClient.invalidateQueries({ queryKey: cacheKeys.permissionSets(organizationId) })
      queryClient.invalidateQueries({ queryKey: cacheKeys.teamMembers(organizationId) })
      
      // Remove from cache directly
      queryClient.setQueryData(cacheKeys.permissionSets(organizationId), (oldData: PermissionSet[] | undefined) => {
        return oldData?.filter(set => set.id !== setId)
      })
      
      toast.success('Permission set deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const deletePermissionSet = useCallback((setId: string, reassignToSetId?: string) => {
    return deletePermissionSetMutation.mutateAsync({ setId, reassignToSetId })
  }, [deletePermissionSetMutation])

  /**
   * Validate permission configuration for logical dependencies
   * 
   * Ensures that permission configurations follow logical rules,
   * such as manage permissions requiring corresponding view permissions.
   * 
   * @param permissions - Permission configuration to validate
   * @returns Array of error messages, empty if valid
   */
  const validatePermissions = useCallback((permissions: PermissionConfig): string[] => {
    const errors: string[] = []

    // Check permission dependencies
    if (permissions.teamMembers.manageAll && !permissions.teamMembers.viewAll) {
      errors.push('Manage all team members requires view all team members permission')
    }

    if (permissions.projects.manageAll && !permissions.projects.viewAll) {
      errors.push('Manage all projects requires view all projects permission')
    }

    if (permissions.projects.manageAssigned && !permissions.projects.viewAssigned) {
      errors.push('Manage assigned projects requires view assigned projects permission')
    }

    if (permissions.invoicing.manageAll && !permissions.invoicing.viewAll) {
      errors.push('Manage all invoicing requires view all invoicing permission')
    }

    if (permissions.invoicing.manageAssigned && !permissions.invoicing.viewAssigned) {
      errors.push('Manage assigned invoicing requires view assigned invoicing permission')
    }

    if (permissions.clients.manageAll && !permissions.clients.viewAll) {
      errors.push('Manage all clients requires view all clients permission')
    }

    if (permissions.clients.manageAssigned && !permissions.clients.viewAssigned) {
      errors.push('Manage assigned clients requires view assigned clients permission')
    }

    return errors
  }, [])

  /**
   * Get default permission configuration for new permission sets
   * 
   * Provides a safe default permission configuration that grants minimal
   * access suitable for most team members.
   * 
   * @returns Default permission configuration object
   */
  const getDefaultPermissions = useCallback((): PermissionConfig => ({
    teamMembers: {
      viewAll: false,
      manageAll: false
    },
    projects: {
      viewAll: false,
      manageAll: false,
      viewAssigned: true,
      manageAssigned: false
    },
    invoicing: {
      viewAll: false,
      manageAll: false,
      viewAssigned: false,
      manageAssigned: false
    },
    clients: {
      viewAll: false,
      manageAll: false,
      viewAssigned: false,
      manageAssigned: false
    },
    worklogs: {
      manageAll: false
    }
  }), [])

  return {
    permissionSets: data,
    isLoading,
    error,
    createPermissionSet,
    updatePermissionSet,
    deletePermissionSet,
    validatePermissions,
    getDefaultPermissions,
    refetch,
    isCreating: createPermissionSetMutation.isPending,
    isUpdating: updatePermissionSetMutation.isPending,
    isDeleting: deletePermissionSetMutation.isPending,
  }
}

/**
 * Hook for managing a single permission set
 * 
 * Provides access to individual permission set data with automatic caching
 * and error handling.
 * 
 * @param organizationId - ID of the organization
 * @param setId - ID of the specific permission set to fetch
 * @returns Object containing permission set data and loading state
 * 
 * @example
 * ```typescript
 * const { permissionSet, isLoading, error } = usePermissionSet('org-123', 'set-456');
 * ```
 */
export function usePermissionSet(organizationId: string, setId: string) {
  const { data, error, isLoading, refetch } = useQuery<PermissionSet>({
    queryKey: ['permissionSet', organizationId, setId],
    queryFn: () => {
      if (!organizationId || !setId) throw new Error('Organization ID and Set ID are required')
      return fetcher(`/api/organizations/${organizationId}/permission-sets/${setId}`)
    },
    enabled: !!(organizationId && setId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  return {
    permissionSet: data,
    isLoading,
    error,
    refetch,
  }
}