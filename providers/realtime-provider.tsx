"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

type RealtimeContextType = {
  activeUsers: Record<string, { userId: string; userName: string; itemId?: string }>
  setUserActivity: (itemId?: string) => void
}

const RealtimeContext = createContext<RealtimeContextType>({
  activeUsers: {},
  setUserActivity: () => {},
})

export const useRealtime = () => useContext(RealtimeContext)

export function RealtimeProvider({ children, projectId }: { children: ReactNode; projectId: string }) {
  const [activeUsers, setActiveUsers] = useState<Record<string, { userId: string; userName: string; itemId?: string }>>(
    {},
  )
  const { toast } = useToast()
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", data.user.id).single()

        setCurrentUser({
          id: data.user.id,
          name: profile?.full_name || "Anonymous User",
        })
      }
    }

    fetchCurrentUser()
  }, [])

  useEffect(() => {
    if (!projectId || !currentUser) return

    // Subscribe to presence channel
    const channel = supabase.channel(`project:${projectId}`)

    channel
      .on("presence", { event: "sync" }, () => {
        const newState = channel.presenceState()
        const formattedState: Record<string, { userId: string; userName: string; itemId?: string }> = {}

        Object.keys(newState).forEach((key) => {
          const presence = newState[key][0] as any
          formattedState[key] = {
            userId: presence.user_id,
            userName: presence.user_name,
            itemId: presence.item_id,
          }
        })

        setActiveUsers(formattedState)
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        const presence = newPresences[0] as any
        if (presence.user_id !== currentUser.id) {
          toast({
            title: "User joined",
            description: `${presence.user_name} is now online`,
          })
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && currentUser) {
          await channel.track({
            user_id: currentUser.id,
            user_name: currentUser.name,
          })
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [projectId, currentUser, toast])

  const setUserActivity = async (itemId?: string) => {
    if (!projectId || !currentUser) return

    const channel = supabase.channel(`project:${projectId}`)
    await channel.track({
      user_id: currentUser.id,
      user_name: currentUser.name,
      item_id: itemId,
    })
  }

  return <RealtimeContext.Provider value={{ activeUsers, setUserActivity }}>{children}</RealtimeContext.Provider>
}
