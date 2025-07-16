"use client"

import { useOrganization } from '@/providers/organization-provider'

/**
 * Simple hook to get the currently active organization
 * This is a convenience hook that extracts just the activeOrg from the organization context
 */
export function useActiveOrg() {
  const { activeOrg } = useOrganization()
  return activeOrg
} 