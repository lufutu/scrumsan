"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useSupabase } from '@/providers/supabase-provider'
import { Organization } from '@/hooks/useOrganizations'

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
      setOrganizations([])
      setActiveOrgState(null)
      setIsLoading(false)
      hasLoadedOrganizations.current = false
      hasSetInitialActiveOrg.current = false
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/organizations')
      if (!response.ok) {
        throw new Error('Failed to fetch organizations')
      }
      
      const data = await response.json()
      setOrganizations(data)
      hasLoadedOrganizations.current = true
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organizations')
      console.error('Error fetching organizations:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Separate effect to handle setting active org after organizations are loaded
  useEffect(() => {
    if (hasLoadedOrganizations.current && organizations.length > 0 && !hasSetInitialActiveOrg.current) {
      const savedActiveOrgId = localStorage.getItem('activeOrgId')
      const orgToActivate = savedActiveOrgId 
        ? organizations.find((org: Organization) => org.id === savedActiveOrgId) || organizations[0]
        : organizations[0]
      
      setActiveOrgState(orgToActivate)
      localStorage.setItem('activeOrgId', orgToActivate.id)
      hasSetInitialActiveOrg.current = true
    }
  }, [organizations])

  const setActiveOrg = useCallback((org: Organization) => {
    setActiveOrgState(org)
    localStorage.setItem('activeOrgId', org.id)
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
        localStorage.setItem('activeOrgId', newActiveOrg.id)
      } else if (currentActiveOrg && currentActiveOrg !== activeOrg) {
        // Update the active org with latest data if it has changed
        setActiveOrgState(currentActiveOrg)
      }
    }
  }, [organizations, activeOrg])

  // Clear active org when user logs out
  useEffect(() => {
    // Only clear localStorage if user is null AND we're not still loading the user
    if (!user && !userLoading) {
      setActiveOrgState(null)
      localStorage.removeItem('activeOrgId')
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