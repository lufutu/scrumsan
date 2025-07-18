"use client"

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  LinkIcon, 
  Kanban, 
  Calendar, 
  Users, 
  Plus,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AvailableBoard {
  id: string
  name: string
  boardType: string
  color?: string
  description?: string
  createdAt: string
  _count: {
    tasks: number
    columns: number
  }
}

interface LinkedBoard {
  id: string
  board: {
    id: string
    name: string
    boardType: string
    color?: string
    description?: string
    createdAt: string
    _count: {
      tasks: number
      columns: number
    }
  }
}

interface ProjectBoardLinkerProps {
  projectId: string
  onBoardLinked?: () => void
  children?: React.ReactNode
}

export default function ProjectBoardLinker({ 
  projectId, 
  onBoardLinked,
  children 
}: ProjectBoardLinkerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [availableBoards, setAvailableBoards] = useState<AvailableBoard[]>([])
  const [linkedBoards, setLinkedBoards] = useState<LinkedBoard[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLinking, setIsLinking] = useState<string | null>(null)
  const [isUnlinking, setIsUnlinking] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen, projectId])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [availableResponse, linkedResponse] = await Promise.all([
        fetch(`/api/projects/${projectId}/available-boards`),
        fetch(`/api/projects/${projectId}/boards`)
      ])

      if (availableResponse.ok) {
        const availableData = await availableResponse.json()
        setAvailableBoards(availableData)
      }

      if (linkedResponse.ok) {
        const linkedData = await linkedResponse.json()
        setLinkedBoards(linkedData)
      }
    } catch (error) {
      console.error('Error fetching board data:', error)
      toast.error('Failed to load board data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLinkBoard = async (boardId: string) => {
    setIsLinking(boardId)
    try {
      const response = await fetch(`/api/projects/${projectId}/boards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ boardId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to link board')
      }

      toast.success('Board linked successfully')
      await fetchData()
      onBoardLinked?.()
    } catch (error: any) {
      console.error('Error linking board:', error)
      toast.error(error.message || 'Failed to link board')
    } finally {
      setIsLinking(null)
    }
  }

  const handleUnlinkBoard = async (boardId: string) => {
    setIsUnlinking(boardId)
    try {
      const response = await fetch(`/api/projects/${projectId}/boards?boardId=${boardId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to unlink board')
      }

      toast.success('Board unlinked successfully')
      await fetchData()
      onBoardLinked?.()
    } catch (error: any) {
      console.error('Error unlinking board:', error)
      toast.error(error.message || 'Failed to unlink board')
    } finally {
      setIsUnlinking(null)
    }
  }

  const getBoardIcon = (boardType: string) => {
    return boardType === 'scrum' ? Calendar : Kanban
  }

  const getBoardTypeLabel = (boardType: string) => {
    return boardType === 'scrum' ? 'Scrum' : 'Kanban'
  }

  const getBoardTypeColor = (boardType: string) => {
    return boardType === 'scrum' 
      ? 'bg-green-100 text-green-700 border-green-200' 
      : 'bg-blue-100 text-blue-700 border-blue-200'
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline">
            <LinkIcon className="h-4 w-4 mr-2" />
            Manage Board Links
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Manage Project Board Links</DialogTitle>
          <DialogDescription>
            Link or unlink boards to this project for team coordination and overview.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading boards...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Linked Boards */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                Linked Boards ({linkedBoards.length})
              </h3>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {linkedBoards.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="p-6 text-center">
                        <LinkIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No boards linked yet</p>
                      </CardContent>
                    </Card>
                  ) : (
                    linkedBoards.map((link) => {
                      const board = link.board
                      const BoardIcon = getBoardIcon(board.boardType)
                      
                      return (
                        <Card key={link.id} className="border-green-200 bg-green-50/50">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-sm"
                                  style={{ backgroundColor: board.color || '#3B82F6' }}
                                />
                                <CardTitle className="text-sm">{board.name}</CardTitle>
                              </div>
                              <Badge className={cn('border', getBoardTypeColor(board.boardType))}>
                                {getBoardTypeLabel(board.boardType)}
                              </Badge>
                            </div>
                            {board.description && (
                              <CardDescription className="text-xs">
                                {board.description}
                              </CardDescription>
                            )}
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex items-center justify-between">
                              <div className="flex gap-4 text-xs text-muted-foreground">
                                <span>{board._count.tasks} tasks</span>
                                <span>{board._count.columns} columns</span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUnlinkBoard(board.id)}
                                disabled={isUnlinking === board.id}
                                className="border-red-200 text-red-700 hover:bg-red-50"
                              >
                                {isUnlinking === board.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  'Unlink'
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Available Boards */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Available Boards ({availableBoards.length})
              </h3>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {availableBoards.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="p-6 text-center">
                        <Kanban className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">All boards are already linked</p>
                      </CardContent>
                    </Card>
                  ) : (
                    availableBoards.map((board) => {
                      const BoardIcon = getBoardIcon(board.boardType)
                      
                      return (
                        <Card key={board.id} className="hover:shadow-md transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-sm"
                                  style={{ backgroundColor: board.color || '#3B82F6' }}
                                />
                                <CardTitle className="text-sm">{board.name}</CardTitle>
                              </div>
                              <div className="flex gap-1">
                                <Badge className={cn('border', getBoardTypeColor(board.boardType))}>
                                  {getBoardTypeLabel(board.boardType)}
                                </Badge>
                              </div>
                            </div>
                            {board.description && (
                              <CardDescription className="text-xs">
                                {board.description}
                              </CardDescription>
                            )}
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex items-center justify-between">
                              <div className="flex gap-4 text-xs text-muted-foreground">
                                <span>{board._count.tasks} tasks</span>
                                <span>{board._count.columns} columns</span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleLinkBoard(board.id)}
                                disabled={isLinking === board.id}
                              >
                                {isLinking === board.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  'Link'
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}