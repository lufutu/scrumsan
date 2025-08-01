import useSWR from 'swr'
import { useCallback } from 'react'
import { toast } from 'sonner'
import { Database } from '@/types/database'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export interface Organization {
  id: string
  name: string
  description: string | null
  logo: string | null
  ownerId: string | null
  createdAt: string | null
  members: {
    userId: string
    role: 'owner' | 'admin' | 'member'
  }[]
}

export function useOrganizations() {
  const { data, error, isLoading, mutate } = useSWR<Organization[]>(
    '/api/organizations',
    fetcher
  )

  const createOrganization = useCallback(async (data: { name: string; description?: string; logo?: string }) => {
    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create organization')
      }

      await mutate()
      toast.success('Organization created successfully')
    } catch (error: any) {
      console.error('Failed to create organization:', error)
      toast.error(error.message || 'Failed to create organization')
      throw error
    }
  }, [mutate])

  const updateOrganization = useCallback(async (id: string, data: Partial<Organization>) => {
    try {
      const response = await fetch(`/api/organizations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update organization')
      }

      await mutate()
      toast.success('Organization updated successfully')
    } catch (error: any) {
      console.error('Failed to update organization:', error)
      toast.error(error.message || 'Failed to update organization')
      throw error
    }
  }, [mutate])

  const deleteOrganization = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/organizations/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete organization')
      }

      await mutate()
      toast.success('Organization deleted successfully')
    } catch (error: any) {
      console.error('Failed to delete organization:', error)
      toast.error(error.message || 'Failed to delete organization')
      throw error
    }
  }, [mutate])

  return {
    organizations: data,
    isLoading,
    error,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    mutate,
  }
} 