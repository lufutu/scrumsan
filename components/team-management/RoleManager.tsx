'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { 
  Briefcase, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  AlertTriangle,
  Palette,
  Hash
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EnhancedAvatar } from '@/components/ui/enhanced-avatar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { useCustomRoles, type CustomRole, DEFAULT_ROLE_COLORS } from '@/hooks/useCustomRoles'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { toast } from 'sonner'

interface RoleManagerProps {
  organizationId: string
}

export function RoleManager({ organizationId }: RoleManagerProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedRole, setSelectedRole] = useState<CustomRole | null>(null)

  const { 
    roles, 
    isLoading, 
    error,
    createRole,
    updateRole,
    deleteRole,
    validateRole,
    isRoleInUse,
    sortRolesByUsage,
    getNextAvailableColor
  } = useCustomRoles(organizationId)

  const { members } = useTeamMembers(organizationId)

  const handleCreateRole = useCallback(() => {
    setShowCreateDialog(true)
  }, [])

  const handleEditRole = useCallback((role: CustomRole) => {
    setSelectedRole(role)
    setShowEditDialog(true)
  }, [])

  const handleDeleteRole = useCallback((role: CustomRole) => {
    setSelectedRole(role)
    setShowDeleteDialog(true)
  }, [])

  const handleCloseDialogs = useCallback(() => {
    setShowCreateDialog(false)
    setShowEditDialog(false)
    setShowDeleteDialog(false)
    setSelectedRole(null)
  }, [])

  const sortedRoles = useMemo(() => {
    return sortRolesByUsage(roles)
  }, [roles, sortRolesByUsage])

  if (isLoading) {
    return <LoadingState message="Loading custom roles..." />
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-8 h-8 mx-auto text-destructive mb-2" />
        <p className="text-sm text-muted-foreground">Failed to load custom roles</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    )
  }

  if (!roles || roles.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Custom Roles</h3>
            <p className="text-sm text-muted-foreground">
              Create and manage custom job roles with color coding for better organization.
            </p>
          </div>
          <Button onClick={handleCreateRole}>
            <Plus className="w-4 h-4 mr-2" />
            Create Role
          </Button>
        </div>

        <EmptyState
          icon={Briefcase}
          title="No custom roles found"
          description="Create your first custom role to organize team members by their job functions."
          action={
            <Button onClick={handleCreateRole}>
              <Plus className="w-4 h-4 mr-2" />
              Create Role
            </Button>
          }
        />

        <RoleDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          organizationId={organizationId}
          mode="create"
          onSuccess={handleCloseDialogs}
          validateRole={validateRole}
          createRole={createRole}
          updateRole={updateRole}
          getNextAvailableColor={getNextAvailableColor}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Custom Roles</h3>
          <p className="text-sm text-muted-foreground">
            Create and manage custom job roles with color coding for better organization.
          </p>
        </div>
        <Button onClick={handleCreateRole}>
          <Plus className="w-4 h-4 mr-2" />
          Create Role
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedRoles.map((role) => (
          <RoleCard
            key={role.id}
            role={role}
            members={members}
            onEdit={() => handleEditRole(role)}
            onDelete={() => handleDeleteRole(role)}
            isInUse={isRoleInUse(role.id)}
          />
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <RoleDialog
        open={showCreateDialog || showEditDialog}
        onOpenChange={handleCloseDialogs}
        organizationId={organizationId}
        mode={showCreateDialog ? 'create' : 'edit'}
        role={selectedRole}
        onSuccess={handleCloseDialogs}
        validateRole={validateRole}
        createRole={createRole}
        updateRole={updateRole}
        getNextAvailableColor={getNextAvailableColor}
      />

      {/* Delete Dialog */}
      <RoleDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        role={selectedRole}
        members={members}
        onSuccess={handleCloseDialogs}
        deleteRole={deleteRole}
        isRoleInUse={isRoleInUse}
      />
    </div>
  )
}

interface RoleCardProps {
  role: CustomRole
  members?: import('@/hooks/useTeamMembers').OrganizationMember[]
  onEdit: () => void
  onDelete: () => void
  isInUse: boolean
}

function RoleCard({ role, members, onEdit, onDelete, isInUse }: RoleCardProps) {
  const membersWithRole = useMemo(() => {
    if (!members) return []
    // Note: This would need to be implemented when role assignment is added to member profiles
    // For now, we'll use the _count from the API if available
    return []
  }, [members])

  const memberCount = role._count?.members || 0

  return (
    <Card className="relative overflow-hidden">
      {/* Color indicator */}
      <div 
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: role.color }}
      />
      
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${role.color}20` }}
            >
              <Briefcase 
                className="w-5 h-5" 
                style={{ color: role.color }}
              />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {role.name}
              </CardTitle>
              <CardDescription>
                {memberCount} member{memberCount !== 1 ? 's' : ''} assigned
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onDelete}
              disabled={isInUse}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Color Information */}
        <div className="flex items-center gap-2">
          <div 
            className="w-4 h-4 rounded border"
            style={{ backgroundColor: role.color }}
          />
          <span className="text-sm text-muted-foreground font-mono">
            {role.color.toUpperCase()}
          </span>
        </div>

        {/* Usage Statistics */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Usage</span>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{memberCount}</span>
          </div>
        </div>

        {/* Members Preview (if any) */}
        {membersWithRole.length > 0 && (
          <div>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {membersWithRole.slice(0, 3).map((member) => (
                  <EnhancedAvatar
                    key={member.id}
                    src={member.user.avatarUrl}
                    fallbackSeed={member.user.email}
                    fallbackSeeds={[member.user.fullName || '']}
                    size="sm"
                    className="w-6 h-6 border-2 border-background"
                    alt={member.user.fullName || member.user.email}
                  />
                ))}
              </div>
              {membersWithRole.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{membersWithRole.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* In Use Indicator */}
        {isInUse && (
          <Badge variant="secondary" className="text-xs">
            In Use
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}

interface RoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  mode: 'create' | 'edit'
  role?: CustomRole | null
  onSuccess: () => void
  validateRole: (roleData: any, excludeRoleId?: string) => string[]
  createRole: (data: { name: string; color: string }) => Promise<any>
  updateRole: (roleId: string, data: { name?: string; color?: string }) => Promise<unknown>
  getNextAvailableColor: () => string
}

function RoleDialog({
  open,
  onOpenChange,
  organizationId,
  mode,
  role,
  onSuccess,
  validateRole,
  createRole,
  updateRole,
  getNextAvailableColor
}: RoleDialogProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3B82F6')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form when dialog opens or role changes
  React.useEffect(() => {
    if (open) {
      if (mode === 'edit' && role) {
        setName(role.name)
        setColor(role.color)
      } else {
        setName('')
        setColor(getNextAvailableColor())
      }
      setValidationErrors([])
    }
  }, [open, mode, role, getNextAvailableColor])

  // Validate role whenever name or color changes
  React.useEffect(() => {
    if (name || color) {
      const errors = validateRole(
        { name, color }, 
        mode === 'edit' && role ? role.id : undefined
      )
      setValidationErrors(errors)
    }
  }, [name, color, validateRole, mode, role])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      toast.error('Role name is required')
      return
    }

    if (validationErrors.length > 0) {
      toast.error('Please fix validation errors')
      return
    }

    setIsSubmitting(true)
    try {
      if (mode === 'create') {
        await createRole({ name: name.trim(), color })
      } else if (role) {
        await updateRole(role.id, { name: name.trim(), color })
      }
      onSuccess()
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setIsSubmitting(false)
    }
  }, [name, color, validationErrors, mode, role, createRole, updateRole, onSuccess])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create Custom Role' : 'Edit Custom Role'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Create a new custom role with a name and color for better organization.'
              : 'Update the role name and color.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name">Role Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Frontend Developer, Project Manager"
              disabled={isSubmitting}
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-3">
            <Label>Color</Label>
            
            {/* Color Preview */}
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded border-2 border-border"
                style={{ backgroundColor: color }}
              />
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#3B82F6"
                  className="w-24 font-mono text-sm"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Predefined Colors */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Quick colors:</p>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_ROLE_COLORS.map((presetColor) => (
                  <button
                    key={presetColor}
                    type="button"
                    className={`w-6 h-6 rounded border-2 transition-all ${
                      color === presetColor 
                        ? 'border-foreground scale-110' 
                        : 'border-border hover:scale-105'
                    }`}
                    style={{ backgroundColor: presetColor }}
                    onClick={() => setColor(presetColor)}
                    disabled={isSubmitting}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Validation errors:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index} className="text-sm">{error}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || validationErrors.length > 0}>
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Role' : 'Update Role'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface RoleDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: CustomRole | null
  members?: import('@/hooks/useTeamMembers').OrganizationMember[]
  onSuccess: () => void
  deleteRole: (roleId: string) => Promise<void>
  isRoleInUse: (roleId: string) => boolean
}

function RoleDeleteDialog({
  open,
  onOpenChange,
  role,
  members,
  onSuccess,
  deleteRole,
  isRoleInUse
}: RoleDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const roleInUse = role ? isRoleInUse(role.id) : false
  const memberCount = role?._count?.members || 0

  const handleDelete = useCallback(async () => {
    if (!role) return

    if (roleInUse) {
      toast.error('Cannot delete role that is currently in use')
      return
    }

    setIsDeleting(true)
    try {
      await deleteRole(role.id)
      onSuccess()
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setIsDeleting(false)
    }
  }, [role, roleInUse, deleteRole, onSuccess])

  if (!role) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Delete Custom Role
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the &quot;{role.name}&quot; role? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Role Preview */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${role.color}20` }}
            >
              <Briefcase 
                className="w-5 h-5" 
                style={{ color: role.color }}
              />
            </div>
            <div>
              <p className="font-medium">{role.name}</p>
              <p className="text-sm text-muted-foreground">
                {memberCount} member{memberCount !== 1 ? 's' : ''} assigned
              </p>
            </div>
          </div>

          {roleInUse && (
            <Alert>
              <Users className="h-4 w-4" />
              <AlertDescription>
                This role is currently assigned to {memberCount} member{memberCount !== 1 ? 's' : ''}. 
                Please remove the role from all members before deleting it.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={isDeleting || roleInUse}
          >
            {isDeleting ? 'Deleting...' : 'Delete Role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}