"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/animate-ui/radix/tabs'
import { 
  Plus, 
  Play, 
  Square, 
  MoreHorizontal, 
  Table,
  LayoutGrid,
  Search,
  Filter,
  Eye,
  EyeOff
} from 'lucide-react'
import ProductBacklog from './ProductBacklog.tsx.bak'
// import SprintView from './SprintView' // TODO: Create SprintView component
import SprintBacklog from './SprintBacklog'
import { useBoards } from '@/hooks/useBoards'
import { useSprints } from '@/hooks/useSprints'
import { useTasks } from '@/hooks/useTasks'

interface ScrumBoardProps {
  boardId: string
  organizationId?: string
}

export default function ScrumBoard({ boardId, organizationId }: ScrumBoardProps) {
  const [activeTab, setActiveTab] = useState('backlog')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [showFinishedSprints, setShowFinishedSprints] = useState(false)
  const [selectedSprint, setSelectedSprint] = useState<string | null>(null)

  const { boards, isLoading: boardLoading } = useBoards(organizationId, undefined, true)
  const currentBoard = Array.isArray(boards) ? boards.find(b => b.id === boardId) : boards
  
  const { 
    sprints, 
    isLoading: sprintsLoading, 
    createSprint, 
    startSprint, 
    finishSprint,
    mutate: mutateSprints 
  } = useSprints(boardId)
  
  const { 
    tasks, 
    isLoading: tasksLoading, 
    mutate: mutateTasks 
  } = useTasks(undefined, boardId, organizationId)

  // Filter sprints by status
  const planningSprints = sprints?.filter(s => s.status === 'planning') || []
  const activeSprints = sprints?.filter(s => s.status === 'active') || []
  const completedSprints = sprints?.filter(s => s.status === 'completed') || []

  // Get backlog tasks (not assigned to any sprint)
  const backlogTasks = tasks?.filter(task => 
    !sprints?.some(sprint => 
      sprint.sprintTasks?.some(st => st.task.id === task.id)
    )
  ) || []

  const handleCreateSprint = async (data: { name: string; goal?: string; duration?: number }) => {
    try {
      await createSprint({
        name: data.name,
        boardId: boardId,
        status: 'planning',
        goal: data.goal
      })
    } catch (error) {
      console.error('Failed to create sprint:', error)
    }
  }

  const handleStartSprint = async (sprintId: string, data?: { name?: string; goal?: string; startDate?: string; endDate?: string }) => {
    const startDate = data?.startDate || new Date().toISOString().split('T')[0]
    const endDate = data?.endDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    try {
      await startSprint(sprintId, startDate, endDate, data?.name, data?.goal)
      setSelectedSprint(sprintId)
      setActiveTab('sprint')
    } catch (error) {
      console.error('Failed to start sprint:', error)
    }
  }

  const handleFinishSprint = async (sprintId: string) => {
    try {
      await finishSprint(sprintId)
    } catch (error) {
      console.error('Failed to finish sprint:', error)
    }
  }

  const refreshData = () => {
    mutateSprints()
    mutateTasks()
  }
  
  const handleMoveTask = async (taskId: string, fromLocation: string, toLocation: string) => {
    try {
      // API call to move task between sprint and backlog
      const response = await fetch(`/api/tasks/${taskId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fromSprintId: fromLocation === 'backlog' ? null : fromLocation,
          toSprintId: toLocation === 'backlog' ? null : toLocation
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to move task')
      }
      
      refreshData()
    } catch (error) {
      console.error('Failed to move task:', error)
    }
  }

  if (boardLoading || sprintsLoading || tasksLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading Scrum Board...</p>
        </div>
      </div>
    )
  }

  if (!currentBoard) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Board not found</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{currentBoard.name}</h1>
          <p className="text-muted-foreground">Scrum Board - Product Backlog & Sprints</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              <Table className="h-4 w-4" />
            </Button>
          </div>

          {/* Show/Hide Finished Sprints */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFinishedSprints(!showFinishedSprints)}
          >
            {showFinishedSprints ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showFinishedSprints ? 'Hide' : 'Show'} Finished Sprints
          </Button>

          {/* Search & Filter */}
          <Button variant="outline" size="sm">
            <Search className="h-4 w-4" />
          </Button>
          
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="backlog">Product Backlog</TabsTrigger>
          <TabsTrigger value="sprint" disabled={activeSprints.length === 0}>
            Sprint Backlog {activeSprints.length > 0 && `(${activeSprints.length} active)`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="backlog" className="flex-1 mt-6">
          <ProductBacklog
            boardId={boardId}
            organizationId={organizationId}
            backlogTasks={backlogTasks}
            planningSprints={planningSprints}
            activeSprints={activeSprints}
            completedSprints={showFinishedSprints ? completedSprints : []}
            viewMode={viewMode}
            onCreateSprint={handleCreateSprint}
            onStartSprint={handleStartSprint}
            onFinishSprint={handleFinishSprint}
            onRefresh={refreshData}
            onMoveTask={handleMoveTask}
          />
        </TabsContent>

        <TabsContent value="sprint" className="flex-1 mt-6">
          {activeSprints.length > 0 ? (
            <SprintBacklog
              sprint={activeSprints[0]} // Show first active sprint
              boardId={boardId}
              organizationId={organizationId}
              onRefresh={refreshData}
              onBackToBacklog={() => setActiveTab('backlog')}
              onFinishSprint={handleFinishSprint}
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No active sprints</p>
              <Button onClick={() => setActiveTab('backlog')}>
                Go to Product Backlog to start a sprint
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}