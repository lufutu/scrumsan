'use client'

import { useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '@/providers/supabase-provider'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface RealtimeCallbacks {
  onTaskCreated?: (task: any) => void
  onTaskUpdated?: (task: any) => void
  onTaskDeleted?: (taskId: string) => void
  onTaskMoved?: (data: { taskId: string; fromStatus: string; toStatus: string }) => void
  onBoardUpdated?: (board: any) => void
  onSprintUpdated?: (sprint: any) => void
}

interface UseSupabaseRealtimeProps {
  table: 'tasks' | 'boards' | 'sprints'
  filter?: string
  callbacks: RealtimeCallbacks
  enabled?: boolean
}

export function useSupabaseRealtime({ 
  table, 
  filter, 
  callbacks, 
  enabled = true 
}: UseSupabaseRealtimeProps) {
  const { supabase } = useSupabase()
  const queryClient = useQueryClient()

  // Enhanced invalidation logic that works with React Query
  const invalidateQueries = useCallback((table: string, payload: any, eventType: string) => {
    const keys: string[][] = []

    switch (table) {
      case 'tasks':
        // Invalidate task-related queries
        keys.push(['tasks', payload.new?.board_id || payload.old?.board_id])
        keys.push(['tasks', 'all'])
        if (payload.new?.sprint_id || payload.old?.sprint_id) {
          keys.push(['tasks', 'sprint', payload.new?.sprint_id || payload.old?.sprint_id])
        }
        break

      case 'boards':
        // Invalidate board-related queries
        const boardId = payload.new?.id || payload.old?.id
        keys.push(['board', boardId])
        keys.push(['boards'])
        keys.push(['nav-data']) // Sidebar navigation
        break

      case 'sprints':
        // Invalidate sprint-related queries
        keys.push(['sprints'])
        if (payload.new?.board_id || payload.old?.board_id) {
          keys.push(['sprints', payload.new?.board_id || payload.old?.board_id])
        }
        break
    }

    // Invalidate all relevant queries
    keys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: key })
      console.log(`[Realtime] Invalidated query: ${key.join(':')}`)
    })
  }, [queryClient])

  const handleInsert = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    console.log(`[Realtime] ${table} INSERT:`, payload.new)
    
    // Invalidate React Query caches first
    invalidateQueries(table, payload, 'INSERT')
    
    // Then call custom callbacks
    switch (table) {
      case 'tasks':
        callbacks.onTaskCreated?.(payload.new)
        break
      case 'boards':
        callbacks.onBoardUpdated?.(payload.new)
        break
      case 'sprints':
        callbacks.onSprintUpdated?.(payload.new)
        break
    }
  }, [table, callbacks, invalidateQueries])

  const handleUpdate = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    console.log(`[Realtime] ${table} UPDATE:`, payload.new)
    
    // Invalidate React Query caches first
    invalidateQueries(table, payload, 'UPDATE')
    
    // Then call custom callbacks
    switch (table) {
      case 'tasks':
        callbacks.onTaskUpdated?.(payload.new)
        break
      case 'boards':
        callbacks.onBoardUpdated?.(payload.new)
        break
      case 'sprints':
        callbacks.onSprintUpdated?.(payload.new)
        break
    }
  }, [table, callbacks, invalidateQueries])

  const handleDelete = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    console.log(`[Realtime] ${table} DELETE:`, payload.old)
    
    // Invalidate React Query caches first
    invalidateQueries(table, payload, 'DELETE')
    
    // Then call custom callbacks
    switch (table) {
      case 'tasks':
        callbacks.onTaskDeleted?.(payload.old?.id || '')
        break
      case 'boards':
        callbacks.onBoardUpdated?.(payload.old)
        break
      case 'sprints':
        callbacks.onSprintUpdated?.(payload.old)
        break
    }
  }, [table, callbacks, invalidateQueries])

  useEffect(() => {
    if (!enabled || !supabase) return

    let channel: RealtimeChannel

    const setupRealtimeSubscription = () => {
      // Create a unique channel name
      const channelName = filter 
        ? `realtime:${table}:${filter}` 
        : `realtime:${table}`

      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: table,
            filter: filter
          },
          handleInsert
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: table,
            filter: filter
          },
          handleUpdate
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: table,
            filter: filter
          },
          handleDelete
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[Realtime] ✅ Connected to ${table} realtime`)
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`[Realtime] ❌ Failed to connect to ${table} realtime`)
          } else {
            console.log(`[Realtime] ${table} status:`, status)
          }
        })
    }

    setupRealtimeSubscription()

    return () => {
      if (channel) {
        console.log(`[Realtime] Unsubscribing from ${table}`)
        supabase.removeChannel(channel)
      }
    }
  }, [supabase, table, filter, enabled, handleInsert, handleUpdate, handleDelete])
}

// Convenience hook for board-specific real-time updates
export function useBoardRealtime(
  boardId: string,
  callbacks: RealtimeCallbacks,
  enabled = true
) {
  // Listen to tasks for this board
  useSupabaseRealtime({
    table: 'tasks',
    filter: `boardId=eq.${boardId}`,
    callbacks: {
      onTaskCreated: callbacks.onTaskCreated,
      onTaskUpdated: callbacks.onTaskUpdated,
      onTaskDeleted: callbacks.onTaskDeleted
    },
    enabled
  })

  // Listen to board updates
  useSupabaseRealtime({
    table: 'boards',
    filter: `id=eq.${boardId}`,
    callbacks: {
      onBoardUpdated: callbacks.onBoardUpdated
    },
    enabled
  })
}

// Convenience hook for project-specific real-time updates
export function useProjectRealtime(
  projectId: string,
  callbacks: RealtimeCallbacks,
  enabled = true
) {
  // Listen to tasks for this project
  useSupabaseRealtime({
    table: 'tasks',
    filter: `projectId=eq.${projectId}`,
    callbacks: {
      onTaskCreated: callbacks.onTaskCreated,
      onTaskUpdated: callbacks.onTaskUpdated,
      onTaskDeleted: callbacks.onTaskDeleted
    },
    enabled
  })

  // Listen to sprints for this project
  useSupabaseRealtime({
    table: 'sprints',
    filter: `projectId=eq.${projectId}`,
    callbacks: {
      onSprintUpdated: callbacks.onSprintUpdated
    },
    enabled
  })
}

// Hook for listening to all tasks (useful for global dashboards)
export function useTasksRealtime(
  callbacks: RealtimeCallbacks,
  enabled = true
) {
  return useSupabaseRealtime({
    table: 'tasks',
    callbacks,
    enabled
  })
}