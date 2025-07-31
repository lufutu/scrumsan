'use client'

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  User,
  Mail,
  Calendar,
  Clock,
  Briefcase,
  Shield,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  Download,
  Edit,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { EnhancedAvatar } from '@/components/ui/enhanced-avatar'
import {
  getMemberDisplayName,
  getMemberEmail,
  getMemberAvatarUrl,
  getMemberInitials
} from '@/lib/member-utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { MemberTableSkeleton } from '@/components/ui/skeleton'
import { ComponentErrorBoundary } from '@/components/ui/error-boundary'
import { VirtualTable } from '@/components/ui/virtual-scroll'
import { OrganizationMember, PendingInvitation } from '@/hooks/useTeamMembers'
import { useCustomRoles } from '@/hooks/useCustomRoles'
import { toast } from 'sonner'

interface MemberTableProps {
  members: OrganizationMember[]
  pendingInvitations?: PendingInvitation[]
  isLoading?: boolean
  onMemberClick?: (member: OrganizationMember) => void
  onMemberEdit?: (member: OrganizationMember) => void
  onMemberRemove?: (member: OrganizationMember) => void
  onResendInvitation?: (invitationId: string) => void
  onCancelInvitation?: (invitationId: string) => void
  isResendingInvitation?: boolean
  isCancellingInvitation?: boolean
  canManage?: boolean
  organizationId: string
  enableVirtualScrolling?: boolean
  containerHeight?: number
  // Admin functions
  onAvatarReset?: (memberId: string) => void
  onBulkAvatarReset?: (memberIds: string[]) => void
}

const MEMBER_ROW_HEIGHT = 80 // Height of each member row in pixels
const VIRTUAL_SCROLL_THRESHOLD = 100 // Enable virtual scrolling for lists larger than this

type SortField = 'name' | 'role' | 'joinDate' | 'totalHours' | 'availableHours' | 'engagements'
type SortDirection = 'asc' | 'desc'

interface SortConfig {
  field: SortField
  direction: SortDirection
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100]

export function MemberTable({
  members,
  pendingInvitations = [],
  isLoading = false,
  onMemberClick,
  onMemberEdit,
  onMemberRemove,
  onResendInvitation,
  onCancelInvitation,
  isResendingInvitation = false,
  isCancellingInvitation = false,
  canManage = false,
  organizationId,
  onAvatarReset,
  onBulkAvatarReset,
}: MemberTableProps) {
  return (
    <ComponentErrorBoundary>
      <MemberTableContent
        members={members}
        pendingInvitations={pendingInvitations}
        isLoading={isLoading}
        onMemberClick={onMemberClick}
        onMemberEdit={onMemberEdit}
        onMemberRemove={onMemberRemove}
        onResendInvitation={onResendInvitation}
        onCancelInvitation={onCancelInvitation}
        isResendingInvitation={isResendingInvitation}
        isCancellingInvitation={isCancellingInvitation}
        canManage={canManage}
        organizationId={organizationId}
        onAvatarReset={onAvatarReset}
        onBulkAvatarReset={onBulkAvatarReset}
      />
    </ComponentErrorBoundary>
  )
}

