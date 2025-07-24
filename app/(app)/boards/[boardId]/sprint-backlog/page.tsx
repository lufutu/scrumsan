"use client"

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, ArrowLeft, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import SprintBacklogView from '@/components/scrum/SprintBacklogView'
import { AppHeader } from '@/components/dashboard/app-header'

interface Sprint {
  id: string
  name: string
  goal?: string | null
  status?: string | null
  startDate?: string | null
  endDate?: string | null
}

export default function SprintBacklogPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const boardId = params?.boardId as string
  const sprintId = searchParams?.get('sprintId')
  
  const [sprint, setSprint] = useState<Sprint | null>(null)
  const [board, setBoard] = useState<{ id: string; name: string; organizationId?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sprintId) {
      setError('Sprint ID not found in URL')
      setLoading(false)
      return
    }

    const fetchSprintAndBoard = async () => {
      try {
        // Fetch sprint data
        const sprintResponse = await fetch(`/api/sprints/${sprintId}`)
        if (!sprintResponse.ok) {
          throw new Error('Failed to fetch sprint data')
        }
        const sprintData = await sprintResponse.json()
        setSprint(sprintData)

        // Fetch board data
        const boardResponse = await fetch(`/api/boards/${boardId}`)
        if (boardResponse.ok) {
          const boardData = await boardResponse.json()
          setBoard(boardData)
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load sprint')
      } finally {
        setLoading(false)
      }
    }

    fetchSprintAndBoard()
  }, [sprintId, boardId])

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

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error || !sprint) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-6 text-center">
            <h1 className="text-2xl font-bold text-red-600">Error: {error}</h1>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleBackToBacklog = () => {
    router.push(`/boards/${boardId}`)
  }

  // Create breadcrumbs
  const breadcrumbs = [
    { label: 'Boards', href: '/boards' },
    { label: board?.name || 'Board', href: `/boards/${boardId}` },
    { label: 'Sprint Backlog', href: `/boards/${boardId}/sprint-backlog?sprintId=${sprintId}` }
  ]

  // Create header actions
  const headerActions = (
    <div className="flex items-center gap-3">
      <Badge variant="default" className="bg-green-500">
        <Play className="h-3 w-3 mr-1" />
        Active Sprint
      </Badge>
      
      <Button variant="outline" size="sm" onClick={handleBackToBacklog}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Backlog
      </Button>
    </div>
  )

  return (
    <>
      <AppHeader 
        title={sprint?.name || 'Sprint Backlog'}
        breadcrumbs={breadcrumbs}
        actions={headerActions}
      />
      <div className='container px-4 py-6'>
        <SprintBacklogView
          sprint={sprint}
          boardId={boardId}
          organizationId={board?.organizationId}
          onRefresh={() => {
            fetchSprintAndBoard()
          }}
          onBackToBacklog={handleBackToBacklog}
        />
      </div>
    </>
  )
}