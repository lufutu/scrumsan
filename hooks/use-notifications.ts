"use client"

import { useState, useEffect, useCallback } from "react"
import { useSupabase } from "@/components/providers/supabase-provider"
import { useRealtimeSubscription } from "./use-realtime"

type Notification = {
  id: string
  user_id: string
  title: string
  message: string
  link?: string
  is_read: boolean
  created_at: string
}

export function useNotifications() {
  const { supabase, session } = useSupabase()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchNotifications = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("user_notifications")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) throw error

      setNotifications(data || [])
      setUnreadCount(data?.filter((n) => !n.is_read).length || 0)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch notifications"))
    } finally {
      setIsLoading(false)
    }
  }, [supabase, session])

  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        const { error } = await supabase
          .from("user_notifications")
          .update({ is_read: true })
          .eq("id", notificationId)
          .eq("user_id", session?.user?.id)

        if (error) throw error

        // Update local state
        setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)))
        setUnreadCount((prev) => Math.max(0, prev - 1))
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to mark notification as read"))
      }
    },
    [supabase, session],
  )

  const markAllAsRead = useCallback(async () => {
    try {
      const { error } = await supabase
        .from("user_notifications")
        .update({ is_read: true })
        .eq("user_id", session?.user?.id)
        .eq("is_read", false)

      if (error) throw error

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to mark all notifications as read"))
    }
  }, [supabase, session])

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      try {
        const { error } = await supabase
          .from("user_notifications")
          .delete()
          .eq("id", notificationId)
          .eq("user_id", session?.user?.id)

        if (error) throw error

        // Update local state
        const deletedNotification = notifications.find((n) => n.id === notificationId)
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId))

        if (deletedNotification && !deletedNotification.is_read) {
          setUnreadCount((prev) => Math.max(0, prev - 1))
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to delete notification"))
      }
    },
    [supabase, session, notifications],
  )

  // Subscribe to real-time updates
  useRealtimeSubscription<Notification>(
    {
      table: "user_notifications",
      filter: session?.user?.id ? `user_id=eq.${session.user.id}` : undefined,
    },
    useCallback(
      ({ new: newNotification, eventType }) => {
        if (eventType === "INSERT") {
          setNotifications((prev) => [newNotification, ...prev])
          if (!newNotification.is_read) {
            setUnreadCount((prev) => prev + 1)
          }
        } else if (eventType === "UPDATE") {
          setNotifications((prev) => prev.map((n) => (n.id === newNotification.id ? newNotification : n)))
          // Recalculate unread count
          setUnreadCount(
            notifications.map((n) => (n.id === newNotification.id ? newNotification : n)).filter((n) => !n.is_read)
              .length,
          )
        } else if (eventType === "DELETE") {
          setNotifications((prev) => prev.filter((n) => n.id !== newNotification.id))
          // Recalculate unread count if needed
          if (!newNotification.is_read) {
            setUnreadCount((prev) => Math.max(0, prev - 1))
          }
        }
      },
      [notifications],
    ),
  )

  // Initial fetch
  useEffect(() => {
    if (session?.user?.id) {
      fetchNotifications()
    }
  }, [session, fetchNotifications])

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications,
  }
}