function MemberTableContent({
  members,
  pendingInvitations = [],
  isLoading = false,
  onMemberClick,
  onMemberEdit,
  onMemberRemove,
  onResendInvitation,
  onCancelInvitation,
  isResendingInvitation = false,
  isCancellingInvitation = false,
  canManage = false,
  organizationId,
  enableVirtualScrolling = false,
  containerHeight = 600,
  onAvatarReset,
  onBulkAvatarReset,
}: MemberTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'name', direction: 'asc' })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [isProcessingBulk, setIsProcessingBulk] = useState(false)
  const tableContainerRef = useRef<HTMLDivElement>(null)

  // Determine if we should use virtual scrolling
  const shouldUseVirtualScrolling = enableVirtualScrolling &&
    members &&
    members.length > VIRTUAL_SCROLL_THRESHOLD

  // Fetch custom roles for display
  const { roles: customRoles } = useCustomRoles(organizationId)

  // Calculate availability for a member
  const calculateAvailability = useCallback((member: OrganizationMember): number => {
    const totalHours = member.workingHoursPerWeek
    const engagedHours = member.engagements
      .filter(e => e.isActive)
      .reduce((sum, e) => sum + e.hoursPerWeek, 0)
    return Math.max(0, totalHours - engagedHours)
  }, [])

  // Get role display info (including custom roles)
  const getRoleInfo = useCallback((member: OrganizationMember) => {
    if (member.permissionSet) {
      return {
        name: member.permissionSet.name,
        color: '#6B7280', // Default color for permission sets
        isCustom: true
      }
    }

    // Check if member has a custom role in job title
    const customRole = customRoles?.find(role =>
      member.jobTitle?.toLowerCase().includes(role.name.toLowerCase())
    )

    if (customRole) {
      return {
        name: customRole.name,
        color: customRole.color,
        isCustom: true
      }
    }

    // Default role colors
    const roleColors = {
      owner: '#EF4444',
      admin: '#F59E0B',
      member: '#10B981'
    }

    return {
      name: member.role,
      color: roleColors[member.role] || '#6B7280',
      isCustom: false
    }
  }, [customRoles])

  // Create a combined list of members and pending invitations
  type CombinedItem = OrganizationMember | (PendingInvitation & { type: 'invitation' })

  const combinedItems = useMemo(() => {
    const items: CombinedItem[] = [...members]

    // Add pending invitations with a type marker
    pendingInvitations.forEach(invitation => {
      items.push({ ...invitation, type: 'invitation' as const })
    })

    return items
  }, [members, pendingInvitations])

  // Sort combined items based on current sort configuration
  const sortedMembers = useMemo(() => {
    if (!combinedItems) return []

    return [...combinedItems].sort((a, b) => {
      let aValue: unknown
      let bValue: unknown

      // Handle invitations vs members
      const isAInvitation = 'type' in a && a.type === 'invitation'
      const isBInvitation = 'type' in b && b.type === 'invitation'

      switch (sortConfig.field) {
        case 'name':
          aValue = isAInvitation ? a.email : getMemberDisplayName(a as OrganizationMember)
          bValue = isBInvitation ? b.email : getMemberDisplayName(b as OrganizationMember)
          break
        case 'role':
          aValue = isAInvitation ? a.role : getRoleInfo(a as OrganizationMember).name
          bValue = isBInvitation ? b.role : getRoleInfo(b as OrganizationMember).name
          break
        case 'joinDate':
          aValue = isAInvitation ? new Date(a.createdAt).getTime() : (a as OrganizationMember).joinDate ? new Date((a as OrganizationMember).joinDate!).getTime() : 0
          bValue = isBInvitation ? new Date(b.createdAt).getTime() : (b as OrganizationMember).joinDate ? new Date((b as OrganizationMember).joinDate!).getTime() : 0
          break
        case 'totalHours':
          aValue = isAInvitation ? a.workingHoursPerWeek : (a as OrganizationMember).workingHoursPerWeek
          bValue = isBInvitation ? b.workingHoursPerWeek : (b as OrganizationMember).workingHoursPerWeek
          break
        case 'availableHours':
          aValue = isAInvitation ? a.workingHoursPerWeek : calculateAvailability(a as OrganizationMember)
          bValue = isBInvitation ? b.workingHoursPerWeek : calculateAvailability(b as OrganizationMember)
          break
        case 'engagements':
          aValue = isAInvitation ? 0 : (a as OrganizationMember).engagements.filter(e => e.isActive).length
          bValue = isBInvitation ? 0 : (b as OrganizationMember).engagements.filter(e => e.isActive).length
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [combinedItems, sortConfig, getRoleInfo, calculateAvailability])

  // Paginate sorted members (only if not using virtual scrolling)
  const paginatedMembers = useMemo(() => {
    if (shouldUseVirtualScrolling) {
      return sortedMembers // Return all members for virtual scrolling
    }
    const startIndex = (currentPage - 1) * itemsPerPage
    return sortedMembers.slice(startIndex, startIndex + itemsPerPage)
  }, [sortedMembers, currentPage, itemsPerPage, shouldUseVirtualScrolling])

  // Calculate pagination info (only if not using virtual scrolling)
  const totalPages = Math.ceil(sortedMembers.length / itemsPerPage)
  const startItem = shouldUseVirtualScrolling ? 1 : (currentPage - 1) * itemsPerPage + 1
  const endItem = shouldUseVirtualScrolling ? sortedMembers.length : Math.min(currentPage * itemsPerPage, sortedMembers.length)

  // Handle sort change
  const handleSort = useCallback((field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
    setCurrentPage(1) // Reset to first page when sorting
  }, [])

  // Handle page size change
  const handlePageSizeChange = useCallback((newSize: string) => {
    setItemsPerPage(parseInt(newSize))
    setCurrentPage(1) // Reset to first page
  }, [])

  // Handle page navigation
  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }, [totalPages])

  // Handle member selection
  const handleMemberSelect = useCallback((memberId: string, selected: boolean) => {
    setSelectedMembers(prev => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(memberId)
      } else {
        newSet.delete(memberId)
      }
      return newSet
    })
  }, [])

  // Handle select all
  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      const memberIds = members.filter(m => m).map(m => m.id)
      setSelectedMembers(new Set(memberIds))
    } else {
      setSelectedMembers(new Set())
    }
  }, [members])

  // Handle bulk avatar reset
  const handleBulkAvatarReset = useCallback(async () => {
    if (selectedMembers.size === 0) {
      toast.error('Please select at least one member')
      return
    }

    setIsProcessingBulk(true)
    try {
      const memberIds = Array.from(selectedMembers)
      if (onBulkAvatarReset) {
        await onBulkAvatarReset(memberIds)
        toast.success(`Reset avatars for ${memberIds.length} members`)
      }
      setSelectedMembers(new Set())
    } catch (error) {
      console.error('Bulk avatar reset failed:', error)
      toast.error('Failed to reset avatars')
    } finally {
      setIsProcessingBulk(false)
    }
  }, [selectedMembers, onBulkAvatarReset])

  // Export profiles to CSV
  const handleExportProfiles = useCallback(async () => {
    if (selectedMembers.size === 0) {
      toast.error('Please select at least one member')
      return
    }

    const selectedMemberData = members.filter(m => selectedMembers.has(m.id))
    
    const csvData = selectedMemberData.map(member => ({
      'Full Name': member.user.fullName || '',
      'Email': member.user.email || '',
      'Role': member.role,
      'Job Title': member.jobTitle || '',
      'Join Date': member.joinDate ? new Date(member.joinDate).toLocaleDateString() : '',
      'Working Hours': member.workingHoursPerWeek || '',
      'Has Avatar': member.user.avatarUrl ? 'Yes' : 'No',
      'Created At': new Date(member.createdAt).toLocaleDateString()
    }))
    
    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `member-profiles-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success(`Exported profiles for ${selectedMemberData.length} members`)
    setSelectedMembers(new Set())
  }, [selectedMembers, members])

  // Handle individual avatar reset
  const handleAvatarReset = useCallback(async (memberId: string) => {
    try {
      if (onAvatarReset) {
        await onAvatarReset(memberId)
        toast.success('Avatar reset successfully')
      }
    } catch (error) {
      console.error('Avatar reset failed:', error)
      toast.error('Failed to reset avatar')
    }
  }, [onAvatarReset])

  // Render sort icon
  const renderSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ChevronUp className="w-4 h-4 opacity-30" />
    }
    return sortConfig.direction === 'asc'
      ? <ChevronUp className="w-4 h-4" />
      : <ChevronDown className="w-4 h-4" />
  }

  // Format time-off display
  const formatTimeOff = (member: OrganizationMember) => {
    const activeTimeOff = member.timeOffEntries.filter(entry => {
      const now = new Date()
      const startDate = new Date(entry.startDate)
      const endDate = new Date(entry.endDate)
      return startDate <= now && now <= endDate && entry.status === 'approved'
    })

    if (activeTimeOff.length === 0) return null

    return activeTimeOff.map(entry => (
      <Badge key={entry.id} variant="outline" className="text-xs">
        {entry.type.replace('_', ' ')}
      </Badge>
    ))
  }



  // Render invitation row
  const renderInvitationRow = useCallback((invitation: PendingInvitation & { type: 'invitation' }, index: number) => {
    const isExpired = new Date(invitation.expiresAt) < new Date()

    return (
      <TableRow key={`invitation-${invitation.id}`} className="bg-amber-50/50 border-l-4 border-l-amber-400">
        <TableCell>
          <div className="flex items-center gap-2 sm:gap-3">
            <EnhancedAvatar
              fallbackSeed={invitation.email}
              size="md"
              className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 bg-amber-100"
            />
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate text-sm sm:text-base">
                {invitation.email}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                Invitation {isExpired ? 'expired' : 'pending'}
              </div>
              {invitation.jobTitle && (
                <div className="text-xs text-muted-foreground truncate">
                  {invitation.jobTitle}
                </div>
              )}
            </div>
          </div>
        </TableCell>

        <TableCell className="hidden sm:table-cell">
          <Badge variant={isExpired ? "destructive" : "secondary"} className="capitalize">
            {isExpired ? 'Expired' : 'Invited'}
          </Badge>
        </TableCell>

        <TableCell className="hidden md:table-cell">
          <div className="text-sm text-muted-foreground">
            {invitation.inviter.fullName || invitation.inviter.email}
          </div>
        </TableCell>

        <TableCell className="hidden lg:table-cell">
          <div className="text-sm">
            {invitation.workingHoursPerWeek}h/week
          </div>
        </TableCell>

        <TableCell className="hidden lg:table-cell">
          <div className="text-sm text-muted-foreground">
            {isExpired ? 'Expired' : 'Available'}
          </div>
        </TableCell>

        <TableCell className="hidden xl:table-cell">
          <div className="text-sm text-muted-foreground">-</div>
        </TableCell>

        {canManage && (
          <TableCell>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (!isResendingInvitation && !isCancellingInvitation) {
                      onResendInvitation?.(invitation.id)
                    }
                  }}
                  disabled={isResendingInvitation || isCancellingInvitation}
                  className="text-blue-600"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {isResendingInvitation ? 'Resending...' : (isExpired ? 'Resend Invitation' : 'Resend')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const inviteUrl = `${window.location.origin}/invite/${invitation.token}`
                    navigator.clipboard.writeText(inviteUrl)
                    // You might want to add a toast here
                  }}
                >
                  <User className="w-4 h-4 mr-2" />
                  Copy Link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (!isResendingInvitation && !isCancellingInvitation) {
                      onCancelInvitation?.(invitation.id)
                    }
                  }}
                  disabled={isResendingInvitation || isCancellingInvitation}
                  className="text-destructive"
                >
                  <User className="w-4 h-4 mr-2" />
                  {isCancellingInvitation ? 'Cancelling...' : 'Cancel Invitation'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        )}
      </TableRow>
    )
  }, [canManage, isResendingInvitation, isCancellingInvitation, onResendInvitation, onCancelInvitation])

  // Render actual member row
  const renderActualMemberRow = useCallback((member: OrganizationMember, index: number) => {
    const roleInfo = getRoleInfo(member)
    const availability = calculateAvailability(member)
    const activeEngagements = member.engagements.filter(e => e.isActive)

    return (
      <TableRow
        key={member.id}
        className={onMemberClick ? "cursor-pointer hover:bg-muted/50 focus-within:bg-muted/50" : ""}
        onClick={() => onMemberClick?.(member)}
        role={onMemberClick ? "button" : undefined}
        tabIndex={onMemberClick ? 0 : undefined}
        onKeyDown={(e) => {
          if (onMemberClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            onMemberClick(member)
          }
        }}
        aria-label={onMemberClick ? `View profile for ${getMemberDisplayName(member)}` : undefined}
      >
        {canManage && (
          <TableCell onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={selectedMembers.has(member.id)}
              onCheckedChange={(checked) => 
                handleMemberSelect(member.id, checked as boolean)
              }
              aria-label={`Select ${getMemberDisplayName(member)}`}
            />
          </TableCell>
        )}
        <TableCell>
          <div className="flex items-center gap-2 sm:gap-3">
            <EnhancedAvatar
              src={getMemberAvatarUrl(member)}
              fallbackSeed={getMemberEmail(member)}
              fallbackSeeds={[getMemberDisplayName(member)]}
              size="md"
              className="w-8 h-8 sm:w-10 sm:h-10 shrink-0"
              alt={getMemberDisplayName(member)}
            />
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate text-sm sm:text-base">
                {getMemberDisplayName(member)}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground truncate">
                {getMemberEmail(member)}
              </div>
              {member.jobTitle && (
                <div className="text-xs text-muted-foreground truncate">
                  {member.jobTitle}
                </div>
              )}
              {/* Mobile-only role display */}
              <div className="sm:hidden mt-1">
                <Badge
                  variant="outline"
                  className="text-xs capitalize"
                  style={{
                    borderColor: roleInfo.color,
                    color: roleInfo.color
                  }}
                >
                  {roleInfo.name}
                </Badge>
              </div>
            </div>
          </div>
        </TableCell>

        <TableCell className="hidden sm:table-cell">
          <div className="flex flex-wrap gap-1">
            <Badge
              variant="outline"
              className="text-xs capitalize"
              style={{
                borderColor: roleInfo.color,
                color: roleInfo.color
              }}
            >
              {roleInfo.name}
            </Badge>
            {member.permissionSet && (
              <Badge variant="secondary" className="text-xs">
                <Shield className="w-3 h-3 mr-1" />
                Custom
              </Badge>
            )}
          </div>
        </TableCell>

        <TableCell className="hidden md:table-cell">
          <div className="space-y-1">
            <div className="text-sm font-medium">
              {activeEngagements.length} active
            </div>
            {activeEngagements.slice(0, 2).map((engagement) => (
              <div key={engagement.id} className="text-xs text-muted-foreground truncate">
                {engagement.project.name} ({engagement.hoursPerWeek}h/week)
              </div>
            ))}
            {activeEngagements.length > 2 && (
              <div className="text-xs text-muted-foreground">
                +{activeEngagements.length - 2} more
              </div>
            )}
          </div>
        </TableCell>

        <TableCell className="hidden lg:table-cell">
          <div className="flex flex-wrap gap-1">
            {formatTimeOff(member)}
          </div>
        </TableCell>

        <TableCell>
          <div className="space-y-1">
            <div className="text-xs sm:text-sm">
              <span className="font-medium">{member.workingHoursPerWeek}h</span>
              <span className="text-muted-foreground hidden sm:inline"> total</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {availability}h available
            </div>
          </div>
        </TableCell>

        <TableCell className="hidden sm:table-cell">
          <div className="flex items-center gap-2">
            {member.user.avatarUrl ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Custom</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-orange-500" />
                <span className="text-sm">Generated</span>
              </>
            )}
          </div>
        </TableCell>

        {canManage && (
          <TableCell onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-8 h-8 p-0 touch-target"
                  aria-label={`Actions for ${getMemberDisplayName(member)}`}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[160px]">
                <DropdownMenuItem
                  onClick={() => onMemberClick?.(member)}
                  className="cursor-pointer"
                >
                  <User className="w-4 h-4 mr-2" />
                  View Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onMemberEdit?.(member)}
                  className="cursor-pointer"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Member
                </DropdownMenuItem>
                {member.user.avatarUrl && (
                  <DropdownMenuItem
                    onClick={() => handleAvatarReset(member.id)}
                    className="cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Avatar
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onMemberRemove?.(member)}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  Remove Member
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        )}
      </TableRow>
    )
  }, [getRoleInfo, calculateAvailability, formatTimeOff, onMemberClick, onMemberEdit, onMemberRemove, canManage])

  // Render member or invitation row (used by both regular and virtual table)
  const renderMemberRow = useCallback((item: CombinedItem, index: number) => {
    const isInvitation = 'type' in item && item.type === 'invitation'

    if (isInvitation) {
      return renderInvitationRow(item as PendingInvitation & { type: 'invitation' }, index)
    } else {
      return renderActualMemberRow(item as OrganizationMember, index)
    }
  }, [renderActualMemberRow, renderInvitationRow])

  // Render table header
  const renderTableHeader = useCallback(() => (
    <TableHeader>
      <TableRow>
        {canManage && (
          <TableHead className="w-12">
            <Checkbox
              checked={selectedMembers.size > 0 && selectedMembers.size === members.length}
              onCheckedChange={handleSelectAll}
              aria-label="Select all members"
            />
          </TableHead>
        )}
        <TableHead className="min-w-[200px]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSort('name')}
            className="h-auto p-0 font-medium hover:bg-transparent"
            aria-label="Sort by member name"
          >
            Member
            {renderSortIcon('name')}
          </Button>
        </TableHead>
        <TableHead className="hidden sm:table-cell min-w-[150px]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSort('role')}
            className="h-auto p-0 font-medium hover:bg-transparent"
            aria-label="Sort by role"
          >
            Roles & Labels
            {renderSortIcon('role')}
          </Button>
        </TableHead>
        <TableHead className="hidden md:table-cell min-w-[180px]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSort('engagements')}
            className="h-auto p-0 font-medium hover:bg-transparent"
            aria-label="Sort by engagements"
          >
            Engagements
            {renderSortIcon('engagements')}
          </Button>
        </TableHead>
        <TableHead className="hidden lg:table-cell min-w-[120px]">Time Off</TableHead>
        <TableHead className="min-w-[100px]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSort('totalHours')}
            className="h-auto p-0 font-medium hover:bg-transparent"
            aria-label="Sort by hours"
          >
            Hours
            {renderSortIcon('totalHours')}
          </Button>
        </TableHead>
        <TableHead className="hidden sm:table-cell min-w-[120px]">Avatar</TableHead>
        {canManage && <TableHead className="w-12" aria-label="Actions"></TableHead>}
      </TableRow>
    </TableHeader>
  ), [handleSort, renderSortIcon, canManage, selectedMembers.size, members.length, handleSelectAll])

  if (isLoading) {
    return <MemberTableSkeleton rows={5} />
  }

  if (!members || members.length === 0) {
    return (
      <div className="rounded-lg border p-12 text-center">
        <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          No members found
        </h3>
        <p className="text-sm text-muted-foreground">
          No team members match your current filters.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4" ref={tableContainerRef}>
      {/* Bulk Actions Bar */}
      {canManage && selectedMembers.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {selectedMembers.size} member{selectedMembers.size !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkAvatarReset}
              disabled={isProcessingBulk}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Avatars
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportProfiles}
              disabled={isProcessingBulk}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedMembers(new Set())}
              disabled={isProcessingBulk}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      {shouldUseVirtualScrolling ? (
        // Virtual scrolling table for large datasets
        <VirtualTable
          items={paginatedMembers}
          itemHeight={MEMBER_ROW_HEIGHT}
          containerHeight={containerHeight}
          renderHeader={renderTableHeader}
          renderItem={renderMemberRow}
          className="rounded-lg border"
        />
      ) : (
        // Regular table for smaller datasets
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto mobile-scroll">
            <Table>
              {renderTableHeader()}
              <TableBody>
                {paginatedMembers.map((member, index) => renderMemberRow(member, index))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Pagination - only show if not using virtual scrolling */}
      {!shouldUseVirtualScrolling && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 text-sm text-muted-foreground">
            <div>
              Showing {startItem} to {endItem} of {sortedMembers.length} members
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="page-size" className="text-sm whitespace-nowrap">
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

          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className="w-8 h-8 p-0"
              aria-label="Go to first page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="w-8 h-8 p-0"
              aria-label="Go to previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-1 text-sm px-2 whitespace-nowrap">
              <span className="hidden sm:inline">Page</span>
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
              aria-label="Go to next page"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className="w-8 h-8 p-0"
              aria-label="Go to last page"
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Virtual scrolling info */}
      {shouldUseVirtualScrolling && (
        <div className="flex justify-between items-center px-2 text-sm text-muted-foreground">
          <div>
            Showing all {sortedMembers.length} members (virtual scrolling enabled)
          </div>
          <div className="text-xs">
            Scroll to view more members
          </div>
        </div>
      )}
    </div>
  )
}