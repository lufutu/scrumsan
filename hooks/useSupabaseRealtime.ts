'use client'

import { useEffect, useCallback } from 'react'
import { useSupabase } from '@/providers/supabase-provider'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface RealtimeCallbacks {
  onTaskCreated?: (task: any) => void
  onTaskUpdated?: (task: any) => void
  onTaskDeleted?: (taskId: string) => void
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

  const handleInsert = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    console.log(`[Realtime] ${table} INSERT:`, payload.new)
    
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
  }, [table, callbacks])

  const handleUpdate = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    console.log(`[Realtime] ${table} UPDATE:`, payload.new)
    
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
  }, [table, callbacks])

  const handleDelete = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    console.log(`[Realtime] ${table} DELETE:`, payload.old)
    
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
  }, [table, callbacks])

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
          console.log(`[Realtime] Subscription status for ${table}:`, status)
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