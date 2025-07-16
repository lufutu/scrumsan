"use client"

import { useState, useEffect } from "react"
import { useSupabase } from "@/providers/supabase-provider"
import { useToast } from "@/hooks/use-toast"

interface TeamMember {
  id: string
  name: string
  capacity: number
}

export function useTeamMembers(projectId: string) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalCapacity, setTotalCapacity] = useState(0)
  const [averageVelocity, setAverageVelocity] = useState<number | null>(null)
  const { supabase } = useSupabase()
  const { toast } = useToast()

  useEffect(() => {
    const fetchTeamMembers = async () => {
      setIsLoading(true)
      try {
        // Fetch team members for this project
        const { data: members, error: membersError } = await supabase
          .from("project_members")
          .select(
            `
            id,
            profiles (
              id,
              full_name
            )
          `,
          )
          .eq("project_id", projectId)

        if (membersError) throw membersError

        // Format team members with default capacity
        const formattedMembers = members.map((member) => ({
          id: member.profiles.id,
          name: member.profiles.full_name || "Unnamed User",
          capacity: 8, // Default capacity in story points
        }))

        setTeamMembers(formattedMembers)
        calculateTotalCapacity(formattedMembers)

        // Fetch average velocity from completed sprints
        const { data: sprints, error: sprintsError } = await supabase
          .from("sprints")
          .select(
            `
            id,
            boards (
              project_id
            )
          `,
          )
          .eq("status", "completed")
          .eq("boards.project_id", projectId)
          .limit(5)

        if (sprintsError) throw sprintsError

        // Filter out sprints that don't belong to this project
        const projectSprints = sprints.filter((sprint) => sprint.boards?.project_id === projectId)

        if (projectSprints.length > 0) {
          // For each sprint, get the completed story points
          const sprintData = await Promise.all(
            projectSprints.map(async (sprint) => {
              const { data: items, error: itemsError } = await supabase
                .from("items")
                .select("estimate")
                .eq("sprint_id", sprint.id)
                .eq("status", "done")

              if (itemsError) throw itemsError

              const completedPoints = items.reduce((sum, item) => sum + (item.estimate || 0), 0)

              return completedPoints
            }),
          )

          // Calculate average velocity
          const totalPoints = sprintData.reduce((sum, points) => sum + points, 0)
          const avgVelocity = projectSprints.length > 0 ? Math.round(totalPoints / projectSprints.length) : null
          setAverageVelocity(avgVelocity)
        }
      } catch (error: any) {
        console.error("Error fetching team members:", error)
        toast({
          title: "Error",
          description: "Failed to load team members",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (projectId) {
      fetchTeamMembers()
    }
  }, [projectId, supabase, toast])

  const calculateTotalCapacity = (members: TeamMember[]) => {
    const total = members.reduce((sum, member) => sum + member.capacity, 0)
    setTotalCapacity(total)
  }

  const updateMemberCapacity = (id: string, capacity: number) => {
    const updatedMembers = teamMembers.map((member) =>
      member.id === id ? { ...member, capacity: Math.max(0, capacity) } : member,
    )
    setTeamMembers(updatedMembers)
    calculateTotalCapacity(updatedMembers)
  }

  return {
    teamMembers,
    isLoading,
    totalCapacity,
    averageVelocity,
    updateMemberCapacity,
  }
}
