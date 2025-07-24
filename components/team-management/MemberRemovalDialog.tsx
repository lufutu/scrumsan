'use client'

import React, { useState, useCallback } from 'react'
import { 
  AlertTriangle, 
  User, 
  Users, 
  Crown, 
  Shield, 
  Trash2,
  LogOut,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MemberRemovalConfirmation } from '@/components/ui/confirmation-dialog'
import { ComponentErrorBoundary } from '@/components/ui/error-boundary'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { EnhancedAvatar } from '@/components/ui/enhanced-avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useMemberRemoval } from '@/hooks/useMemberRemoval'
import { useTeamMembers, OrganizationMember } from '@/hooks/useTeamMembers'

interface MemberRemovalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  member: OrganizationMember
  currentUserId: string
  isOwnAccount?: boolean
}

export function MemberRemovalDialog({
  open,
  onOpenChange,
  organizationId,
  member,
  currentUserId,
  isOwnAccount = false,
}: MemberRemovalDialogProps) {
  return (
    <ComponentErrorBoundary>
      <MemberRemovalDialogContent
        open={open}
        onOpenChange={onOpenChange}
        organizationId={organizationId}
        member={member}
        currentUserId={currentUserId}
        isOwnAccount={isOwnAccount}
      />
    </ComponentErrorBoundary>
  )
}

