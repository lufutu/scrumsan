"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useSupabase } from '@/providers/supabase-provider'
import { Organization } from '@/hooks/useOrganizations'
import { debugLoadingState, createLoadingTimeout } from '@/lib/loading-debug'

interface OrganizationContextType {
  organizations: Organization[]
  activeOrg: Organization | null
  isLoading: boolean
  error: string | null
  setActiveOrg: (org: Organization) => void
  refreshOrganizations: () => Promise<void>
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider')
  }
  return context
}

interface OrganizationProviderProps {
  children: React.ReactNode
}

export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const { user, isLoading: userLoading } = useSupabase()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [activeOrg, setActiveOrgState] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Use refs to track initialization state
  const hasLoadedOrganizations = useRef(false)
  const hasSetInitialActiveOrg = useRef(false)

  const fetchOrganizations = useCallback(async () => {
    if (!user) {
      debugLoadingState('OrganizationProvider', { status: 'no user, clearing state' });
      setOrganizations([])
      setActiveOrgState(null)
      setIsLoading(false)
      hasLoadedOrganizations.current = false
      hasSetInitialActiveOrg.current = false
      return
    }

    debugLoadingState('OrganizationProvider', { status: 'fetching organizations', userId: user.id });
    const timeout = createLoadingTimeout('Organization fetch', 8000);

    try {
      setIsLoading(true)
      setError(null)
      
      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)
      

      const response = await fetch('/api/organizations', {
        signal: controller.signal
      })

      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 404) {
          // No organizations found is not an error for new users
          setOrganizations([])
          hasLoadedOrganizations.current = true
          debugLoadingState('OrganizationProvider', { 
            status: 'no organizations found', 
            count: 0 
          });
          return
        }
        throw new Error('Failed to fetch organizations')
      }
      
      const data = await response.json()

      debugLoadingState('OrganizationProvider', { 
        status: 'organizations fetched', 
        count: data.length 
      });
      setOrganizations(data)
      hasLoadedOrganizations.current = true
      
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timeout - please refresh the page')
        debugLoadingState('OrganizationProvider', { status: 'fetch timeout' });
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load organizations')
        debugLoadingState('OrganizationProvider', { 
          status: 'fetch error', 
          error: err instanceof Error ? err.message : 'Unknown error' 
        });
      }
      console.error('Error fetching organizations:', err)
    } finally {
      timeout.clear();
      setIsLoading(false)
      debugLoadingState('OrganizationProvider', { status: 'fetch complete' });
    }
  }, [user])

  // Separate effect to handle setting active org after organizations are loaded
  useEffect(() => {
    // Set active org if:
    // 1. Organizations are loaded AND
    // 2. There are organizations available AND
    // 3. Either no active org is set OR the initial org hasn't been set yet
    if (hasLoadedOrganizations.current && organizations.length > 0 && (!activeOrg || !hasSetInitialActiveOrg.current)) {
      // Safely access localStorage with fallback
      let savedActiveOrgId: string | null = null
      try {
        savedActiveOrgId = typeof window !== 'undefined' ? localStorage.getItem('activeOrgId') : null
      } catch (error) {
        console.warn('Failed to access localStorage:', error)
      }
      
      const orgToActivate = savedActiveOrgId 
        ? organizations.find((org: Organization) => org.id === savedActiveOrgId) || organizations[0]
        : organizations[0]
      setActiveOrgState(orgToActivate)
      
      // Safely set localStorage
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('activeOrgId', orgToActivate.id)
        }
      } catch (error) {
        console.warn('Failed to save to localStorage:', error)
      }
      
      hasSetInitialActiveOrg.current = true
    }
  }, [organizations, activeOrg])

  const setActiveOrg = useCallback((org: Organization) => {
    setActiveOrgState(org)
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeOrgId', org.id)
      }
    } catch (error) {
      console.warn('Failed to save active org to localStorage:', error)
    }
  }, [])

  const refreshOrganizations = useCallback(async () => {
    await fetchOrganizations()
  }, [fetchOrganizations])

  // Load organizations when user changes
  useEffect(() => {
    if (!userLoading) {
      fetchOrganizations()
    }
  }, [user, userLoading, fetchOrganizations])

  // Update active org if it's no longer in the organizations list
  useEffect(() => {
    if (activeOrg && organizations.length > 0) {
      const currentActiveOrg = organizations.find(org => org.id === activeOrg.id)
      if (!currentActiveOrg) {
        // Active org was deleted or is no longer accessible, switch to first available
        const newActiveOrg = organizations[0]
        setActiveOrgState(newActiveOrg)
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('activeOrgId', newActiveOrg.id)
          }
        } catch (error) {
          console.warn('Failed to update localStorage:', error)
        }
      }
      // Remove the object comparison that was causing infinite loops
      // Only update if the org is missing, not if it's just a different object reference
    }
  }, [organizations, activeOrg?.id]) // Use activeOrg?.id instead of activeOrg to prevent object reference loops

  // Clear active org when user logs out
  useEffect(() => {
    // Only clear localStorage if user is null AND we're not still loading the user
    if (!user && !userLoading) {
      setActiveOrgState(null)
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('activeOrgId')
        }
      } catch (error) {
        console.warn('Failed to clear localStorage:', error)
      }
      hasLoadedOrganizations.current = false
      hasSetInitialActiveOrg.current = false
    }
  }, [user, userLoading])

  const value: OrganizationContextType = {
    organizations,
    activeOrg,
    isLoading: isLoading || userLoading,
    error,
    setActiveOrg,
    refreshOrganizations,
  }

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  )
} 