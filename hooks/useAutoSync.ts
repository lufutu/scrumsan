'use client'

import { useEffect } from 'react'
import { useSupabase } from '@/providers/supabase-provider'

/**
 * Hook to automatically sync user data from Supabase auth to Prisma database
 * when user authenticates or when needed
 */
export const useAutoSync = () => {
  const { user } = useSupabase()

  const syncCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      })

      if (!response.ok) {
        const error = await response.json()
        console.warn('Failed to sync user:', error)
        return false
      }

      const result = await response.json()
      console.log('User sync successful:', result.message)
      return true
    } catch (error) {
      console.warn('Error syncing user:', error)
      return false
    }
  }

  const checkSyncStatus = async () => {
    try {
      const response = await fetch('/api/auth/sync')
      
      if (!response.ok) {
        return { needsSync: true, error: 'Failed to check sync status' }
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.warn('Error checking sync status:', error)
      return { needsSync: true, error: 'Network error' }
    }
  }

  // Auto-sync when user logs in
  useEffect(() => {
    if (user?.id) {
      // Check if user needs sync first, then sync if needed
      checkSyncStatus().then((status) => {
        if (status.needsSync) {
          syncCurrentUser()
        }
      })
    }
  }, [user?.id])

  return {
    syncCurrentUser,
    checkSyncStatus
  }
}