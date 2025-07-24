'use client'

import useSWR from 'swr'
import { useCallback } from 'react'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
})

export interface CustomRole {
  id: string
  organizationId: string
  name: string
  color: string
  createdAt: string
  _count?: {
    members: number
  }
}

export interface CustomRoleCreateData {
  name: string
  color?: string
}

export interface CustomRoleUpdateData {
  name?: string
  color?: string
}

export const DEFAULT_ROLE_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280', // Gray
] as const

export function useCustomRoles(organizationId: string) {
  const { data, error, isLoading, mutate } = useSWR<CustomRole[]>(
    organizationId ? `/api/organizations/${organizationId}/roles` : null,
    fetcher
  )

  const createRole = useCallback(async (roleData: CustomRoleCreateData) => {
    if (!organizationId) throw new Error('Organization ID is required')

    try {
      const response = await fetch(`/api/organizations/${organizationId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...roleData,
          color: roleData.color || DEFAULT_ROLE_COLORS[0]
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create role')
      }

      await mutate()
      toast.success('Role created successfully')
      return await response.json()
    } catch (error: any) {
      toast.error(error.message)
      throw error
    }
  }, [organizationId, mutate])

  const updateRole = useCallback(async (roleId: string, roleData: CustomRoleUpdateData) => {
    if (!organizationId) throw new Error('Organization ID is required')

    try {
      const response = await fetch(`/api/organizations/${organizationId}/roles/${roleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update role')
      }

      await mutate()
      toast.success('Role updated successfully')
      return await response.json()
    } catch (error: any) {
      toast.error(error.message)
      throw error
    }
  }, [organizationId, mutate])

  const deleteRole = useCallback(async (roleId: string) => {
    if (!organizationId) throw new Error('Organization ID is required')

    try {
      const response = await fetch(`/api/organizations/${organizationId}/roles/${roleId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete role')
      }

      await mutate()
      toast.success('Role deleted successfully')
    } catch (error: any) {
      toast.error(error.message)
      throw error
    }
  }, [organizationId, mutate])

  const getRoleById = useCallback((roleId: string): CustomRole | undefined => {
    return data?.find(role => role.id === roleId)
  }, [data])

  const getRoleByName = useCallback((name: string): CustomRole | undefined => {
    return data?.find(role => role.name.toLowerCase() === name.toLowerCase())
  }, [data])

  const getRolesByColor = useCallback((color: string): CustomRole[] => {
    return data?.filter(role => role.color === color) || []
  }, [data])

  const getAvailableColors = useCallback((): string[] => {
    if (!data) return DEFAULT_ROLE_COLORS.slice()
    
    const usedColors = data.map(role => role.color)
    return DEFAULT_ROLE_COLORS.filter(color => !usedColors.includes(color))
  }, [data])

  const getNextAvailableColor = useCallback((): string => {
    const availableColors = getAvailableColors()
    return availableColors.length > 0 ? availableColors[0] : DEFAULT_ROLE_COLORS[0]
  }, [getAvailableColors])

  const validateRole = useCallback((
    roleData: CustomRoleCreateData | CustomRoleUpdateData,
    excludeRoleId?: string
  ): string[] => {
    const errors: string[] = []
    
    // Validate name
    if ('name' in roleData && roleData.name !== undefined) {
      if (!roleData.name.trim()) {
        errors.push('Role name is required')
      } else if (roleData.name.trim().length < 2) {
        errors.push('Role name must be at least 2 characters long')
      } else if (roleData.name.trim().length > 50) {
        errors.push('Role name must be less than 50 characters')
      }

      // Check for duplicate names
      const existingRole = data?.find(role => 
        role.name.toLowerCase() === roleData.name.trim().toLowerCase() &&
        role.id !== excludeRoleId
      )
      
      if (existingRole) {
        errors.push('A role with this name already exists')
      }
    }

    // Validate color
    if ('color' in roleData && roleData.color !== undefined) {
      if (!roleData.color.match(/^#[0-9A-F]{6}$/i)) {
        errors.push('Invalid color format. Use hex format like #3B82F6')
      }
    }

    return errors
  }, [data])

  const isRoleInUse = useCallback((roleId: string): boolean => {
    const role = getRoleById(roleId)
    return role?._count?.members ? role._count.members > 0 : false
  }, [getRoleById])

  const sortRolesByUsage = useCallback((roles?: CustomRole[]): CustomRole[] => {
    const rolesToSort = roles || data || []
    return [...rolesToSort].sort((a, b) => {
      const aCount = a._count?.members || 0
      const bCount = b._count?.members || 0
      
      // Sort by usage count (descending), then by name (ascending)
      if (aCount !== bCount) {
        return bCount - aCount
      }
      return a.name.localeCompare(b.name)
    })
  }, [data])

  const sortRolesByName = useCallback((roles?: CustomRole[]): CustomRole[] => {
    const rolesToSort = roles || data || []
    return [...rolesToSort].sort((a, b) => a.name.localeCompare(b.name))
  }, [data])

  const sortRolesByCreated = useCallback((roles?: CustomRole[]): CustomRole[] => {
    const rolesToSort = roles || data || []
    return [...rolesToSort].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [data])

  return {
    roles: data,
    isLoading,
    error,
    createRole,
    updateRole,
    deleteRole,
    getRoleById,
    getRoleByName,
    getRolesByColor,
    getAvailableColors,
    getNextAvailableColor,
    validateRole,
    isRoleInUse,
    sortRolesByUsage,
    sortRolesByName,
    sortRolesByCreated,
    mutate,
  }
}

export function useCustomRole(organizationId: string, roleId: string) {
  const { data, error, isLoading, mutate } = useSWR<CustomRole>(
    organizationId && roleId 
      ? `/api/organizations/${organizationId}/roles/${roleId}`
      : null,
    fetcher
  )

  return {
    role: data,
    isLoading,
    error,
    mutate,
  }
}