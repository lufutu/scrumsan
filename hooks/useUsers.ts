'use client'

import { useState, useEffect, useCallback } from 'react'

export interface User {
  id: string
  fullName: string
  email?: string // Optional since it's stored in Supabase auth, not Prisma
  avatarUrl?: string
  role?: string
}

interface UseUsersProps {
  projectId?: string
  organizationId?: string
  autoFetch?: boolean
}

export const useUsers = ({ projectId, organizationId, autoFetch = true }: UseUsersProps = {}) => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    if (!projectId && !organizationId) {
      setUsers([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      let url = ''
      
      if (projectId) {
        // Fetch project members via API
        url = `/api/projects/${projectId}/members`
      } else if (organizationId) {
        // For now, use the organization details endpoint and extract members
        // TODO: Create dedicated /api/organizations/[id]/members endpoint
        url = `/api/organizations/${organizationId}`
      }

      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`)
      }

      const data = await response.json()
      
      let userList: User[] = []
      
      if (projectId) {
        // Transform project members response
        userList = data.map((member: any) => ({
          id: member.user?.id || member.userId,
          fullName: member.user?.fullName || member.user?.full_name || 'Unknown User',
          email: member.user?.email || undefined,
          avatarUrl: member.user?.avatarUrl || member.user?.avatar_url || undefined,
          role: member.role
        }))
      } else if (organizationId) {
        // Transform organization response - extract members if available
        if (data.members && Array.isArray(data.members)) {
          userList = data.members.map((member: any) => ({
            id: member.user?.id || member.userId,
            fullName: member.user?.fullName || member.user?.full_name || 'Unknown User',
            email: member.user?.email || undefined,
            avatarUrl: member.user?.avatarUrl || member.user?.avatar_url || undefined,
            role: member.role
          }))
        } else {
          // If no members in response, return empty array
          userList = []
        }
      }

      setUsers(userList)
    } catch (err: any) {
      console.error('Error fetching users:', err)
      setError(err.message || 'Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }, [projectId, organizationId])

  // Auto-fetch users when dependencies change
  useEffect(() => {
    if (autoFetch && (projectId || organizationId)) {
      fetchUsers()
    }
  }, [fetchUsers, autoFetch])

  const findUserById = useCallback((id: string): User | undefined => {
    return users.find(user => user.id === id)
  }, [users])

  const filterUsers = useCallback((searchTerm: string): User[] => {
    if (!searchTerm.trim()) return users
    
    const term = searchTerm.toLowerCase()
    return users.filter(user => 
      user.fullName.toLowerCase().includes(term) ||
      (user.email && user.email.toLowerCase().includes(term))
    )
  }, [users])

  return {
    users,
    loading,
    error,
    fetchUsers,
    findUserById,
    filterUsers,
    refetch: fetchUsers
  }
}