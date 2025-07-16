"use client"

import { useEffect, useState, useCallback } from "react"
import { useSupabase } from "@/providers/supabase-provider"

type RealtimeSubscription = {
  table: string
  schema?: string
  filter?: string
  event?: "INSERT" | "UPDATE" | "DELETE" | "*"
}

export function useRealtimeSubscription<T = any>(
  subscription: RealtimeSubscription,
  callback: (payload: { new: T; old: T; eventType: string }) => void,
) {
  const { supabase } = useSupabase()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const { table, schema = "public", filter, event = "*" } = subscription

    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        "postgres_changes",
        {
          event,
          schema,
          table,
          filter,
        },
        (payload) => {
          callback({
            new: payload.new as T,
            old: payload.old as T,
            eventType: payload.eventType,
          })
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsSubscribed(true)
        } else if (status === "CHANNEL_ERROR") {
          setError(new Error("Failed to subscribe to real-time updates"))
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, subscription, callback])

  return { isSubscribed, error }
}

export function useRealtimePresence<T = any>(room: string, user: { id: string; [key: string]: any }) {
  const { supabase } = useSupabase()
  const [presenceState, setPresenceState] = useState<Record<string, T[]>>({})
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!room || !user?.id) return

    const channel = supabase.channel(room, {
      config: {
        presence: {
          key: user.id,
        },
      },
    })

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState()
        setPresenceState(state as Record<string, T[]>)
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log("User joined:", key, newPresences)
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log("User left:", key, leftPresences)
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track(user)
        } else if (status === "CHANNEL_ERROR") {
          setError(new Error("Failed to subscribe to presence updates"))
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, room, user])

  return { presenceState, error }
}

/**
 * A hook for subscribing to real-time updates for a specific entity
 * This is a simplified wrapper around useRealtimeSubscription
 */
export function useRealtime<T = any>(
  table: string,
  id: string | null,
  options: {
    schema?: string
    event?: "INSERT" | "UPDATE" | "DELETE" | "*"
    idColumn?: string
  } = {},
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { supabase } = useSupabase()
  const { schema = "public", event = "*", idColumn = "id" } = options

  const fetchData = useCallback(
    async (table: string, id: string, idColumn: string, supabase: any) => {
      try {
        const { data, error } = await supabase.from(table).select("*").eq(idColumn, id).single()

        if (error) throw error
        return data as T
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error occurred"))
        return null
      } finally {
        setLoading(false)
      }
    },
    [setError, setLoading],
  )

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }

    setLoading(true)

    fetchData(table, id, idColumn, supabase).then((initialData) => {
      if (initialData) {
        setData(initialData)
      }

      // Set up real-time subscription
      const subscription = {
        table,
        schema,
        event,
        filter: `${idColumn}=eq.${id}`,
      }

      const handleRealtimePayload = (payload: { new: T; old: T; eventType: string }) => {
        if (payload.eventType === "DELETE") {
          setData(null)
        } else {
          setData(payload.new)
        }
      }

      const { error: subscriptionError } = useRealtimeSubscription<T>(subscription, handleRealtimePayload)

      if (subscriptionError) {
        setError(subscriptionError)
      }
    })

    return () => {
      // Cleanup handled by useRealtimeSubscription
    }
  }, [supabase, table, id, idColumn, schema, event, fetchData])

  return { data, loading, error }
}
