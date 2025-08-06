"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Trash2, RefreshCw, Eye, AlertTriangle, Wrench } from 'lucide-react'
import { toast } from 'sonner'

interface TaskDebugInfo {
  id: string
  title: string
  itemCode: string
  boardId: string
  sprintId: string | null
  columnId: string | null
  sprintColumnId: string | null
  labels: string[] | null
  createdAt: string
  category: string
}

interface TasksSummary {
  total: number
  inBacklog: number
  inSprint: number
  inSprintColumn: number
  inBoardColumn: number
  orphaned: number
  followUp: number
}

interface BoardTasksDebugProps {
  boardId: string
  onRefresh?: () => void
}

export function BoardTasksDebug({ boardId, onRefresh }: BoardTasksDebugProps) {
  const [tasks, setTasks] = useState<TaskDebugInfo[]>([])
  const [summary, setSummary] = useState<TasksSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  const fetchDebugInfo = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/boards/${boardId}/tasks/debug`)
      if (!response.ok) throw new Error('Failed to fetch debug info')
      
      const data = await response.json()
      setTasks(data.tasks)
      setSummary(data.summary)
    } catch (error) {
      console.error('Error fetching debug info:', error)
      toast.error('Failed to fetch debug information')
    } finally {
      setIsLoading(false)
    }
  }

  const fixOrphanedTasks = async () => {
    try {
      const response = await fetch(`/api/boards/${boardId}/tasks/fix-orphaned`, {
        method: 'POST'
      })
      
      if (!response.ok) throw new Error('Failed to fix orphaned tasks')
      
      const data = await response.json()
      toast.success(data.message)
      
      // Refresh the debug info and parent component
      await fetchDebugInfo()
      onRefresh?.()
    } catch (error) {
      console.error('Error fixing orphaned tasks:', error)
      toast.error('Failed to fix orphaned tasks')
    }
  }

  const cleanupAllTasks = async () => {
    if (!confirm('Are you sure you want to delete ALL tasks from this board? This cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/boards/${boardId}/tasks/debug`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Failed to cleanup tasks')
      
      const data = await response.json()
      toast.success(data.message)
      
      // Refresh the debug info and parent component
      await fetchDebugInfo()
      onRefresh?.()
    } catch (error) {
      console.error('Error cleaning up tasks:', error)
      toast.error('Failed to cleanup tasks')
    }
  }

  useEffect(() => {
    if (isVisible) {
      fetchDebugInfo()
    }
  }, [isVisible, boardId])

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'backlog': return 'bg-blue-100 text-blue-800'
      case 'sprint-backlog': return 'bg-green-100 text-green-800'
      case 'sprint-column': return 'bg-purple-100 text-purple-800'
      case 'board-column': return 'bg-orange-100 text-orange-800'
      case 'followup': return 'bg-yellow-100 text-yellow-800'
      case 'orphaned': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!isVisible) {
    return (
      <div className="mb-4">
        <Button 
          variant="outline" 
          onClick={() => setIsVisible(true)}
          className="text-xs"
        >
          <Eye className="h-3 w-3 mr-1" />
          Debug Hidden Tasks
        </Button>
      </div>
    )
  }

  return (
    <Card className="mb-4 border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-orange-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Board Tasks Debug Information
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchDebugInfo}
              disabled={isLoading}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsVisible(false)}
            >
              Hide
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary && (
          <>
            <Alert>
              <AlertDescription>
                <strong>Found {summary.total} total tasks in database</strong>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  <div>Backlog: {summary.inBacklog}</div>
                  <div>Sprint Backlog: {summary.inSprint}</div>
                  <div>Sprint Columns: {summary.inSprintColumn}</div>
                  <div>Board Columns: {summary.inBoardColumn}</div>
                  <div>Follow-up: {summary.followUp}</div>
                  <div className="text-red-600 font-semibold">Orphaned: {summary.orphaned}</div>
                </div>
              </AlertDescription>
            </Alert>

            {summary.total > 0 && (
              <div className="flex gap-2">
                {summary.orphaned > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={fixOrphanedTasks}
                    className="text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                  >
                    <Wrench className="h-3 w-3 mr-1" />
                    Fix {summary.orphaned} Orphaned Tasks
                  </Button>
                )}
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={cleanupAllTasks}
                  className="text-xs"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete All {summary.total} Tasks
                </Button>
              </div>
            )}
          </>
        )}

        {tasks.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <h4 className="font-medium text-sm">All Tasks:</h4>
            {tasks.map((task) => (
              <div 
                key={task.id} 
                className="p-2 bg-white rounded border text-xs flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="font-medium">{task.title}</div>
                  <div className="text-gray-500">
                    ID: {task.id.slice(0, 8)}... | 
                    Code: {task.itemCode} | 
                    Created: {new Date(task.createdAt).toLocaleDateString()}
                  </div>
                  <div className="text-gray-400 text-xs mt-1">
                    Sprint: {task.sprintId?.slice(0, 8) || 'none'} | 
                    Column: {task.columnId?.slice(0, 8) || 'none'} | 
                    SprintCol: {task.sprintColumnId?.slice(0, 8) || 'none'}
                  </div>
                </div>
                <Badge className={getCategoryColor(task.category)}>
                  {task.category}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}