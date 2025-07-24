'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { 
  Users, 
  Shield, 
  RotateCcw, 
  Download, 
  Upload, 
  Trash2, 
  Eye, 
  Edit,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { EnhancedAvatar } from '@/components/ui/enhanced-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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
import { Separator } from '@/components/ui/separator'
import { PermissionGuard } from '@/components/common/PermissionGuard'
import { ProfileEditorDialog } from '@/components/profile/profile-editor-dialog'
import { OrganizationMember } from '@/hooks/useTeamMembers'
import { usePermissions } from '@/hooks/usePermissions'

interface AdminProfileManagerProps {
  members: OrganizationMember[]
  organizationId: string
  onMemberUpdate?: (memberId: string) => void
  onAvatarReset?: (memberId: string) => void
  onBulkAvatarReset?: (memberIds: string[]) => void
}

interface BulkAction {
  type: 'reset_avatar' | 'export_profiles' | 'update_visibility'
  label: string
  icon: React.ComponentType<{ className?: string }>
  requiresConfirmation: boolean
  description: string
}

const BULK_ACTIONS: BulkAction[] = [
  {
    type: 'reset_avatar',
    label: 'Reset Avatars',
    icon: RotateCcw,
    requiresConfirmation: true,
    description: 'Reset selected members\' avatars to generated fallbacks'
  },
  {
    type: 'export_profiles',
    label: 'Export Profiles',
    icon: Download,
    requiresConfirmation: false,
    description: 'Export selected members\' profile data as CSV'
  },
  {
    type: 'update_visibility',
    label: 'Update Visibility',
    icon: Eye,
    requiresConfirmation: true,
    description: 'Update profile visibility settings for selected members'
  }
]

export function AdminProfileManager({
  members,
  organizationId,
  onMemberUpdate,
  onAvatarReset,
  onBulkAvatarReset
}: AdminProfileManagerProps) {
  const { hasPermission: checkPermission } = usePermissions()
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [showBulkDialog, setShowBulkDialog] = useState(false)
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [editingMember, setEditingMember] = useState<OrganizationMember | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [avatarFilter, setAvatarFilter] = useState<string>('all')

  // Check if user has admin permissions
  const canManageProfiles = checkPermission('teamMembers.manageAll')

  // Filter members based on search and filters
  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      const matchesSearch = !searchQuery || 
        member.user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.user.email?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesRole = roleFilter === 'all' || member.role === roleFilter
      
      const matchesAvatar = avatarFilter === 'all' || 
        (avatarFilter === 'has_avatar' && member.user.avatarUrl) ||
        (avatarFilter === 'no_avatar' && !member.user.avatarUrl)
      
      return matchesSearch && matchesRole && matchesAvatar
    })
  }, [members, searchQuery, roleFilter, avatarFilter])

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
      setSelectedMembers(new Set(filteredMembers.map(m => m.id)))
    } else {
      setSelectedMembers(new Set())
    }
  }, [filteredMembers])

  // Handle bulk action
  const handleBulkAction = useCallback(async (action: BulkAction) => {
    if (selectedMembers.size === 0) {
      toast.error('Please select at least one member')
      return
    }

    setBulkAction(action)
    if (action.requiresConfirmation) {
      setShowBulkDialog(true)
    } else {
      await executeBulkAction(action)
    }
  }, [selectedMembers])

  // Execute bulk action
  const executeBulkAction = useCallback(async (action: BulkAction) => {
    setIsProcessing(true)
    try {
      const memberIds = Array.from(selectedMembers)
      
      switch (action.type) {
        case 'reset_avatar':
          if (onBulkAvatarReset) {
            await onBulkAvatarReset(memberIds)
            toast.success(`Reset avatars for ${memberIds.length} members`)
          }
          break
          
        case 'export_profiles':
          await exportProfiles(memberIds)
          toast.success(`Exported profiles for ${memberIds.length} members`)
          break
          
        case 'update_visibility':
          // This would open a dialog to set visibility preferences
          toast.info('Visibility update feature coming soon')
          break
      }
      
      setSelectedMembers(new Set())
      setShowBulkDialog(false)
    } catch (error) {
      console.error('Bulk action failed:', error)
      toast.error(`Failed to ${action.label.toLowerCase()}`)
    } finally {
      setIsProcessing(false)
    }
  }, [selectedMembers, onBulkAvatarReset])

  // Export profiles to CSV
  const exportProfiles = useCallback(async (memberIds: string[]) => {
    const selectedMemberData = members.filter(m => memberIds.includes(m.id))
    
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
  }, [members])

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

  if (!canManageProfiles) {
    return (
      <div className="text-center py-8">
        <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">
          You don't have permission to manage member profiles
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Profile Management</h2>
          <p className="text-muted-foreground">
            Manage member profiles, avatars, and bulk operations
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {selectedMembers.size} selected
        </Badge>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="flex gap-2">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="member">Member</SelectItem>
            </SelectContent>
          </Select>
          <Select value={avatarFilter} onValueChange={setAvatarFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Avatar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              <SelectItem value="has_avatar">Has Avatar</SelectItem>
              <SelectItem value="no_avatar">No Avatar</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedMembers.size > 0 && (
        <div className="flex flex-wrap gap-2 p-4 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium">Bulk Actions:</span>
          {BULK_ACTIONS.map((action) => (
            <Button
              key={action.type}
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction(action)}
              disabled={isProcessing}
            >
              <action.icon className="w-4 h-4 mr-2" />
              {action.label}
            </Button>
          ))}
        </div>
      )}

      {/* Members Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedMembers.size === filteredMembers.length && filteredMembers.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Avatar Status</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedMembers.has(member.id)}
                    onCheckedChange={(checked) => 
                      handleMemberSelect(member.id, checked as boolean)
                    }
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <EnhancedAvatar
                      src={member.user.avatarUrl}
                      fallbackSeed={member.user.email || member.user.fullName || 'user'}
                      size="md"
                    />
                    <div>
                      <div className="font-medium">
                        {member.user.fullName || 'Unnamed User'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {member.user.email}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={
                    member.role === 'owner' ? 'default' :
                    member.role === 'admin' ? 'secondary' : 'outline'
                  }>
                    {member.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {member.user.avatarUrl ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Custom Avatar</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-orange-500" />
                        <span className="text-sm">Generated Avatar</span>
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {new Date(member.createdAt).toLocaleDateString()}
                  </span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingMember(member)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Profile
                      </DropdownMenuItem>
                      {member.user.avatarUrl && (
                        <DropdownMenuItem onClick={() => handleAvatarReset(member.id)}>
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Reset Avatar
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove Member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Bulk Action Confirmation Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Confirm Bulk Action
            </DialogTitle>
            <DialogDescription>
              {bulkAction?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">
              This action will affect <strong>{selectedMembers.size}</strong> selected members.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowBulkDialog(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={() => bulkAction && executeBulkAction(bulkAction)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  bulkAction?.icon && <bulkAction.icon className="w-4 h-4 mr-2" />
                )}
                {isProcessing ? 'Processing...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Editor Dialog */}
      {editingMember && (
        <ProfileEditorDialog
          isOpen={!!editingMember}
          onClose={() => setEditingMember(null)}
          userId={editingMember.user.id}
          initialTab="profile"
        />
      )}
    </div>
  )
}