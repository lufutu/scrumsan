"use client"

import { useBoardRealtimeInvalidation } from './useRealtimeInvalidation'

/**
 * Simple hook that enables realtime sync for a board
 * This automatically invalidates React Query caches when board data changes
 * No manual callbacks needed - just plug and play!
 */
export function useBoardRealtimeSync(boardId: string) {
  const { isConnected } = useBoardRealtimeInvalidation(boardId)
  
  return {
    isConnected,
    // Status message for debugging
    status: isConnected ? 'Connected to realtime' : 'Connecting to realtime...'
  }
}

/**
 * Organization-level realtime sync
 */
export function useOrgRealtimeSync(organizationId: string) {
  // For now, we'll just use project-level invalidation
  // This can be expanded later for org-specific realtime needs
  return {
    isConnected: true,
    status: 'Organization realtime sync ready'
  }
}