function MemberRemovalDialogContent({
  open,
  onOpenChange,
  organizationId,
  member,
  currentUserId,
  isOwnAccount = false,
}: MemberRemovalDialogProps) {
  const [selectedBoards, setSelectedBoards] = useState<string[]>([])
  const [newOwnerId, setNewOwnerId] = useState<string>('')
  const [showConfirmation, setShowConfirmation] = useState(false)

  const {
    memberBoards,
    boardsLoading,
    isRemoving,
    isLeaving,
    removeMember,
    leaveOrganization,
  } = useMemberRemoval(organizationId, member.id)

  const { members } = useTeamMembers(organizationId)

  // Get potential new owners (admins and members, excluding current member)
  const potentialOwners = members?.filter(m => 
    m.id !== member.id && 
    (m.role === 'admin' || m.role === 'member')
  ) || []

  const isOwner = member.role === 'owner'
  const isProcessing = isRemoving || isLeaving

  const handleBoardSelection = useCallback((boardId: string, checked: boolean) => {
    setSelectedBoards(prev => 
      checked 
        ? [...prev, boardId]
        : prev.filter(id => id !== boardId)
    )
  }, [])

  const handleSelectAllBoards = useCallback((checked: boolean) => {
    if (checked && memberBoards?.boards) {
      setSelectedBoards(memberBoards.boards.map(board => board.id))
    } else {
      setSelectedBoards([])
    }
  }, [memberBoards?.boards])

  const handleRemoval = useCallback(() => {
    if (isOwner && !newOwnerId) {
      return // Should not happen due to validation
    }

    const options = {
      boardsToRemoveFrom: selectedBoards.length > 0 ? selectedBoards : undefined,
      transferOwnership: isOwner ? { newOwnerId } : undefined,
      isVoluntaryLeave: isOwnAccount,
    }

    if (isOwnAccount) {
      leaveOrganization(isOwner ? { newOwnerId } : undefined)
    } else {
      removeMember(options)
    }
  }, [selectedBoards, newOwnerId, isOwner, isOwnAccount, removeMember, leaveOrganization])

  const canProceed = !isOwner || (isOwner && newOwnerId)

  const confirmationTitle = isOwnAccount 
    ? 'Leave Organization'
    : 'Remove Member'

  const confirmationMessage = isOwnAccount
    ? `Are you sure you want to leave this organization? This action cannot be undone.`
    : `Are you sure you want to remove ${member.user.fullName || member.user.email} from this organization? This action cannot be undone.`

  if (boardsLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
            <DialogDescription>
              Loading member information...
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <Dialog open={open && !showConfirmation} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isOwnAccount ? (
                <>
                  <LogOut className="w-5 h-5 text-destructive" />
                  Leave Organization
                </>
              ) : (
                <>
                  <Trash2 className="w-5 h-5 text-destructive" />
                  Remove Member
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {isOwnAccount 
                ? 'Configure your departure from this organization.'
                : 'Configure the removal of this member from the organization.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Member Info */}
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <EnhancedAvatar
                src={member.user.avatarUrl}
                fallbackSeed={member.user.email}
                fallbackSeeds={[member.user.fullName || '']}
                size="xl"
                className="w-12 h-12"
                alt={member.user.fullName || member.user.email}
              />
              <div className="flex-1">
                <div className="font-medium">
                  {member.user.fullName || member.user.email}
                </div>
                <div className="text-sm text-muted-foreground">
                  {member.user.email}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs capitalize">
                    {member.role === 'owner' && <Crown className="w-3 h-3 mr-1" />}
                    {member.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                    {member.role === 'member' && <User className="w-3 h-3 mr-1" />}
                    {member.role}
                  </Badge>
                  {member.jobTitle && (
                    <Badge variant="secondary" className="text-xs">
                      {member.jobTitle}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Ownership Transfer (for owners) */}
            {isOwner && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="font-medium">Ownership Transfer Required</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  As the organization owner, you must transfer ownership to another member before leaving.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="new-owner">Select New Owner</Label>
                  <Select value={newOwnerId} onValueChange={setNewOwnerId}>
                    <SelectTrigger id="new-owner">
                      <SelectValue placeholder="Choose a new owner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {potentialOwners.map((potentialOwner) => (
                        <SelectItem key={potentialOwner.id} value={potentialOwner.id}>
                          <div className="flex items-center gap-2">
                            <EnhancedAvatar
                              src={potentialOwner.user.avatarUrl}
                              fallbackSeed={potentialOwner.user.email}
                              fallbackSeeds={[potentialOwner.user.fullName || '']}
                              size="sm"
                              className="w-6 h-6"
                              alt={potentialOwner.user.fullName || potentialOwner.user.email}
                            />
                            <div>
                              <div className="font-medium">
                                {potentialOwner.user.fullName || potentialOwner.user.email}
                              </div>
                              <div className="text-xs text-muted-foreground capitalize">
                                {potentialOwner.role}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Board Access Management */}
            {memberBoards?.boards && memberBoards.boards.length > 0 && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Board Access Management
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select boards to remove the member from. Unchecked boards will maintain the member's access.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all-boards"
                      checked={selectedBoards.length === memberBoards.boards.length}
                      onCheckedChange={handleSelectAllBoards}
                    />
                    <Label htmlFor="select-all-boards" className="text-sm font-medium">
                      Select all boards ({memberBoards.boards.length})
                    </Label>
                  </div>
                  
                  <Separator />
                  
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {memberBoards.boards.map((board) => (
                      <div key={board.id} className="flex items-start space-x-2 p-2 rounded border">
                        <Checkbox
                          id={`board-${board.id}`}
                          checked={selectedBoards.includes(board.id)}
                          onCheckedChange={(checked) => handleBoardSelection(board.id, checked as boolean)}
                        />
                        <div className="flex-1 min-w-0">
                          <Label htmlFor={`board-${board.id}`} className="font-medium cursor-pointer">
                            {board.name}
                          </Label>
                          {board.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {board.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>{board.taskCount} tasks</span>
                            <span>{board.sprintCount} sprints</span>
                            <span>{board.projectAccess.length} project(s)</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Impact Summary */}
            <div className="space-y-4">
              <h3 className="font-medium">Impact Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Active Engagements:</span>
                    <span className="font-medium">
                      {member.engagements.filter(e => e.isActive).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Time-off Entries:</span>
                    <span className="font-medium">
                      {member.timeOffEntries.length}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Timeline Events:</span>
                    <span className="font-medium">
                      {member.timelineEvents?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Profile Data:</span>
                    <span className="font-medium">
                      {member.profileData ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                All related data will be permanently deleted when the member is removed.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowConfirmation(true)}
              disabled={!canProceed || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isOwnAccount ? 'Leaving...' : 'Removing...'}
                </>
              ) : (
                <>
                  {isOwnAccount ? (
                    <>
                      <LogOut className="w-4 h-4 mr-2" />
                      Leave Organization
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove Member
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enhanced Confirmation Dialog */}
      <MemberRemovalConfirmation
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        memberName={member.user.fullName || member.user.email}
        isOwnAccount={isOwnAccount}
        onConfirm={handleRemoval}
        isLoading={isProcessing}
        additionalActions={
          <div className="space-y-2 text-sm">
            {selectedBoards.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Will be removed from {selectedBoards.length} board{selectedBoards.length === 1 ? '' : 's'}</span>
              </div>
            )}
            {isOwner && newOwnerId && (
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4" />
                <span>Ownership will be transferred</span>
              </div>
            )}
            {member.engagements.filter(e => e.isActive).length > 0 && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>{member.engagements.filter(e => e.isActive).length} active engagement{member.engagements.filter(e => e.isActive).length === 1 ? '' : 's'} will be ended</span>
              </div>
            )}
          </div>
        }
      />
    </>
  )
}