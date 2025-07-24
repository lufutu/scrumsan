"use client"

import { useState, useEffect } from "react"
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
  const { toast } = useToast()

  useEffect(() => {
    const fetchTeamMembers = async () => {
      setIsLoading(true)
      try {
        // Fetch team members for this project using Prisma API
        const membersResponse = await fetch(`/api/projects/${projectId}/members`)
        if (!membersResponse.ok) {
          console.error('Failed to fetch team members:', membersResponse.status, membersResponse.statusText)
          throw new Error('Failed to fetch team members')
        }
        
        const members = await membersResponse.json()

        // Format team members with default capacity
        const formattedMembers = members.map((member: any) => ({
          id: member.user.id,
          name: member.user.fullName || member.user.email || "Unnamed User",
          capacity: 8, // Default capacity in story points
        }))

        setTeamMembers(formattedMembers)
        calculateTotalCapacity(formattedMembers)

        // Fetch completed sprints for velocity calculation
        const sprintsResponse = await fetch(`/api/projects/${projectId}/sprints`)
        if (!sprintsResponse.ok) {
          console.error('Failed to fetch sprints:', sprintsResponse.status, sprintsResponse.statusText)
          throw new Error('Failed to fetch sprints')
        }

        const allSprints = await sprintsResponse.json()
        const completedSprints = allSprints.filter((sprint: any) => 
          sprint.status === 'completed'
        ).slice(0, 5) // Get last 5 completed sprints

        if (completedSprints.length > 0) {
          // For each sprint, get the completed story points
          const sprintData = await Promise.all(
            completedSprints.map(async (sprint: any) => {
              const tasksResponse = await fetch(`/api/sprints/${sprint.id}/tasks`)
              if (!tasksResponse.ok) return 0

              const tasks = await tasksResponse.json()
              
              // Calculate completed story points (tasks in "done" columns)
              const completedPoints = tasks
                .filter((task: any) => 
                  task.column?.name?.toLowerCase().includes('done') || 
                  task.status === 'done'
                )
                .reduce((sum: number, task: any) => sum + (task.storyPoints || 0), 0)

              return completedPoints
            }),
          )

          // Calculate average velocity
          const totalPoints = sprintData.reduce((sum, points) => sum + points, 0)
          const avgVelocity = completedSprints.length > 0 ? Math.round(totalPoints / completedSprints.length) : null
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
  }, [projectId, toast])

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
