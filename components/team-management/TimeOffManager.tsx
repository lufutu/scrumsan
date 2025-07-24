'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns'
import { 
  Calendar as CalendarIcon,
  Plus,
  Edit,
  Trash2,
  Filter,
  List,
  Grid,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { 
  useTimeOff, 
  TimeOffEntry, 
  TimeOffCreateData, 
  TimeOffUpdateData,
  TIME_OFF_TYPES,
  TIME_OFF_STATUSES 
} from '@/hooks/useTimeOff'
import { OrganizationMember } from '@/hooks/useTeamMembers'

interface TimeOffManagerProps {
  member: OrganizationMember
  organizationId: string
  canEdit: boolean
}

type ViewMode = 'list' | 'calendar'

interface TimeOffFormData {
  type: TimeOffEntry['type']
  startDate: Date | undefined
  endDate: Date | undefined
  description: string
}

const DEFAULT_FORM_DATA: TimeOffFormData = {
  type: 'vacation',
  startDate: undefined,
  endDate: undefined,
  description: ''
}

export function TimeOffManager({ member, organizationId, canEdit }: TimeOffManagerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimeOffEntry | null>(null)
  const [formData, setFormData] = useState<TimeOffFormData>(DEFAULT_FORM_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | TimeOffEntry['status']>('all')
  const [filterType, setFilterType] = useState<'all' | TimeOffEntry['type']>('all')

  const {
    timeOffEntries,
    isLoading,
    createTimeOff,
    updateTimeOff,
    deleteTimeOff,
    calculateTotalDays,
    calculateVacationDaysUsed,
    validateTimeOff,
    isOnTimeOff
  } = useTimeOff(organizationId, member.id)

  // Filter entries based on current filters
  const filteredEntries = useMemo(() => {
    if (!timeOffEntries) return []
    
    return timeOffEntries.filter(entry => {
      const statusMatch = filterStatus === 'all' || entry.status === filterStatus
      const typeMatch = filterType === 'all' || entry.type === filterType
      return statusMatch && typeMatch
    })
  }, [timeOffEntries, filterStatus, filterType])

  // Calculate statistics
  const statistics = useMemo(() => {
    if (!timeOffEntries) return { totalDays: 0, vacationDaysUsed: 0, pendingDays: 0 }
    
    const currentYear = new Date().getFullYear()
    return {
      totalDays: calculateTotalDays(timeOffEntries, undefined, 'approved'),
      vacationDaysUsed: calculateVacationDaysUsed(currentYear, timeOffEntries),
      pendingDays: calculateTotalDays(timeOffEntries, undefined, 'pending')
    }
  }, [timeOffEntries, calculateTotalDays, calculateVacationDaysUsed])

  // Handle form field changes
  const handleFormChange = useCallback((field: keyof TimeOffFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  // Reset form
  const resetForm = useCallback(() => {
    setFormData(DEFAULT_FORM_DATA)
    setEditingEntry(null)
  }, [])

  // Open create dialog
  const handleCreateClick = useCallback(() => {
    resetForm()
    setIsCreateDialogOpen(true)
  }, [resetForm])

  // Open edit dialog
  const handleEditClick = useCallback((entry: TimeOffEntry) => {
    setEditingEntry(entry)
    setFormData({
      type: entry.type,
      startDate: new Date(entry.startDate),
      endDate: new Date(entry.endDate),
      description: entry.description || ''
    })
    setIsEditDialogOpen(true)
  }, [])

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!formData.startDate || !formData.endDate) {
      toast.error('Please select both start and end dates')
      return
    }

    const submitData: TimeOffCreateData | TimeOffUpdateData = {
      type: formData.type,
      startDate: formData.startDate.toISOString().split('T')[0],
      endDate: formData.endDate.toISOString().split('T')[0],
      description: formData.description || null
    }

    // Validate the data
    const errors = validateTimeOff(
      submitData,
      timeOffEntries,
      editingEntry?.id
    )

    if (errors.length > 0) {
      errors.forEach(error => toast.error(error))
      return
    }

    setIsSubmitting(true)
    try {
      if (editingEntry) {
        await updateTimeOff(editingEntry.id, submitData)
        setIsEditDialogOpen(false)
      } else {
        await createTimeOff(submitData as TimeOffCreateData)
        setIsCreateDialogOpen(false)
      }
      resetForm()
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, editingEntry, validateTimeOff, timeOffEntries, updateTimeOff, createTimeOff, resetForm])

  // Handle delete
  const handleDelete = useCallback(async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this time-off entry?')) {
      return
    }

    try {
      await deleteTimeOff(entryId)
    } catch (error) {
      // Error handling is done in the hook
    }
  }, [deleteTimeOff])

  // Get calendar days for current month
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  // Get time-off entries for a specific date
  const getEntriesForDate = useCallback((date: Date): TimeOffEntry[] => {
    if (!timeOffEntries) return []
    
    return timeOffEntries.filter(entry => {
      const entryStart = new Date(entry.startDate)
      const entryEnd = new Date(entry.endDate)
      return date >= entryStart && date <= entryEnd
    })
  }, [timeOffEntries])

  // Get status icon
  const getStatusIcon = useCallback((status: TimeOffEntry['status']) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }, [])

  // Get status badge variant
  const getStatusBadgeVariant = useCallback((status: TimeOffEntry['status']) => {
    switch (status) {
      case 'approved':
        return 'default'
      case 'rejected':
        return 'destructive'
      case 'pending':
        return 'secondary'
      default:
        return 'outline'
    }
  }, [])

  // Render time-off entry card
  const renderTimeOffCard = useCallback((entry: TimeOffEntry) => {
    const days = calculateTotalDays([entry])
    
    return (
      <div key={entry.id} className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(entry.status)}
            <h4 className="font-medium capitalize">
              {TIME_OFF_TYPES[entry.type]}
            </h4>
            <Badge variant={getStatusBadgeVariant(entry.status)}>
              {TIME_OFF_STATUSES[entry.status]}
            </Badge>
          </div>
          
          {canEdit && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditClick(entry)}
                className="h-8 w-8 p-0"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(entry.id)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              {format(new Date(entry.startDate), 'MMM dd, yyyy')} - 
              {format(new Date(entry.endDate), 'MMM dd, yyyy')}
            </span>
            <span>
              {days} day{days !== 1 ? 's' : ''}
            </span>
          </div>
          
          {entry.description && (
            <p className="text-sm text-muted-foreground">
              {entry.description}
            </p>
          )}
          
          {entry.approver && (
            <p className="text-xs text-muted-foreground">
              {entry.status === 'approved' ? 'Approved' : 'Reviewed'} by {entry.approver.fullName || entry.approver.email}
            </p>
          )}
        </div>
      </div>
    )
  }, [calculateTotalDays, getStatusIcon, getStatusBadgeVariant, canEdit, handleEditClick, handleDelete])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Time Off Activities</h3>
        </div>
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Time Off Activities</h3>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-r-none"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              className="rounded-l-none"
            >
              <Grid className="w-4 h-4" />
            </Button>
          </div>
          
          {canEdit && (
            <Button onClick={handleCreateClick}>
              <Plus className="w-4 h-4 mr-2" />
              Add Time Off
            </Button>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 border rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {statistics.vacationDaysUsed}
          </div>
          <div className="text-sm text-muted-foreground">
            Vacation Days Used
          </div>
        </div>
        <div className="text-center p-4 border rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {statistics.totalDays}
          </div>
          <div className="text-sm text-muted-foreground">
            Total Days Off
          </div>
        </div>
        <div className="text-center p-4 border rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">
            {statistics.pendingDays}
          </div>
          <div className="text-sm text-muted-foreground">
            Pending Days
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <Label className="text-sm">Filters:</Label>
        </div>
        
        <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(TIME_OFF_TYPES).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Content */}
      {viewMode === 'list' ? (
        /* List View */
        <div className="space-y-4">
          {filteredEntries.length > 0 ? (
            filteredEntries.map(renderTimeOffCard)
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {timeOffEntries?.length === 0 
                ? 'No time-off entries found'
                : 'No entries match the current filters'
              }
            </div>
          )}
        </div>
      ) : (
        /* Calendar View */
        <div className="space-y-4">
          {/* Calendar Header */}
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-medium">
              {format(currentMonth, 'MMMM yyyy')}
            </h4>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(prev => addDays(startOfMonth(prev), -1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(prev => addDays(endOfMonth(prev), 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {calendarDays.map(day => {
              const dayEntries = getEntriesForDate(day)
              const hasTimeOff = dayEntries.length > 0
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isDayToday = isToday(day)
              
              return (
                <div
                  key={day.toISOString()}
                  className={`
                    min-h-[80px] p-1 border rounded-md relative
                    ${isCurrentMonth ? 'bg-background' : 'bg-muted/50'}
                    ${isDayToday ? 'ring-2 ring-primary' : ''}
                    ${hasTimeOff ? 'bg-blue-50 dark:bg-blue-950/20' : ''}
                  `}
                >
                  <div className={`
                    text-sm font-medium
                    ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}
                    ${isDayToday ? 'text-primary font-bold' : ''}
                  `}>
                    {format(day, 'd')}
                  </div>
                  
                  {dayEntries.map((entry, index) => (
                    <div
                      key={entry.id}
                      className={`
                        text-xs px-1 py-0.5 rounded mt-1 truncate
                        ${entry.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : ''}
                        ${entry.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' : ''}
                        ${entry.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : ''}
                      `}
                      title={`${TIME_OFF_TYPES[entry.type]} - ${TIME_OFF_STATUSES[entry.status]}`}
                    >
                      {TIME_OFF_TYPES[entry.type]}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Time Off</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: TimeOffEntry['type']) => handleFormChange('type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIME_OFF_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.startDate ? format(formData.startDate, 'MMM dd, yyyy') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.startDate}
                      onSelect={(date) => handleFormChange('startDate', date)}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.endDate ? format(formData.endDate, 'MMM dd, yyyy') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.endDate}
                      onSelect={(date) => handleFormChange('endDate', date)}
                      disabled={(date) => date < (formData.startDate || new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                placeholder="Add any additional details..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Time Off'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Time Off</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: TimeOffEntry['type']) => handleFormChange('type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIME_OFF_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.startDate ? format(formData.startDate, 'MMM dd, yyyy') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.startDate}
                      onSelect={(date) => handleFormChange('startDate', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.endDate ? format(formData.endDate, 'MMM dd, yyyy') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.endDate}
                      onSelect={(date) => handleFormChange('endDate', date)}
                      disabled={(date) => date < (formData.startDate || new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                placeholder="Add any additional details..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Time Off'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}