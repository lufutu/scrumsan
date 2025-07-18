"use client"

import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import SprintBacklog from '@/components/scrum/SprintBacklog'

// Mock data - in real implementation, you would fetch this from API
const mockSprint = {
  id: 'sprint-1',
  name: 'Sprint 1',
  goal: 'Complete user authentication and basic dashboard functionality',
  status: 'active' as const,
  startDate: '2024-01-15',
  endDate: '2024-01-29'
}

export default function SprintBacklogPage() {
  const params = useParams()
  const router = useRouter()
  const boardId = params?.boardId as string

  if (!boardId) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-6 text-center">
            <h1 className="text-2xl font-bold text-red-600">Error: Board ID not found</h1>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleBackToBacklog = () => {
    router.push(`/boards/${boardId}`)
  }

  return (
    <div className="h-full">
      <SprintBacklog
        sprint={mockSprint}
        onBackToBacklog={handleBackToBacklog}
      />
    </div>
  )
}