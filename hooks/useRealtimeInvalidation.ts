"use client"

import { useEffect, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '@/providers/supabase-provider'

export type RealtimeTable = 'tasks' | 'boards' | 'sprints' | 'projects' | 'organizations' | 'columns' | 'sprint_columns'

export interface RealtimeInvalidationConfig {
  table: RealtimeTable
  schema?: string
  filter?: string
  onInsert?: (payload: any) => void
  onUpdate?: (payload: any) => void
  onDelete?: (payload: any) => void
}

/**
 * Hook that connects Supabase realtime events to React Query cache invalidation
 * This enables real-time UI updates while keeping Prisma for data operations
 */
export function useRealtimeInvalidation(configs: RealtimeInvalidationConfig[]) {
  const { supabase } = useSupabase()
  const queryClient = useQueryClient()
  const channelsRef = useRef<any[]>([])

  // Invalidation strategy based on table and event type
  const getInvalidationKeys = useCallback((table: RealtimeTable, payload: any, eventType: string) => {
    const keys: string[][] = []

    switch (table) {
      case 'tasks':
        // Invalidate task-related queries
        keys.push(['tasks', payload.new?.board_id || payload.old?.board_id])
        keys.push(['tasks', 'all'])
        if (payload.new?.sprint_id || payload.old?.sprint_id) {
          keys.push(['tasks', 'sprint', payload.new?.sprint_id || payload.old?.sprint_id])
        }
        if (payload.new?.project_id || payload.old?.project_id) {
          keys.push(['tasks', 'project', payload.new?.project_id || payload.old?.project_id])
        }
        break

      case 'boards':
        // Invalidate board-related queries
        const boardId = payload.new?.id || payload.old?.id
        keys.push(['board', boardId])
        keys.push(['boards'])
        keys.push(['nav-data']) // Sidebar navigation
        if (payload.new?.organization_id || payload.old?.organization_id) {
          keys.push(['boards', payload.new?.organization_id || payload.old?.organization_id])
        }
        break

      case 'sprints':
        // Invalidate sprint-related queries
        const sprintId = payload.new?.id || payload.old?.id
        keys.push(['sprint', sprintId])
        keys.push(['sprints'])
        if (payload.new?.board_id || payload.old?.board_id) {
          keys.push(['sprints', payload.new?.board_id || payload.old?.board_id])
        }
        if (payload.new?.project_id || payload.old?.project_id) {
          keys.push(['sprints', 'project', payload.new?.project_id || payload.old?.project_id])
        }
        break

      case 'projects':
        // Invalidate project-related queries
        const projectId = payload.new?.id || payload.old?.id
        keys.push(['project', projectId])
        keys.push(['projects'])
        keys.push(['nav-data']) // Sidebar navigation
        if (payload.new?.organization_id || payload.old?.organization_id) {
          keys.push(['projects', payload.new?.organization_id || payload.old?.organization_id])
        }
        break

      case 'organizations':
        // Invalidate organization-related queries
        const orgId = payload.new?.id || payload.old?.id
        keys.push(['organization', orgId])
        keys.push(['organizations'])
        keys.push(['nav-data']) // Sidebar navigation
        break

      case 'columns':
        // Invalidate column-related queries
        keys.push(['columns'])
        if (payload.new?.board_id || payload.old?.board_id) {
          keys.push(['columns', payload.new?.board_id || payload.old?.board_id])
        }
        break

      case 'sprint_columns':
        // Invalidate sprint column-related queries
        keys.push(['sprint-columns'])
        if (payload.new?.sprint_id || payload.old?.sprint_id) {
          keys.push(['sprint-columns', payload.new?.sprint_id || payload.old?.sprint_id])
        }
        break

      default:
        // Fallback: invalidate generic queries for the table
        keys.push([table])
        break
    }

    return keys
  }, [])

  // Debounced invalidation to prevent too many invalidations in rapid succession
  const debouncedInvalidate = useCallback(
    (() => {
      const timeouts = new Map<string, NodeJS.Timeout>()
      
      return (keys: string[][]) => {
        keys.forEach(key => {
          const keyString = key.join(':')
          
          // Clear existing timeout for this key
          if (timeouts.has(keyString)) {
            clearTimeout(timeouts.get(keyString)!)
          }
          
          // Set new timeout
          const timeout = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: key })
            timeouts.delete(keyString)
            console.log(`[Realtime] Invalidated query: ${keyString}`)
          }, 100) // 100ms debounce
          
          timeouts.set(keyString, timeout)
        })
      }
    })(),
    [queryClient]
  )

  useEffect(() => {
    if (!supabase) return

    // Clean up existing channels
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel)
    })
    channelsRef.current = []

    // Create channels for each configuration
    configs.forEach(config => {
      const { table, schema = 'public', filter, onInsert, onUpdate, onDelete } = config
      
      const channelName = filter 
        ? `realtime:${table}:${filter}`
        : `realtime:${table}`

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events
            schema,
            table,
            filter
          },
          (payload) => {
            console.log(`[Realtime] ${table} change:`, payload.eventType, payload)
            
            // Get invalidation keys for this change
            const keys = getInvalidationKeys(table, payload, payload.eventType)
            
            // Invalidate React Query caches
            debouncedInvalidate(keys)
            
            // Call custom event handlers
            switch (payload.eventType) {
              case 'INSERT':
                onInsert?.(payload)
                break
              case 'UPDATE':
                onUpdate?.(payload)
                break
              case 'DELETE':
                onDelete?.(payload)
                break
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[Realtime] Subscribed to ${table} changes`)
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`[Realtime] Failed to subscribe to ${table} changes`)
          }
        })

      channelsRef.current.push(channel)
    })

    // Cleanup function
    return () => {
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel)
      })
      channelsRef.current = []
    }
  }, [supabase, configs, getInvalidationKeys, debouncedInvalidate])

  return {
    // Return status info for debugging
    isConnected: channelsRef.current.length > 0
  }
}

/**
 * Simplified hook for common board-level realtime invalidation
 */
export function useBoardRealtimeInvalidation(boardId: string) {
  return useRealtimeInvalidation([
    {
      table: 'tasks',
      filter: `board_id=eq.${boardId}`,
    },
    {
      table: 'boards', 
      filter: `id=eq.${boardId}`,
    },
    {
      table: 'columns',
      filter: `board_id=eq.${boardId}`,
    }
  ])
}

/**
 * Simplified hook for project-level realtime invalidation
 */
export function useProjectRealtimeInvalidation(projectId: string) {
  return useRealtimeInvalidation([
    {
      table: 'tasks',
      filter: `project_id=eq.${projectId}`,
    },
    {
      table: 'sprints',
      filter: `project_id=eq.${projectId}`,
    },
    {
      table: 'projects',
      filter: `id=eq.${projectId}`,
    }
  ])
}

/**
 * Organization-level realtime invalidation
 */
export function useOrganizationRealtimeInvalidation(organizationId: string) {
  return useRealtimeInvalidation([
    {
      table: 'organizations',
      filter: `id=eq.${organizationId}`,
    },
    {
      table: 'projects',
      filter: `organization_id=eq.${organizationId}`,
    },
    {
      table: 'boards',
      filter: `organization_id=eq.${organizationId}`,
    }
  ])
}