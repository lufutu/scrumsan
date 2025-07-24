'use client'

import React, { useState, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { 
  Calendar,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Loader2,
  Clock,
  User,
  AlertCircle
} from 'lucide-react'
import { EnhancedAvatar } from '@/components/ui/enhanced-avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { OrganizationMember } from '@/hooks/useTeamMembers'
import { useTimeline, TimelineEventCreateData, TimelineEventUpdateData } from '@/hooks/useTimeline'

interface TimelineManagerProps {
  member: OrganizationMember
  organizationId: string
  canEdit: boolean
}

interface TimelineEventFormData {
  eventName: string
  eventDate: string
  description: string
}

const initialFormData: TimelineEventFormData = {
  eventName: '',
  eventDate: '',
  description: '',
}

export function TimelineManager({ member, organizationId, canEdit }: TimelineManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [formData, setFormData] = useState<TimelineEventFormData>(initialFormData)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Timeline hook
  const {
    timelineEvents,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    error,
    addTimelineEvent,
    editTimelineEvent,
    removeTimelineEvent,
  } = useTimeline(organizationId, member.id)

  // Form validation
  const validateForm = useCallback((data: TimelineEventFormData): Record<string, string> => {
    const errors: Record<string, string> = {}

    if (!data.eventName.trim()) {
      errors.eventName = 'Event name is required'
    } else if (data.eventName.length > 255) {
      errors.eventName = 'Event name must be less than 255 characters'
    }

    if (!data.eventDate) {
      errors.eventDate = 'Event date is required'
    } else {
      const eventDate = new Date(data.eventDate)
      if (isNaN(eventDate.getTime())) {
        errors.eventDate = 'Invalid date format'
      }
    }

    if (data.description && data.description.length > 1000) {
      errors.description = 'Description must be less than 1000 characters'
    }

    return errors
  }, [])

  // Handle form field changes
  const handleFieldChange = useCallback((field: keyof TimelineEventFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }))
    }
  }, [formErrors])

  // Handle create event
  const handleCreateEvent = useCallback(async () => {
    const errors = validateForm(formData)
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    try {
      const createData: TimelineEventCreateData = {
        eventName: formData.eventName.trim(),
        eventDate: new Date(formData.eventDate).toISOString(),
        description: formData.description.trim() || undefined,
      }

      await addTimelineEvent(createData)
      setFormData(initialFormData)
      setFormErrors({})
      setIsCreateDialogOpen(false)
      toast.success('Timeline event created successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create timeline event')
    }
  }, [formData, validateForm, addTimelineEvent])

  // Handle edit event
  const handleEditEvent = useCallback(async (eventId: string) => {
    const errors = validateForm(formData)
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    try {
      const updateData: TimelineEventUpdateData = {
        eventName: formData.eventName.trim(),
        eventDate: new Date(formData.eventDate).toISOString(),
        description: formData.description.trim() || undefined,
      }

      await editTimelineEvent(eventId, updateData)
      setEditingEventId(null)
      setFormData(initialFormData)
      setFormErrors({})
      toast.success('Timeline event updated successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update timeline event')
    }
  }, [formData, validateForm, editTimelineEvent])

  // Handle delete event
  const handleDeleteEvent = useCallback(async (eventId: string) => {
    try {
      await removeTimelineEvent(eventId)
      toast.success('Timeline event deleted successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete timeline event')
    }
  }, [removeTimelineEvent])

  // Start editing an event
  const startEditing = useCallback((eventId: string) => {
    const event = timelineEvents.find(e => e.id === eventId)
    if (event) {
      setFormData({
        eventName: event.eventName,
        eventDate: format(parseISO(event.eventDate), 'yyyy-MM-dd'),
        description: event.description || '',
      })
      setEditingEventId(eventId)
      setFormErrors({})
    }
  }, [timelineEvents])

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setEditingEventId(null)
    setFormData(initialFormData)
    setFormErrors({})
  }, [])

  // Reset create form
  const resetCreateForm = useCallback(() => {
    setFormData(initialFormData)
    setFormErrors({})
    setIsCreateDialogOpen(false)
  }, [])

  // Render form fields
  const renderFormFields = useCallback(() => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="eventName">Event Name *</Label>
        <Input
          id="eventName"
          value={formData.eventName}
          onChange={(e) => handleFieldChange('eventName', e.target.value)}
          placeholder="Enter event name"
          className={formErrors.eventName ? 'border-destructive' : ''}
        />
        {formErrors.eventName && (
          <p className="text-sm text-destructive">{formErrors.eventName}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="eventDate">Event Date *</Label>
        <Input
          id="eventDate"
          type="date"
          value={formData.eventDate}
          onChange={(e) => handleFieldChange('eventDate', e.target.value)}
          className={formErrors.eventDate ? 'border-destructive' : ''}
        />
        {formErrors.eventDate && (
          <p className="text-sm text-destructive">{formErrors.eventDate}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleFieldChange('description', e.target.value)}
          placeholder="Enter event description (optional)"
          rows={3}
          className={formErrors.description ? 'border-destructive' : ''}
        />
        {formErrors.description && (
          <p className="text-sm text-destructive">{formErrors.description}</p>
        )}
      </div>
    </div>
  ), [formData, formErrors, handleFieldChange])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Timeline Events</h3>
        </div>
        <Separator />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Timeline Events</h3>
        </div>
        <Separator />
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>Failed to load timeline events</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          <h3 className="text-lg font-medium">Timeline Events</h3>
        </div>
        {canEdit && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Timeline Event</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {renderFormFields()}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={resetCreateForm}
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateEvent}
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Create Event
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Separator />

      {timelineEvents.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No timeline events found</p>
          {canEdit && (
            <p className="text-sm mt-2">Add the first timeline event to get started</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {timelineEvents
            .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
            .map((event) => (
              <div key={event.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                {editingEventId === event.id ? (
                  <div className="space-y-4">
                    {renderFormFields()}
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelEditing}
                        disabled={isUpdating}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleEditEvent(event.id)}
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Save Changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-base">{event.eventName}</h4>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{format(parseISO(event.eventDate), 'MMM dd, yyyy')}</span>
                          </div>
                        </div>
                        
                        {event.description && (
                          <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">
                            {event.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>Created by</span>
                          </div>
                          <EnhancedAvatar
                            src={event.creator.avatarUrl}
                            fallbackSeed={event.creator.email}
                            fallbackSeeds={[event.creator.fullName || '']}
                            size="sm"
                            className="w-4 h-4"
                            alt={event.creator.fullName || event.creator.email}
                          />
                          <span>{event.creator.fullName || event.creator.email}</span>
                          <span>•</span>
                          <span>{format(parseISO(event.createdAt), 'MMM dd, yyyy')}</span>
                        </div>
                      </div>
                      
                      {canEdit && (
                        <div className="flex items-center gap-1 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditing(event.id)}
                            disabled={isUpdating || isDeleting}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isUpdating || isDeleting}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Timeline Event</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{event.eventName}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteEvent(event.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {isDeleting ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  ) : (
                                    <Trash2 className="w-4 h-4 mr-2" />
                                  )}
                                  Delete Event
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}