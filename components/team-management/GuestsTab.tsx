'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  X, 
  MoreHorizontal,
  User,
  Mail,
  Shield,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  UserCheck,
  Layout
} from 'lucide-react'
import { EnhancedAvatar } from '@/components/ui/enhanced-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/animate-ui/radix/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { OrganizationMember } from '@/hooks/useTeamMembers'
import { useBoards } from '@/hooks/useBoards'

interface GuestsTabProps {
  members: OrganizationMember[]
  organizationId: string
  canManage: boolean
  isLoading?: boolean
  onMemberClick?: (member: OrganizationMember) => void
  onPromoteGuest?: (member: OrganizationMember, newRole: 'admin' | 'member') => void
  onRemoveGuest?: (member: OrganizationMember) => void
}

interface GuestFilters {
  search?: string
  boards?: string[]
  accessLevel?: string[]
}

type SortField = 'name' | 'email' | 'joinDate' | 'boards'
type SortDirection = 'asc' | 'desc'

interface SortConfig {
  field: SortField
  direction: SortDirection
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100]

export function GuestsTab({
  members,
  organizationId,
  canManage,
  isLoading = false,
  onMemberClick,
  onPromoteGuest,
  onRemoveGuest,
}: GuestsTabProps) {
  const [filters, setFilters] = useState<GuestFilters>({})
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'name', direction: 'asc' })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [promoteDialog, setPromoteDialog] = useState<{
    member: OrganizationMember | null
    newRole: 'admin' | 'member' | null
  }>({ member: null, newRole: null })

  // Fetch boards for filtering
  const { boards } = useBoards(organizationId)

  // Filter and sort guests
  const filteredAndSortedGuests = useMemo(() => {
    if (!members) return []

    // Filter guests
    let filtered = members.filter(member => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        const matchesName = member.user?.fullName?.toLowerCase().includes(searchTerm)
        const matchesEmail = member.user?.email?.toLowerCase().includes(searchTerm)
        
        if (!matchesName && !matchesEmail) {
          return false
        }
      }

      // Board filter - would need board membership data
      if (filters.boards?.length) {
        // TODO: Implement board membership filtering when board membership data is available
        // For now, we'll skip this filter
      }

      // Access level filter
      if (filters.accessLevel?.length) {
        // For guests, we can categorize by their permission set or default guest level
        const guestLevel = member.permissionSet?.name || 'guest'
        if (!filters.accessLevel.includes(guestLevel)) {
          return false
        }
      }

      return true
    })

    // Sort guests
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: unknown

      switch (sortConfig.field) {
        case 'name':
          aValue = a.user?.fullName || a.user?.email || 'Unknown User'
          bValue = b.user?.fullName || b.user?.email || 'Unknown User'
          break
        case 'email':
          aValue = a.user?.email || 'No email'
          bValue = b.user?.email || 'No email'
          break
        case 'joinDate':
          aValue = a.joinDate ? new Date(a.joinDate).getTime() : 0
          bValue = b.joinDate ? new Date(b.joinDate).getTime() : 0
          break
        case 'boards':
          // TODO: Implement board count sorting when board membership data is available
          aValue = 0
          bValue = 0
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [members, filters, sortConfig])

  // Paginate filtered guests
  const paginatedGuests = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredAndSortedGuests.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredAndSortedGuests, currentPage, itemsPerPage])

  // Calculate pagination info
  const totalPages = Math.ceil(filteredAndSortedGuests.length / itemsPerPage)
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, filteredAndSortedGuests.length)

  // Handle search change
  const handleSearchChange = useCallback((value: string) => {
    setFilters(prev => ({
      ...prev,
      search: value.trim() || undefined,
    }))
    setCurrentPage(1)
  }, [])

  // Handle board filter toggle
  const handleBoardToggle = useCallback((boardId: string, checked: boolean) => {
    setFilters(prev => {
      const currentBoards = prev.boards || []
      const newBoards = checked
        ? [...currentBoards, boardId]
        : currentBoards.filter(b => b !== boardId)
      
      return {
        ...prev,
        boards: newBoards.length > 0 ? newBoards : undefined,
      }
    })
    setCurrentPage(1)
  }, [])

  // Handle access level filter toggle
  const handleAccessLevelToggle = useCallback((level: string, checked: boolean) => {
    setFilters(prev => {
      const currentLevels = prev.accessLevel || []
      const newLevels = checked
        ? [...currentLevels, level]
        : currentLevels.filter(l => l !== level)
      
      return {
        ...prev,
        accessLevel: newLevels.length > 0 ? newLevels : undefined,
      }
    })
    setCurrentPage(1)
  }, [])

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setFilters({})
    setCurrentPage(1)
  }, [])

  // Handle sort change
  const handleSort = useCallback((field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
    setCurrentPage(1)
  }, [])

  // Handle page size change
  const handlePageSizeChange = useCallback((newSize: string) => {
    setItemsPerPage(parseInt(newSize))
    setCurrentPage(1)
  }, [])

  // Handle page navigation
  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }, [totalPages])

  // Handle promote guest
  const handlePromoteGuest = useCallback((member: OrganizationMember, newRole: 'admin' | 'member') => {
    setPromoteDialog({ member, newRole })
  }, [])

  // Confirm promote guest
  const confirmPromoteGuest = useCallback(() => {
    if (promoteDialog.member && promoteDialog.newRole && onPromoteGuest) {
      onPromoteGuest(promoteDialog.member, promoteDialog.newRole)
      setPromoteDialog({ member: null, newRole: null })
    }
  }, [promoteDialog, onPromoteGuest])

  // Render sort icon
  const renderSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ChevronUp className="w-4 h-4 opacity-30" />
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="w-4 h-4" />
      : <ChevronDown className="w-4 h-4" />
  }

  // Count active filters
  const activeFilterCount = [
    filters.search ? 1 : 0,
    filters.boards?.length || 0,
    filters.accessLevel?.length || 0,
  ].filter(Boolean).length

  // Get unique access levels from guests
  const accessLevels = useMemo(() => {
    const levels = new Set<string>()
    members.forEach(member => {
      levels.add(member.permissionSet?.name || 'guest')
    })
    return Array.from(levels)
  }, [members])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Guest Users</h3>
            <p className="text-sm text-muted-foreground">
              View and manage guest users with limited access to your organization.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-24" />
          </div>
          
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest User</TableHead>
                  <TableHead>Access Level</TableHead>
                  <TableHead>Board Memberships</TableHead>
                  <TableHead>Join Date</TableHead>
                  {canManage && <TableHead className="w-12"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    {canManage && <TableCell><Skeleton className="h-8 w-8" /></TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Guest Users</h3>
          <p className="text-sm text-muted-foreground">
            View and manage guest users with limited access to your organization.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 p-4 bg-muted/30 rounded-lg border">
        {/* Search Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search guests by name or email..."
              value={filters.search || ''}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Advanced Filters Button */}
          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Filter Guests</SheetTitle>
                <SheetDescription>
                  Apply filters to find specific guest users
                </SheetDescription>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                {/* Access Level Filter */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Access Level</Label>
                  <div className="space-y-2">
                    {accessLevels.map((level) => (
                      <div key={level} className="flex items-center space-x-2">
                        <Checkbox
                          id={`access-${level}`}
                          checked={filters.accessLevel?.includes(level) || false}
                          onCheckedChange={(checked) => 
                            handleAccessLevelToggle(level, checked as boolean)
                          }
                        />
                        <Label 
                          htmlFor={`access-${level}`} 
                          className="text-sm capitalize cursor-pointer"
                        >
                          {level}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Boards Filter */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Board Access</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {boards?.map((board) => (
                      <div key={board.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`board-${board.id}`}
                          checked={filters.boards?.includes(board.id) || false}
                          onCheckedChange={(checked) => 
                            handleBoardToggle(board.id, checked as boolean)
                          }
                        />
                        <Label 
                          htmlFor={`board-${board.id}`} 
                          className="text-sm cursor-pointer"
                        >
                          {board.name}
                        </Label>
                      </div>
                    ))}
                    {!boards?.length && (
                      <p className="text-sm text-muted-foreground">No boards available</p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearFilters}
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear All
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsFilterOpen(false)}
                    className="flex-1"
                  >
                    Apply Filters
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Clear Filters Button */}
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Active Filters Display */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.search && (
              <Badge variant="secondary" className="gap-1">
                Search: {filters.search}
                <X 
                  className="w-3 h-3 cursor-pointer hover:text-destructive" 
                  onClick={() => handleSearchChange('')}
                />
              </Badge>
            )}
            
            {filters.accessLevel?.map((level) => (
              <Badge key={level} variant="secondary" className="gap-1 capitalize">
                Access: {level}
                <X 
                  className="w-3 h-3 cursor-pointer hover:text-destructive" 
                  onClick={() => handleAccessLevelToggle(level, false)}
                />
              </Badge>
            ))}
            
            {filters.boards?.map((boardId) => {
              const board = boards?.find(b => b.id === boardId)
              return board ? (
                <Badge key={boardId} variant="secondary" className="gap-1">
                  Board: {board.name}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-destructive" 
                    onClick={() => handleBoardToggle(boardId, false)}
                  />
                </Badge>
              ) : null
            })}
          </div>
        )}
      </div>

      {/* Guests Table */}
      {filteredAndSortedGuests.length === 0 ? (
        <div className="rounded-lg border p-12 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            No guests found
          </h3>
          <p className="text-sm text-muted-foreground">
            {members.length === 0 
              ? "No guest users in this organization."
              : "No guest users match your current filters."
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Table */}
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('name')}
                      className="h-auto p-0 font-medium hover:bg-transparent"
                    >
                      Guest User
                      {renderSortIcon('name')}
                    </Button>
                  </TableHead>
                  <TableHead>Access Level</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('boards')}
                      className="h-auto p-0 font-medium hover:bg-transparent"
                    >
                      Board Memberships
                      {renderSortIcon('boards')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('joinDate')}
                      className="h-auto p-0 font-medium hover:bg-transparent"
                    >
                      Join Date
                      {renderSortIcon('joinDate')}
                    </Button>
                  </TableHead>
                  {canManage && <TableHead className="w-12"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedGuests.map((guest) => (
                  <TableRow 
                    key={guest.id}
                    className={onMemberClick ? "cursor-pointer hover:bg-muted/50" : ""}
                    onClick={() => onMemberClick?.(guest)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <EnhancedAvatar
                          src={guest.user.avatarUrl}
                          fallbackSeed={guest.user.email}
                          fallbackSeeds={[guest.user.fullName || '']}
                          size="lg"
                          className="w-10 h-10"
                          alt={guest.user.fullName || guest.user.email}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">
                            {guest.user.fullName || guest.user.email}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {guest.user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        <Eye className="w-3 h-3 mr-1" />
                        {guest.permissionSet?.name || 'Guest'}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Layout className="w-4 h-4" />
                        {/* TODO: Show actual board count when board membership data is available */}
                        <span>Limited access</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {guest.joinDate 
                          ? new Date(guest.joinDate).toLocaleDateString()
                          : 'Unknown'
                        }
                      </div>
                    </TableCell>
                    
                    {canManage && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onMemberClick?.(guest)}>
                              <User className="w-4 h-4 mr-2" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handlePromoteGuest(guest, 'member')}>
                              <UserCheck className="w-4 h-4 mr-2" />
                              Promote to Member
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePromoteGuest(guest, 'admin')}>
                              <Shield className="w-4 h-4 mr-2" />
                              Promote to Admin
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => onRemoveGuest?.(guest)}
                              className="text-destructive focus:text-destructive"
                            >
                              Remove Guest
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div>
                Showing {startItem} to {endItem} of {filteredAndSortedGuests.length} guests
              </div>
              
              <div className="flex items-center gap-2">
                <Label htmlFor="page-size" className="text-sm">
                  Show
                </Label>
                <Select value={itemsPerPage.toString()} onValueChange={handlePageSizeChange}>
                  <SelectTrigger id="page-size" className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEMS_PER_PAGE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                className="w-8 h-8 p-0"
              >
                <ChevronsLeft className="w-4 h-4" />
                <span className="sr-only">First page</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="w-8 h-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="sr-only">Previous page</span>
              </Button>
              
              <div className="flex items-center gap-1 text-sm">
                <span>Page</span>
                <span className="font-medium">{currentPage}</span>
                <span>of</span>
                <span className="font-medium">{totalPages}</span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="w-8 h-8 p-0"
              >
                <ChevronRight className="w-4 h-4" />
                <span className="sr-only">Next page</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                className="w-8 h-8 p-0"
              >
                <ChevronsRight className="w-4 h-4" />
                <span className="sr-only">Last page</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Promote Guest Dialog */}
      <AlertDialog 
        open={promoteDialog.member !== null} 
        onOpenChange={(open) => !open && setPromoteDialog({ member: null, newRole: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promote Guest User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to promote{' '}
              <span className="font-medium">
                {promoteDialog.member?.user.fullName || promoteDialog.member?.user.email}
              </span>{' '}
              to {promoteDialog.newRole}? This will give them full access to the organization.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPromoteGuest}>
              Promote to {promoteDialog.newRole}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}