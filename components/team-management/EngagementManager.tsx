'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Calendar, 
  Clock, 
  User, 
  Briefcase,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Save,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { useEngagements, ProjectEngagement, EngagementCreateData, EngagementUpdateData } from '@/hooks/useEngagements'
import { useProjects } from '@/hooks/useProjects'
import { useCustomRoles } from '@/hooks/useCustomRoles'
import { OrganizationMember } from '@/hooks/useTeamMembers'
import { formatHours, formatUtilization, getEngagementStatus, getEngagementStatusColor } from '@/lib/engagement-utils'

interface EngagementManagerProps {
  member: OrganizationMember
  organizationId: string
  canEdit: boolean
}

interface EngagementFormData {
  projectId: string
  role: string
  hoursPerWeek: number
  startDate: string
  endDate: string
}

const INITIAL_FORM_DATA: EngagementFormData = {
  projectId: '',
  role: '',
  hoursPerWeek: 0,
  startDate: '',
  endDate: ''
}

export function EngagementManager({ member, organizationId, canEdit }: EngagementManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingEngagement, setEditingEngagement] = useState<ProjectEngagement | null>(null)
  const [formData, setFormData] = useState<EngagementFormData>(INITIAL_FORM_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Hooks
  const {
    engagements,
    isLoading: engagementsLoading,
    createEngagement,
    updateEngagement,
    deleteEngagement,
    calculateTotalHours,
    calculateAvailability,
    getActiveEngagements,
    getPastEngagements,
    validateEngagement,
    isOverallocated
  } = useEngagements(organizationId, member.id)

  const {
    projects,
    isLoading: projectsLoading
  } = useProjects(organizationId)

  const {
    roles,
    isLoading: rolesLoading
  } = useCustomRoles(organizationId)

  // Memoized calculations
  const activeEngagements = useMemo(() => 
    getActiveEngagements(engagements), 
    [engagements, getActiveEngagements]
  )

  const pastEngagements = useMemo(() => 
    getPastEngagements(engagements), 
    [engagements, getPastEngagements]
  )

  const totalHours = useMemo(() => 
    calculateTotalHours(engagements), 
    [engagements, calculateTotalHours]
  )

  const availableHours = useMemo(() => 
    calculateAvailability(member.workingHoursPerWeek, engagements), 
    [member.workingHoursPerWeek, engagements, calculateAvailability]
  )

  const utilizationPercentage = useMemo(() => {
    if (member.workingHoursPerWeek === 0) return 0
    return (totalHours / member.workingHoursPerWeek) * 100
  }, [totalHours, member.workingHoursPerWeek])

  const isOverallocatedMember = useMemo(() => 
    isOverallocated(member.workingHoursPerWeek, engagements), 
    [member.workingHoursPerWeek, engagements, isOverallocated]
  )

  // Form handlers
  const handleFormChange = useCallback((field: keyof EngagementFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }))
    }
  }, [formErrors])

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.projectId) {
      errors.projectId = 'Project is required'
    }

    if (formData.hoursPerWeek <= 0) {
      errors.hoursPerWeek = 'Hours per week must be greater than 0'
    }

    if (formData.hoursPerWeek > member.workingHoursPerWeek) {
      errors.hoursPerWeek = 'Hours per week cannot exceed total working hours'
    }

    if (!formData.startDate) {
      errors.startDate = 'Start date is required'
    }

    if (formData.endDate && formData.startDate && new Date(formData.endDate) <= new Date(formData.startDate)) {
      errors.endDate = 'End date must be after start date'
    }

    // Validate using engagement utility
    const engagementData: EngagementCreateData | EngagementUpdateData = {
      projectId: formData.projectId,
      role: formData.role || null,
      hoursPerWeek: formData.hoursPerWeek,
      startDate: formData.startDate,
      endDate: formData.endDate || null
    }

    const validationErrors = validateEngagement(
      engagementData,
      member.workingHoursPerWeek,
      engagements,
      editingEngagement?.id
    )

    validationErrors.forEach(error => {
      if (error.includes('Hours per week')) {
        errors.hoursPerWeek = error
      } else if (error.includes('date')) {
        errors.endDate = error
      }
    })

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }, [formData, member.workingHoursPerWeek, validateEngagement, engagements, editingEngagement])

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA)
    setFormErrors({})
    setEditingEngagement(null)
  }, [])

  const handleCreate = useCallback(async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const engagementData: EngagementCreateData = {
        projectId: formData.projectId,
        role: formData.role || null,
        hoursPerWeek: formData.hoursPerWeek,
        startDate: formData.startDate,
        endDate: formData.endDate || null
      }

      await createEngagement(engagementData)
      setIsCreateDialogOpen(false)
      resetForm()
    } catch (error) {
      // Error is handled by the hook
    } finally {
      setIsSubmitting(false)
    }
  }, [validateForm, formData, createEngagement, resetForm])

  const handleEdit = useCallback((engagement: ProjectEngagement) => {
    setEditingEngagement(engagement)
    setFormData({
      projectId: engagement.projectId,
      role: engagement.role || '',
      hoursPerWeek: engagement.hoursPerWeek,
      startDate: engagement.startDate,
      endDate: engagement.endDate || ''
    })
    setIsCreateDialogOpen(true)
  }, [])

  const handleUpdate = useCallback(async () => {
    if (!editingEngagement || !validateForm()) return

    setIsSubmitting(true)
    try {
      const engagementData: EngagementUpdateData = {
        role: formData.role || null,
        hoursPerWeek: formData.hoursPerWeek,
        startDate: formData.startDate,
        endDate: formData.endDate || null
      }

      await updateEngagement(editingEngagement.id, engagementData)
      setIsCreateDialogOpen(false)
      resetForm()
    } catch (error) {
      // Error is handled by the hook
    } finally {
      setIsSubmitting(false)
    }
  }, [editingEngagement, validateForm, formData, updateEngagement, resetForm])

  const handleDelete = useCallback(async (engagementId: string) => {
    try {
      await deleteEngagement(engagementId)
    } catch (error) {
      // Error is handled by the hook
    }
  }, [deleteEngagement])

  const handleDialogClose = useCallback(() => {
    setIsCreateDialogOpen(false)
    resetForm()
  }, [resetForm])

  // Render engagement status badge
  const renderStatusBadge = useCallback((engagement: ProjectEngagement) => {
    const status = getEngagementStatus(
      new Date(engagement.startDate),
      engagement.endDate ? new Date(engagement.endDate) : null,
      engagement.isActive
    )
    const color = getEngagementStatusColor(status)

    return (
      <Badge 
        variant="outline" 
        className="capitalize"
        style={{ borderColor: color, color }}
      >
        {status}
      </Badge>
    )
  }, [])

  // Render engagement card
  const renderEngagementCard = useCallback((engagement: ProjectEngagement) => (
    <Card key={engagement.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-medium truncate">{engagement.project.name}</h4>
              {renderStatusBadge(engagement)}
            </div>
            
            {engagement.role && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                {(() => {
                  const customRole = roles?.find(role => role.name === engagement.role)
                  return customRole ? (
                    <>
                      <div 
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: customRole.color }}
                      />
                      <span>{engagement.role}</span>
                    </>
                  ) : (
                    <>
                      <User className="w-3 h-3" />
                      <span>{engagement.role}</span>
                    </>
                  )
                })()}
              </div>
            )}
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{formatHours(engagement.hoursPerWeek)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>
                  {format(new Date(engagement.startDate), 'MMM dd, yyyy')} - 
                  {engagement.endDate 
                    ? format(new Date(engagement.endDate), 'MMM dd, yyyy')
                    : 'Ongoing'
                  }
                </span>
              </div>
            </div>
          </div>
          
          {canEdit && (
            <div className="flex items-center gap-1 ml-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(engagement)}
                className="h-8 w-8 p-0"
              >
                <Edit className="w-3 h-3" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Engagement</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this engagement with {engagement.project.name}? 
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(engagement.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  ), [renderStatusBadge, canEdit, roles, handleEdit, handleDelete])

  if (engagementsLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-muted rounded animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Engagement Summary
            </CardTitle>
            {canEdit && (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Engagement
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingEngagement ? 'Edit Engagement' : 'Add New Engagement'}
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="project">Project *</Label>
                      <Select
                        value={formData.projectId}
                        onValueChange={(value) => handleFormChange('projectId', value)}
                        disabled={projectsLoading}
                      >
                        <SelectTrigger className={formErrors.projectId ? 'border-destructive' : ''}>
                          <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects?.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.projectId && (
                        <p className="text-sm text-destructive">{formErrors.projectId}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(value) => handleFormChange('role', value)}
                        disabled={rolesLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles?.map((role) => (
                            <SelectItem key={role.id} value={role.name}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded"
                                  style={{ backgroundColor: role.color }}
                                />
                                {role.name}
                              </div>
                            </SelectItem>
                          ))}
                          <SelectItem value="">
                            <span className="text-muted-foreground">No role</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hours">Hours per Week *</Label>
                      <Input
                        id="hours"
                        type="number"
                        min="0.5"
                        max={member.workingHoursPerWeek}
                        step="0.5"
                        value={formData.hoursPerWeek || ''}
                        onChange={(e) => handleFormChange('hoursPerWeek', parseFloat(e.target.value) || 0)}
                        placeholder="e.g., 20"
                        className={formErrors.hoursPerWeek ? 'border-destructive' : ''}
                      />
                      {formErrors.hoursPerWeek && (
                        <p className="text-sm text-destructive">{formErrors.hoursPerWeek}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Available: {availableHours}h of {member.workingHoursPerWeek}h per week
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startDate">Start Date *</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => handleFormChange('startDate', e.target.value)}
                          className={formErrors.startDate ? 'border-destructive' : ''}
                        />
                        {formErrors.startDate && (
                          <p className="text-sm text-destructive">{formErrors.startDate}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="endDate">End Date</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={formData.endDate}
                          onChange={(e) => handleFormChange('endDate', e.target.value)}
                          className={formErrors.endDate ? 'border-destructive' : ''}
                        />
                        {formErrors.endDate && (
                          <p className="text-sm text-destructive">{formErrors.endDate}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Leave empty for ongoing engagement
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={handleDialogClose}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={editingEngagement ? handleUpdate : handleCreate}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      {editingEngagement ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{totalHours}h</div>
              <div className="text-sm text-muted-foreground">Total Hours</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${availableHours < 0 ? 'text-destructive' : ''}`}>
                {availableHours}h
              </div>
              <div className="text-sm text-muted-foreground">Available</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${utilizationPercentage > 100 ? 'text-destructive' : ''}`}>
                {formatUtilization(utilizationPercentage)}
              </div>
              <div className="text-sm text-muted-foreground">Utilization</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{activeEngagements.length}</div>
              <div className="text-sm text-muted-foreground">Active</div>
            </div>
          </div>
          
          {isOverallocatedMember && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Member is overallocated by {totalHours - member.workingHoursPerWeek} hours per week
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Engagements */}
      {activeEngagements.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-medium">Active Engagements ({activeEngagements.length})</h3>
          </div>
          <div className="space-y-3">
            {activeEngagements.map(renderEngagementCard)}
          </div>
        </div>
      )}

      {/* Past Engagements */}
      {pastEngagements.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-muted-foreground" />
            <h3 className="text-lg font-medium">Past Engagements ({pastEngagements.length})</h3>
          </div>
          <div className="space-y-3">
            {pastEngagements.map(renderEngagementCard)}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!engagements || engagements.length === 0) && (
        <div className="text-center py-12">
          <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Engagements</h3>
          <p className="text-muted-foreground mb-4">
            This member has no project engagements yet.
          </p>
          {canEdit && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Engagement
                </Button>
              </DialogTrigger>
              {/* Dialog content is the same as above */}
            </Dialog>
          )}
        </div>
      )}
    </div>
  )
}