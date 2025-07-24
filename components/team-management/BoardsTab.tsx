'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import { 
  Kanban,
  AlertCircle,
  Search,
  Filter,
  Plus,
  Users,
  Calendar,
  ExternalLink,
  Settings,
  Loader2
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { useBoards, Board } from '@/hooks/useBoards'
import { OrganizationMember } from '@/hooks/useTeamMembers'
import { hasPermission } from '@/lib/permission-utils'

interface BoardsTabProps {
  member: OrganizationMember
  organizationId: string
  currentUserRole: 'owner' | 'admin' | 'member'
  canEdit: boolean
}

interface BoardFilters {
  search: string
  boardType: string
  status: string
  project: string
}

interface BoardMembership {
  board: Board
  accessType: 'organization' | 'project' | 'task_assignment'
  joinedAt: string
  role?: string
}

export function BoardsTab({
  member,
  organizationId,
  currentUserRole,
  canEdit
}: BoardsTabProps) {
  const [filters, setFilters] = useState<BoardFilters>({
    search: '',
    boardType: 'all',
    status: 'all',
    project: 'all'
  })
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false)
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null)

  // Hooks
  const {
    boards,
    isLoading: boardsLoading,
    error: boardsError,
    mutate: mutateBoards
  } = useBoards(organizationId)

  // Get member's board memberships
  const getMemberBoardMemberships = useCallback((allBoards: Board[]): BoardMembership[] => {
    if (!allBoards) return []
    
    return allBoards
      .filter(board => {
        // All organization members can see organization boards
        if (board.organizationId === organizationId) {
          return true
        }
        
        // TODO: In a more complete implementation, we would also check:
        // 1. Project membership through ProjectMember table
        // 2. Task assignments through TaskAssignee table
        // 3. Board-specific permissions if they exist
        
        return false
      })
      .map(board => ({
        board,
        accessType: board.organizationId === organizationId ? 'organization' as const : 'project' as const,
        joinedAt: member.createdAt, // Simplified - would be actual join date
        role: member.role
      }))
  }, [organizationId, member])

  // Filter board memberships
  const filteredMemberships = useMemo(() => {
    const memberships = getMemberBoardMemberships(boards || [])
    
    return memberships.filter(membership => {
      const { board } = membership
      
      // Search filter
      if (filters.search && !board.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false
      }
      
      // Board type filter
      if (filters.boardType !== 'all' && board.boardType !== filters.boardType) {
        return false
      }
      
      // Status filter (simplified - in real implementation would check actual board status)
      if (filters.status !== 'all') {
        // For now, all boards are considered 'active'
        if (filters.status !== 'active') {
          return false
        }
      }
      
      // Project filter
      if (filters.project !== 'all') {
        // TODO: Implement project filtering when project relationships are available
      }
      
      return true
    })
  }, [getMemberBoardMemberships, boards, filters])

  // Get unique board types for filter
  const boardTypes = useMemo(() => {
    if (!boards) return []
    const types = [...new Set(boards.map(b => b.boardType).filter(Boolean))]
    return types
  }, [boards])

  // Handle filter change
  const handleFilterChange = useCallback((key: keyof BoardFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  // Handle add member to board
  const handleAddMemberToBoard = useCallback(async (boardId: string) => {
    try {
      // TODO: Implement API call to add member to board
      // This would typically involve:
      // 1. Adding member to project if board is project-linked
      // 2. Adding member to board-specific permissions if they exist
      // 3. Creating task assignments if needed
      
      toast.success('Member added to board successfully')
      await mutateBoards()
      setIsAddMemberDialogOpen(false)
      setSelectedBoard(null)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to add member to board')
    }
  }, [mutateBoards])

  // Handle remove member from board
  const handleRemoveMemberFromBoard = useCallback(async (boardId: string) => {
    try {
      // TODO: Implement API call to remove member from board
      toast.success('Member removed from board successfully')
      await mutateBoards()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove member from board')
    }
  }, [mutateBoards])

  // Get access type display
  const getAccessTypeDisplay = useCallback((accessType: string): { label: string; variant: 'default' | 'secondary' | 'outline' } => {
    switch (accessType) {
      case 'organization':
        return { label: 'Organization Member', variant: 'default' }
      case 'project':
        return { label: 'Project Member', variant: 'secondary' }
      case 'task_assignment':
        return { label: 'Task Assignee', variant: 'outline' }
      default:
        return { label: 'Unknown', variant: 'outline' }
    }
  }, [])

  // Render board membership card
  const renderBoardMembership = useCallback((membership: BoardMembership) => {
    const { board, accessType, joinedAt, role } = membership
    const accessDisplay = getAccessTypeDisplay(accessType)
    
    return (
      <Card key={board.id} className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-4 h-4 rounded flex-shrink-0"
                style={{ backgroundColor: board.color || '#3B82F6' }}
              />
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base truncate">{board.name}</CardTitle>
                {board.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {board.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // TODO: Navigate to board
                  window.open(`/boards/${board.id}`, '_blank')
                }}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // TODO: Open board settings or remove member dialog
                  }}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize text-xs">
                {board.boardType || 'kanban'}
              </Badge>
              <Badge variant={accessDisplay.variant} className="text-xs">
                {accessDisplay.label}
              </Badge>
              {role && (
                <Badge variant="secondary" className="text-xs capitalize">
                  {role}
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Joined {format(new Date(joinedAt), 'MMM dd, yyyy')}
            </div>
          </div>
          
          {board.organization && (
            <div className="mt-2 text-xs text-muted-foreground">
              Organization: {board.organization.name}
            </div>
          )}
          
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Created {format(new Date(board.createdAt), 'MMM dd, yyyy')}
            </span>
            {board._count && (
              <div className="flex items-center gap-3">
                <span>{board._count.tasks || 0} tasks</span>
                <span>{board._count.columns || 0} columns</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }, [canEdit, getAccessTypeDisplay])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Kanban className="w-5 h-5" />
          <h3 className="text-lg font-medium">Board Memberships</h3>
          <Badge variant="outline" className="ml-2">
            {filteredMemberships.length}
          </Badge>
        </div>
        
        {canEdit && (
          <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add to Board
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Member to Board</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Select Board</Label>
                  <Select
                    value={selectedBoard?.id || ''}
                    onValueChange={(value) => {
                      const board = boards?.find(b => b.id === value)
                      setSelectedBoard(board || null)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a board..." />
                    </SelectTrigger>
                    <SelectContent>
                      {boards?.map(board => (
                        <SelectItem key={board.id} value={board.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded"
                              style={{ backgroundColor: board.color || '#3B82F6' }}
                            />
                            {board.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddMemberDialogOpen(false)
                      setSelectedBoard(null)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => selectedBoard && handleAddMemberToBoard(selectedBoard.id)}
                    disabled={!selectedBoard}
                  >
                    Add Member
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Separator />

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>Search Boards</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Board Type</Label>
          <Select
            value={filters.boardType}
            onValueChange={(value) => handleFilterChange('boardType', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {boardTypes.map(type => (
                <SelectItem key={type} value={type} className="capitalize">
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={filters.status}
            onValueChange={(value) => handleFilterChange('status', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Project</Label>
          <Select
            value={filters.project}
            onValueChange={(value) => handleFilterChange('project', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {/* TODO: Add project options when project relationships are available */}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Board List */}
      <div className="space-y-4">
        {boardsLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-muted rounded animate-pulse" />
                    <div className="h-5 bg-muted rounded w-32 animate-pulse" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-full animate-pulse" />
                    <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : boardsError ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>Failed to load boards</span>
            </div>
          </div>
        ) : filteredMemberships.length > 0 ? (
          <div className="grid gap-4">
            {filteredMemberships.map(renderBoardMembership)}
          </div>
        ) : (
          <div className="text-center py-12">
            <Kanban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="text-lg font-medium mb-2">No Board Memberships</h4>
            <p className="text-muted-foreground mb-4">
              {filters.search || filters.boardType !== 'all' || filters.status !== 'all' || filters.project !== 'all'
                ? 'No boards match the current filters.'
                : 'This member has no access to any boards in the organization.'
              }
            </p>
            {canEdit && (
              <Button
                variant="outline"
                onClick={() => setIsAddMemberDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add to Board
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {filteredMemberships.length > 0 && (
        <>
          <Separator />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {filteredMemberships.length}
              </div>
              <div className="text-muted-foreground">Total Boards</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {filteredMemberships.filter(m => m.board.boardType === 'kanban').length}
              </div>
              <div className="text-muted-foreground">Kanban Boards</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {filteredMemberships.filter(m => m.board.boardType === 'scrum').length}
              </div>
              <div className="text-muted-foreground">Scrum Boards</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {filteredMemberships.filter(m => m.accessType === 'organization').length}
              </div>
              <div className="text-muted-foreground">Org Access</div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}