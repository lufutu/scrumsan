'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { 
  Shield, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  AlertTriangle,
  Check,
  X,
  Eye,
  Settings,
  FileText,
  DollarSign,
  Building,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EnhancedAvatar } from '@/components/ui/enhanced-avatar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { usePermissionSets, type PermissionSet, type PermissionConfig } from '@/hooks/usePermissionSets'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { toast } from 'sonner'

interface PermissionSetManagerProps {
  organizationId: string
}

export function PermissionSetManager({ organizationId }: PermissionSetManagerProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedPermissionSet, setSelectedPermissionSet] = useState<PermissionSet | null>(null)

  const { 
    permissionSets, 
    isLoading, 
    error,
    createPermissionSet,
    updatePermissionSet,
    deletePermissionSet,
    validatePermissions,
    getDefaultPermissions
  } = usePermissionSets(organizationId)

  const { members } = useTeamMembers(organizationId)

  const handleCreatePermissionSet = useCallback(() => {
    setShowCreateDialog(true)
  }, [])

  const handleEditPermissionSet = useCallback((permissionSet: PermissionSet) => {
    setSelectedPermissionSet(permissionSet)
    setShowEditDialog(true)
  }, [])

  const handleDeletePermissionSet = useCallback((permissionSet: PermissionSet) => {
    setSelectedPermissionSet(permissionSet)
    setShowDeleteDialog(true)
  }, [])

  const handleCloseDialogs = useCallback(() => {
    setShowCreateDialog(false)
    setShowEditDialog(false)
    setShowDeleteDialog(false)
    setSelectedPermissionSet(null)
  }, [])

  if (isLoading) {
    return <LoadingState message="Loading permission sets..." />
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-8 h-8 mx-auto text-destructive mb-2" />
        <p className="text-sm text-muted-foreground">Failed to load permission sets</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    )
  }

  if (!permissionSets || permissionSets.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Permission Sets</h3>
            <p className="text-sm text-muted-foreground">
              Create and manage custom permission sets for fine-grained access control.
            </p>
          </div>
          <Button onClick={handleCreatePermissionSet}>
            <Plus className="w-4 h-4 mr-2" />
            Create Permission Set
          </Button>
        </div>

        <EmptyState
          icon={Shield}
          title="No permission sets found"
          description="Create your first custom permission set to get started with granular access control."
          action={
            <Button onClick={handleCreatePermissionSet}>
              <Plus className="w-4 h-4 mr-2" />
              Create Permission Set
            </Button>
          }
        />

        <PermissionSetDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          organizationId={organizationId}
          mode="create"
          onSuccess={handleCloseDialogs}
          getDefaultPermissions={getDefaultPermissions}
          validatePermissions={validatePermissions}
          createPermissionSet={createPermissionSet}
          updatePermissionSet={updatePermissionSet}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Permission Sets</h3>
          <p className="text-sm text-muted-foreground">
            Create and manage custom permission sets for fine-grained access control.
          </p>
        </div>
        <Button onClick={handleCreatePermissionSet}>
          <Plus className="w-4 h-4 mr-2" />
          Create Permission Set
        </Button>
      </div>

      <div className="grid gap-4">
        {permissionSets.map((permissionSet) => (
          <PermissionSetCard
            key={permissionSet.id}
            permissionSet={permissionSet}
            members={members}
            onEdit={() => handleEditPermissionSet(permissionSet)}
            onDelete={() => handleDeletePermissionSet(permissionSet)}
          />
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <PermissionSetDialog
        open={showCreateDialog || showEditDialog}
        onOpenChange={handleCloseDialogs}
        organizationId={organizationId}
        mode={showCreateDialog ? 'create' : 'edit'}
        permissionSet={selectedPermissionSet}
        onSuccess={handleCloseDialogs}
        getDefaultPermissions={getDefaultPermissions}
        validatePermissions={validatePermissions}
        createPermissionSet={createPermissionSet}
        updatePermissionSet={updatePermissionSet}
      />

      {/* Delete Dialog */}
      <PermissionSetDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        permissionSet={selectedPermissionSet}
        permissionSets={permissionSets}
        members={members}
        onSuccess={handleCloseDialogs}
        deletePermissionSet={deletePermissionSet}
      />
    </div>
  )
}

interface PermissionSetCardProps {
  permissionSet: PermissionSet
  members?: import('@/hooks/useTeamMembers').OrganizationMember[]
  onEdit: () => void
  onDelete: () => void
}

function PermissionSetCard({ permissionSet, members, onEdit, onDelete }: PermissionSetCardProps) {
  const assignedMembers = useMemo(() => {
    if (!members) return []
    return members.filter(member => member.permissionSetId === permissionSet.id)
  }, [members, permissionSet.id])

  const permissionSummary = useMemo(() => {
    const permissions = permissionSet.permissions
    const summary: string[] = []

    if (permissions.teamMembers.manageAll) summary.push('Manage all team members')
    else if (permissions.teamMembers.viewAll) summary.push('View all team members')

    if (permissions.projects.manageAll) summary.push('Manage all projects')
    else if (permissions.projects.viewAll) summary.push('View all projects')
    else if (permissions.projects.manageAssigned) summary.push('Manage assigned projects')
    else if (permissions.projects.viewAssigned) summary.push('View assigned projects')

    if (permissions.invoicing.manageAll) summary.push('Manage all invoicing')
    else if (permissions.invoicing.viewAll) summary.push('View all invoicing')

    if (permissions.clients.manageAll) summary.push('Manage all clients')
    else if (permissions.clients.viewAll) summary.push('View all clients')

    if (permissions.worklogs.manageAll) summary.push('Manage all worklogs')

    return summary
  }, [permissionSet.permissions])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {permissionSet.name}
                {permissionSet.isDefault && (
                  <Badge variant="secondary" className="text-xs">
                    Default
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {assignedMembers.length} member{assignedMembers.length !== 1 ? 's' : ''} assigned
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit className="w-4 h-4" />
            </Button>
            {!permissionSet.isDefault && (
              <Button variant="ghost" size="sm" onClick={onDelete}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Permission Summary */}
        <div>
          <h4 className="text-sm font-medium mb-2">Permissions</h4>
          <div className="flex flex-wrap gap-1">
            {permissionSummary.length > 0 ? (
              permissionSummary.slice(0, 3).map((permission, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {permission}
                </Badge>
              ))
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                No permissions granted
              </Badge>
            )}
            {permissionSummary.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{permissionSummary.length - 3} more
              </Badge>
            )}
          </div>
        </div>

        {/* Assigned Members */}
        {assignedMembers.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Assigned Members</h4>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {assignedMembers.slice(0, 5).map((member) => (
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
              {assignedMembers.length > 5 && (
                <span className="text-xs text-muted-foreground">
                  +{assignedMembers.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface PermissionSetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  mode: 'create' | 'edit'
  permissionSet?: PermissionSet | null
  onSuccess: () => void
  getDefaultPermissions: () => PermissionConfig
  validatePermissions: (permissions: PermissionConfig) => string[]
  createPermissionSet: (data: { name: string; permissions: PermissionConfig }) => Promise<any>
  updatePermissionSet: (setId: string, data: { name?: string; permissions?: PermissionConfig }) => Promise<unknown>
}

function PermissionSetDialog({
  open,
  onOpenChange,
  organizationId,
  mode,
  permissionSet,
  onSuccess,
  getDefaultPermissions,
  validatePermissions,
  createPermissionSet,
  updatePermissionSet
}: PermissionSetDialogProps) {
  const [name, setName] = useState('')
  const [permissions, setPermissions] = useState<PermissionConfig>(getDefaultPermissions())
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form when dialog opens or permission set changes
  React.useEffect(() => {
    if (open) {
      if (mode === 'edit' && permissionSet) {
        setName(permissionSet.name)
        setPermissions(permissionSet.permissions)
      } else {
        setName('')
        setPermissions(getDefaultPermissions())
      }
      setValidationErrors([])
    }
  }, [open, mode, permissionSet, getDefaultPermissions])

  // Validate permissions whenever they change
  React.useEffect(() => {
    const errors = validatePermissions(permissions)
    setValidationErrors(errors)
  }, [permissions, validatePermissions])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      toast.error('Permission set name is required')
      return
    }

    if (validationErrors.length > 0) {
      toast.error('Please fix permission dependency errors')
      return
    }

    setIsSubmitting(true)
    try {
      if (mode === 'create') {
        await createPermissionSet({ name: name.trim(), permissions })
      } else if (permissionSet) {
        await updatePermissionSet(permissionSet.id, { name: name.trim(), permissions })
      }
      onSuccess()
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setIsSubmitting(false)
    }
  }, [name, permissions, validationErrors, mode, permissionSet, createPermissionSet, updatePermissionSet, onSuccess])

  const handlePermissionChange = useCallback((
    category: keyof PermissionConfig,
    permission: string,
    value: boolean
  ) => {
    setPermissions(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [permission]: value
      }
    }))
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create Permission Set' : 'Edit Permission Set'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Create a custom permission set with granular access controls.'
              : 'Update the permission set configuration.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter permission set name"
              disabled={isSubmitting}
            />
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Permission dependency errors:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index} className="text-sm">{error}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Permission Categories */}
          <div className="space-y-6">
            <PermissionCategory
              title="Team Members"
              icon={Users}
              description="Control access to team member information and management"
              permissions={[
                { key: 'viewAll', label: 'View all members', description: 'Can see all organization members' },
                { key: 'manageAll', label: 'Manage all members', description: 'Can add, edit, and remove members' }
              ]}
              values={permissions.teamMembers}
              onChange={(permission, value) => handlePermissionChange('teamMembers', permission, value)}
              disabled={isSubmitting}
            />

            <Separator />

            <PermissionCategory
              title="Projects"
              icon={FileText}
              description="Control access to project information and management"
              permissions={[
                { key: 'viewAll', label: 'View all projects', description: 'Can see all organization projects' },
                { key: 'manageAll', label: 'Manage all projects', description: 'Can create, edit, and delete any project' },
                { key: 'viewAssigned', label: 'View assigned projects', description: 'Can see projects they are assigned to' },
                { key: 'manageAssigned', label: 'Manage assigned projects', description: 'Can edit projects they are assigned to' }
              ]}
              values={permissions.projects}
              onChange={(permission, value) => handlePermissionChange('projects', permission, value)}
              disabled={isSubmitting}
            />

            <Separator />

            <PermissionCategory
              title="Invoicing"
              icon={DollarSign}
              description="Control access to invoicing and billing information"
              permissions={[
                { key: 'viewAll', label: 'View all invoicing', description: 'Can see all invoices and billing data' },
                { key: 'manageAll', label: 'Manage all invoicing', description: 'Can create and edit any invoice' },
                { key: 'viewAssigned', label: 'View assigned invoicing', description: 'Can see invoices for assigned projects' },
                { key: 'manageAssigned', label: 'Manage assigned invoicing', description: 'Can edit invoices for assigned projects' }
              ]}
              values={permissions.invoicing}
              onChange={(permission, value) => handlePermissionChange('invoicing', permission, value)}
              disabled={isSubmitting}
            />

            <Separator />

            <PermissionCategory
              title="Clients"
              icon={Building}
              description="Control access to client information and management"
              permissions={[
                { key: 'viewAll', label: 'View all clients', description: 'Can see all client information' },
                { key: 'manageAll', label: 'Manage all clients', description: 'Can create, edit, and delete any client' },
                { key: 'viewAssigned', label: 'View assigned clients', description: 'Can see clients for assigned projects' },
                { key: 'manageAssigned', label: 'Manage assigned clients', description: 'Can edit clients for assigned projects' }
              ]}
              values={permissions.clients}
              onChange={(permission, value) => handlePermissionChange('clients', permission, value)}
              disabled={isSubmitting}
            />

            <Separator />

            <PermissionCategory
              title="Worklogs"
              icon={Clock}
              description="Control access to time tracking and worklog management"
              permissions={[
                { key: 'manageAll', label: 'Manage all worklogs', description: 'Can view and edit all time entries' }
              ]}
              values={permissions.worklogs}
              onChange={(permission, value) => handlePermissionChange('worklogs', permission, value)}
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || validationErrors.length > 0}>
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Permission Set' : 'Update Permission Set'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface PermissionCategoryProps {
  title: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  permissions: Array<{
    key: string
    label: string
    description: string
  }>
  values: Record<string, boolean>
  onChange: (permission: string, value: boolean) => void
  disabled?: boolean
}

function PermissionCategory({
  title,
  icon: Icon,
  description,
  permissions,
  values,
  onChange,
  disabled
}: PermissionCategoryProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-muted rounded-lg">
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <h4 className="font-medium">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      
      <div className="space-y-3 ml-11">
        {permissions.map((permission) => (
          <div key={permission.key} className="flex items-start space-x-3">
            <Checkbox
              id={`${title}-${permission.key}`}
              checked={values[permission.key] || false}
              onCheckedChange={(checked) => onChange(permission.key, checked === true)}
              disabled={disabled}
              className="mt-1"
            />
            <div className="flex-1 space-y-1">
              <Label 
                htmlFor={`${title}-${permission.key}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {permission.label}
              </Label>
              <p className="text-xs text-muted-foreground">
                {permission.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface PermissionSetDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  permissionSet: PermissionSet | null
  permissionSets: PermissionSet[]
  members?: import('@/hooks/useTeamMembers').OrganizationMember[]
  onSuccess: () => void
  deletePermissionSet: (setId: string, reassignToSetId?: string) => Promise<void>
}

function PermissionSetDeleteDialog({
  open,
  onOpenChange,
  permissionSet,
  permissionSets,
  members,
  onSuccess,
  deletePermissionSet
}: PermissionSetDeleteDialogProps) {
  const [reassignToSetId, setReassignToSetId] = useState<string>('')
  const [isDeleting, setIsDeleting] = useState(false)

  const assignedMembers = useMemo(() => {
    if (!members || !permissionSet) return []
    return members.filter(member => member.permissionSetId === permissionSet.id)
  }, [members, permissionSet])

  const availablePermissionSets = useMemo(() => {
    if (!permissionSets || !permissionSet) return []
    return permissionSets.filter(set => set.id !== permissionSet.id)
  }, [permissionSets, permissionSet])

  const handleDelete = useCallback(async () => {
    if (!permissionSet) return

    if (assignedMembers.length > 0 && !reassignToSetId) {
      toast.error('Please select a permission set to reassign members to')
      return
    }

    setIsDeleting(true)
    try {
      await deletePermissionSet(permissionSet.id, reassignToSetId || undefined)
      onSuccess()
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setIsDeleting(false)
    }
  }, [permissionSet, assignedMembers, reassignToSetId, deletePermissionSet, onSuccess])

  React.useEffect(() => {
    if (open) {
      setReassignToSetId('')
    }
  }, [open])

  if (!permissionSet) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Delete Permission Set
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the "{permissionSet.name}" permission set? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {assignedMembers.length > 0 && (
            <Alert>
              <Users className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-3">
                  <p>
                    This permission set is currently assigned to {assignedMembers.length} member{assignedMembers.length !== 1 ? 's' : ''}. 
                    You must reassign them to another permission set before deletion.
                  </p>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reassign-select">Reassign members to:</Label>
                    <Select value={reassignToSetId} onValueChange={setReassignToSetId}>
                      <SelectTrigger id="reassign-select">
                        <SelectValue placeholder="Select a permission set" />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePermissionSets.map((set) => (
                          <SelectItem key={set.id} value={set.id}>
                            {set.name}
                            {set.isDefault && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                Default
                              </Badge>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Affected members:</p>
                    <div className="space-y-1">
                      {assignedMembers.slice(0, 5).map((member) => (
                        <div key={member.id} className="flex items-center gap-2 text-sm">
                          <EnhancedAvatar
                            src={member.user.avatarUrl}
                            fallbackSeed={member.user.email}
                            fallbackSeeds={[member.user.fullName || '']}
                            size="sm"
                            className="w-5 h-5"
                            alt={member.user.fullName || member.user.email}
                          />
                          <span>{member.user.fullName || member.user.email}</span>
                        </div>
                      ))}
                      {assignedMembers.length > 5 && (
                        <p className="text-xs text-muted-foreground">
                          +{assignedMembers.length - 5} more members
                        </p>
                      )}
                    </div>
                  </div>
                </div>
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
            disabled={isDeleting || (assignedMembers.length > 0 && !reassignToSetId)}
          >
            {isDeleting ? 'Deleting...' : 'Delete Permission Set'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}